import { eq, sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { countries, jerseys, kits, leagues, stores, teams, wishlistItems } from '../db/schema';
import {
	checkCut,
	checkKitType,
	checkWishVersion,
	cleanOrNull,
	compare,
	countryFields,
	formatSeason,
	giftFields,
	isCents,
	oneOf,
	parseSeason,
	purchaseDates,
	required
} from './checks';
import { kitLabel } from '../../labels';
import type {
	Country,
	ImportCountryRow,
	ImportKitRow,
	ImportRows,
	ImportRowsResult,
	ImportTeam,
	KitType,
	TeamView
} from './types';

/** The Catalog reads the import starts from. */
export interface ImportReads {
	readCountries: () => Promise<Country[]>;
	readTeams: () => Promise<TeamView[]>;
}

type BatchStatements = Parameters<DrizzleD1Database['batch']>[0];

/** Checks every row, writing nothing. Returns what the one write batch needs. */
async function checkImport(db: DrizzleD1Database, rows: ImportRows, reads: ImportReads) {
	if (![rows?.countries, rows?.jerseys, rows?.wishlist].every(Array.isArray))
		throw new Error('The rows need countries, jerseys and wishlist lists');
	const named = <T extends { name: string }>(list: T[], name: string) =>
		list.find((item) => compare(item.name, name) === 0);
	const row = <T>(list: string, index: number, check: () => T): T => {
		try {
			return check();
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new Error(`${list}[${index}]: ${message}`, { cause: error });
		}
	};

	const countryList: (ImportCountryRow & { created: boolean })[] = (
		await reads.readCountries()
	).map((c) => ({
		...c,
		league: c.league.name,
		seasonFormat: c.league.seasonFormat,
		created: false
	}));
	rows.countries.forEach((input, i) =>
		row('countries', i, () => {
			const name = required(String(input?.name ?? ''), 'Country name');
			const fields = countryFields({ ...input, leagueName: input.league });
			const found = named(countryList, name);
			if (found?.created) throw new Error(`${name} is twice in the countries`);
			if (!found)
				countryList.push({
					name,
					continent: fields.continent,
					league: fields.leagueName,
					seasonFormat: fields.seasonFormat,
					created: true
				});
		})
	);

	const storeList = (await db.select().from(stores)).map((s) => ({
		name: s.name,
		created: false
	}));
	const teamList = (await reads.readTeams()).map((t) => ({
		name: t.name,
		kind: t.kind,
		country: t.country.name,
		seasonFormat: t.seasonFormat,
		created: false
	}));
	const kitList = (
		await db
			.select({ team: teams.name, start: kits.seasonStartYear, kitType: kits.kitType })
			.from(kits)
			.innerJoin(teams, eq(kits.teamId, teams.id))
	).map((k) => ({ ...k, end: null as number | null, created: false }));

	function teamOf(input: ImportTeam) {
		const name = required(String(input?.name ?? ''), 'Team name');
		const kind = oneOf(input.kind, ['club', 'national'], 'A team is a Club or a National Team');
		const country = named(countryList, String(input.country ?? ''));
		if (!country) throw new Error(`Unknown country: ${input.country}`);
		const found = named(teamList, name);
		if (found) {
			if (found.kind !== kind || found.country !== country.name)
				throw new Error(`${found.name} is a ${found.kind} of ${found.country}`);
			return found;
		}
		const national = teamList.find((t) => t.kind === 'national' && t.country === country.name);
		if (kind === 'national' && national)
			throw new Error(`${country.name} already has a National Team: ${national.name}`);
		const team = {
			name,
			kind,
			country: country.name,
			seasonFormat: kind === 'national' ? ('calendar' as const) : country.seasonFormat,
			created: true
		};
		teamList.push(team);
		return team;
	}

	function kitOf(input: ImportKitRow) {
		const team = teamOf(input.team);
		const season = parseSeason(input.season, team.seasonFormat);
		const kitType = checkKitType(input.kitType);
		const found = kitList.find(
			(k) => k.team === team.name && k.start === season.start && k.kitType === kitType
		);
		if (found) return found;
		const kit = { team: team.name, start: season.start, end: season.end, kitType, created: true };
		kitList.push(kit);
		return kit;
	}

	const jerseyRows = rows.jerseys.map((input, i) =>
		row('jerseys', i, () => {
			const kit = kitOf(input);
			const cut = checkCut(input);
			const acquisition = input.acquisition;
			if (acquisition?.kind === 'gift')
				return { kit, store: null, ...cut, ...giftFields(acquisition) };
			if (acquisition?.kind !== 'purchase')
				throw new Error('Acquisition must be a Purchase or a Gift');
			if (acquisition.priceCents !== null && !isCents(acquisition.priceCents))
				throw new Error('A price is euro cents, or null when unknown');
			const storeName = cleanOrNull(acquisition.store);
			// No Store is an unknown Store, which only a Purchase of unknown price has.
			if (storeName === null && acquisition.priceCents !== null)
				throw new Error('A Purchase with a price needs a Store');
			let store = storeName === null ? null : named(storeList, storeName);
			if (storeName !== null && !store)
				storeList.push((store = { name: storeName, created: true }));
			return {
				kit,
				store: store?.name ?? null,
				...cut,
				...purchaseDates(acquisition),
				priceCents: acquisition.priceCents
			};
		})
	);

	const wished = new Set<object>();
	const wishlistRows = rows.wishlist.map((input, i) =>
		row('wishlist', i, () => {
			const kit = kitOf(input);
			const version = checkWishVersion(input.version);
			if (wished.has(kit)) {
				const label = kitLabel(kit.team, formatSeason(kit.start, kit.end), kit.kitType);
				throw new Error(`${label} is twice on the Wishlist`);
			}
			wished.add(kit);
			return { kit, version };
		})
	);

	return {
		countries: countryList.filter((c) => c.created),
		stores: storeList.filter((s) => s.created),
		teams: teamList.filter((t) => t.created),
		kits: kitList.filter((k) => k.created),
		jerseys: jerseyRows,
		wishlist: wishlistRows
	};
}

const countryIdNamed = (name: string) =>
	sql`(SELECT ${countries.id} FROM ${countries} WHERE ${countries.name} = ${name})`;
const teamIdNamed = (name: string) =>
	sql`(SELECT ${teams.id} FROM ${teams} WHERE ${teams.name} = ${name})`;
const storeIdNamed = (name: string) =>
	sql`(SELECT ${stores.id} FROM ${stores} WHERE ${stores.name} = ${name})`;
const kitIdOf = (kit: { team: string; start: number; kitType: KitType }) =>
	sql`(SELECT ${kits.id} FROM ${kits} JOIN ${teams} ON ${teams.id} = ${kits.teamId}
		WHERE ${teams.name} = ${kit.team} AND ${kits.seasonStartYear} = ${kit.start}
		AND ${kits.kitType} = ${kit.kitType})`;

/** Imports the sheet rows once, into an empty Collection and Wishlist. The caller checks the Owner. */
export async function importRows(
	db: DrizzleD1Database,
	rows: ImportRows,
	reads: ImportReads
): Promise<ImportRowsResult> {
	const [{ held }] = await db
		.select({
			held: sql<number>`(SELECT count(*) FROM ${jerseys}) + (SELECT count(*) FROM ${wishlistItems})`
		})
		.from(sql`(SELECT 1)`);
	if (held > 0) throw new Error('The Collection or the Wishlist already has entries');
	const checked = await checkImport(db, rows, reads);
	// Rows find their Country, Team, Store and Kit by name, so one batch (one transaction) does it.
	const statements = [
		...checked.countries.flatMap((c) => [
			db.insert(leagues).values({ name: c.league, seasonFormat: c.seasonFormat }),
			db
				.insert(countries)
				.values({ name: c.name, continent: c.continent, leagueId: sql`last_insert_rowid()` })
		]),
		...checked.stores.map((s) => db.insert(stores).values({ name: s.name })),
		...checked.teams.map((t) =>
			db.insert(teams).values({ name: t.name, kind: t.kind, countryId: countryIdNamed(t.country) })
		),
		...checked.kits.map((k) =>
			db.insert(kits).values({
				teamId: teamIdNamed(k.team),
				seasonStartYear: k.start,
				seasonEndYear: k.end,
				kitType: k.kitType
			})
		),
		...checked.jerseys.map(({ kit, store, ...fields }) =>
			db.insert(jerseys).values({
				...fields,
				kitId: kitIdOf(kit),
				storeId: store === null ? null : storeIdNamed(store)
			})
		),
		...checked.wishlist.map(({ kit, version }) =>
			db.insert(wishlistItems).values({ kitId: kitIdOf(kit), version })
		)
	];
	if (statements.length) await db.batch(statements as unknown as BatchStatements);
	return {
		countries: checked.countries.length,
		stores: checked.stores.length,
		teams: checked.teams.length,
		kits: checked.kits.length,
		jerseys: checked.jerseys.length,
		wishlistItems: checked.wishlist.length
	};
}
