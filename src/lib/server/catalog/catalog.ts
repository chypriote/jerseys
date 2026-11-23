import {
	and,
	asc,
	count,
	eq,
	gt,
	inArray,
	isNotNull,
	isNull,
	lte,
	or,
	sql,
	type SQL
} from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { seasonFormats } from '../../countries';
import {
	countries,
	jerseys,
	KIT_TYPES,
	kits,
	leagues,
	pictures,
	stores,
	teams,
	wishlistItems
} from '../db/schema';
import {
	checkCut,
	checkKitType,
	checkWishVersion,
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
import { importRows } from './import';
import { kitSeasonFirst } from './matching';
import {
	fetchKitPicture,
	isKitPictureUrl,
	listKitPictures,
	RateLimitError,
	searchTeams,
	type SportsDbConfig
} from './thesportsdb';
import {
	kitWithTeam,
	lookUpMainPicture,
	putMainPicture,
	sourceTeamOf,
	type LookupContext
} from './lookup';
import { checkImage, MAX_UPLOAD_BYTES, readBody, tooBig } from './images';
import { issueToken, passwordMatches, tokenIsValid, UnauthorizedError } from './auth';
import type {
	Acquisition,
	AcquisitionInput,
	Catalog,
	CollectionJersey,
	Country,
	JerseyInput,
	GotItInput,
	KitInput,
	KitType,
	KitView,
	LookupProgress,
	SeasonFormat,
	TeamChoice,
	TeamKind,
	TeamView,
	WishlistItem
} from './types';

export interface CatalogEnv {
	DB: D1Database;
	COVERS: R2Bucket;
	OWNER_PASSWORD: string;
	JWT_SECRET: string;
	/** TheSportsDB API key (free test key: 123). */
	THESPORTSDB_KEY: string;
}

export interface CatalogOptions {
	/** Minimum gap between TheSportsDB requests. Default 2000 (their limit). */
	lookupIntervalMs?: number;
	/** How long a save waits for the Main Picture lookup of a new Kit. Default 8000. */
	lookupTimeoutMs?: number;
}

function kitView(
	kit: typeof kits.$inferSelect,
	team: typeof teams.$inferSelect,
	country: typeof countries.$inferSelect
): KitView {
	return {
		id: kit.id,
		season: formatSeason(kit.seasonStartYear, kit.seasonEndYear),
		kitType: kit.kitType,
		mainPictureKey: kit.mainPictureKey,
		mainPictureVersion: kit.mainPictureVersion,
		team: {
			id: team.id,
			name: team.name,
			kind: team.kind,
			country: { id: country.id, name: country.name, continent: country.continent }
		}
	};
}

const acquiredOn = (j: CollectionJersey) =>
	j.acquisition.kind === 'gift' ? j.acquisition.date : j.acquisition.bought;

/** By Acquisition date as stored: a year sorts before the full dates of that year. */
const compareDates = (a: CollectionJersey, b: CollectionJersey) =>
	acquiredOn(a) < acquiredOn(b) ? -1 : acquiredOn(a) > acquiredOn(b) ? 1 : 0;

/** By Team name, then Season, then Kit Type in display order. */
const compareKits = (
	a: { teamName: string; start: number; kitType: KitType },
	b: { teamName: string; start: number; kitType: KitType }
) =>
	compare(a.teamName, b.teamName) ||
	a.start - b.start ||
	KIT_TYPES.indexOf(a.kitType) - KIT_TYPES.indexOf(b.kitType);

// --- Delete ---

const OFFICIAL_STORE = 'Official Store';

/** "1 Purchase", "2 Purchases". */
const counted = (n: number, what: string) => `${n} ${what}${n === 1 ? '' : 's'}`;

/** Refuses a delete while other rows use the row, naming them. `uses` are [count, singular name]. */
function refuseWhileUsed(name: string, uses: [number, string][]) {
	const used = uses.filter(([n]) => n > 0).map(([n, what]) => counted(n, what));
	if (used.length) throw new Error(`${name} is still used by ${used.join(' and ')}`);
}

export function buildCatalog(env: CatalogEnv, options: CatalogOptions = {}): Catalog {
	const db = drizzle(env.DB);
	const sportsDb: SportsDbConfig = {
		key: env.THESPORTSDB_KEY,
		intervalMs: options.lookupIntervalMs ?? 2000
	};

	async function requireOwner(token: string) {
		if (!env.JWT_SECRET || !(await tokenIsValid(token, env.JWT_SECRET)))
			throw new UnauthorizedError();
	}

	const lookup: LookupContext = { db, pictureBucket: env.COVERS, sportsDb };
	const storeMainPicture = (kitId: number, body: ArrayBuffer, contentType: string) =>
		putMainPicture(lookup, kitId, { body, contentType, chosen: true });

	/**
	 * Fetches the image at an http(s) address. The caller checks it as an upload. A TheSportsDB
	 * image waits for the shared TheSportsDB slot.
	 */
	async function fetchImage(address: string) {
		if (isKitPictureUrl(address)) return fetchKitPicture(sportsDb, address);
		let url: URL;
		try {
			url = new URL(address);
		} catch {
			throw new Error('This is not a web address');
		}
		if (url.protocol !== 'https:' && url.protocol !== 'http:') {
			throw new Error('Use an http or https address');
		}
		const response = await fetch(url, { headers: { 'User-Agent': 'jerseys/0.1' } });
		if (!response.ok) throw new Error(`The address answered ${response.status}`);
		const body = await readBody(response, MAX_UPLOAD_BYTES);
		if (!body) throw tooBig();
		const contentType = (response.headers.get('content-type') ?? '').split(';')[0].trim();
		return { body: body.buffer as ArrayBuffer, contentType };
	}

	async function saveUpload(kitId: number, body: ArrayBuffer, contentType: string) {
		checkImage(body, contentType);
		const kit = (await db.select({ id: kits.id }).from(kits).where(eq(kits.id, kitId)))[0];
		if (!kit) throw new Error('Unknown kit');
		await storeMainPicture(kit.id, body, contentType);
	}

	/** Lookup progress: Kits looked up or with an Owner-chosen Main Picture are done. */
	async function lookupProgress(): Promise<LookupProgress> {
		const [{ total }] = await db.select({ total: count() }).from(kits);
		const [{ done }] = await db
			.select({ done: count() })
			.from(kits)
			.where(or(eq(kits.mainPictureLookedUp, true), eq(kits.mainPictureChosen, true)));
		return { total, done };
	}

	/** The image at an R2 key, or null when it is gone. */
	async function readImage(key: string) {
		const object = await env.COVERS.get(key);
		if (!object) return null;
		return { body: object.body, contentType: object.httpMetadata?.contentType ?? 'image/jpeg' };
	}

	/** The trimmed name, or a readable error when it is empty or another row of `table` has it. */
	async function freeName(
		table: typeof stores | typeof countries,
		what: 'Store' | 'Country',
		name: string,
		exceptId?: number
	) {
		const cleaned = required(name ?? '', `${what} name`);
		const all = await db.select({ id: table.id, name: table.name }).from(table);
		if (all.some((row) => row.id !== exceptId && compare(row.name, cleaned) === 0))
			throw new Error(`A ${what.toLowerCase()} named “${cleaned}” already exists`);
		return cleaned;
	}

	/** The Kits keep their Seasons, so a new Season Format must fit every Kit `where` takes. */
	async function refuseMisfitKit(where: SQL, format: SeasonFormat) {
		const [misfit] = await db
			.select({ team: teams.name, start: kits.seasonStartYear, end: kits.seasonEndYear })
			.from(kits)
			.innerJoin(teams, eq(kits.teamId, teams.id))
			.where(
				and(
					where,
					format === 'calendar' ? isNotNull(kits.seasonEndYear) : isNull(kits.seasonEndYear)
				)
			)
			.limit(1);
		if (misfit) {
			const label = seasonFormats.find((f) => f.value === format)!.label;
			throw new Error(
				`${misfit.team} has a Kit of Season ${formatSeason(misfit.start, misfit.end)}, which does not fit the ${label} format`
			);
		}
	}

	async function readCountries(): Promise<Country[]> {
		const rows = await db
			.select({ country: countries, league: leagues })
			.from(countries)
			.innerJoin(leagues, eq(countries.leagueId, leagues.id));
		return rows
			.map(({ country, league }) => ({
				id: country.id,
				name: country.name,
				continent: country.continent,
				league: { id: league.id, name: league.name, seasonFormat: league.seasonFormat }
			}))
			.sort((a, b) => compare(a.name, b.name));
	}

	async function countryById(id: number) {
		const found = (await readCountries()).find((c) => c.id === id);
		if (!found) throw new Error('Unknown country');
		return found;
	}

	// --- Jerseys ---------------------------------------------------------------

	async function readTeams(): Promise<TeamView[]> {
		const rows = await db
			.select({ team: teams, country: countries, league: leagues })
			.from(teams)
			.innerJoin(countries, eq(teams.countryId, countries.id))
			.innerJoin(leagues, eq(countries.leagueId, leagues.id));
		return rows
			.map(({ team, country, league }) => ({
				id: team.id,
				name: team.name,
				kind: team.kind,
				seasonFormat: team.kind === 'national' ? ('calendar' as const) : league.seasonFormat,
				country: { id: country.id, name: country.name, continent: country.continent }
			}))
			.sort((a, b) => compare(a.name, b.name));
	}

	/** Checks the Team choice. A new Team is only created by `writeTeam`, after every check passed. */
	async function checkTeam(choice: TeamChoice) {
		const all = await readTeams();
		if (choice && 'teamId' in choice) {
			const known = all.find((t) => t.id === Number(choice.teamId));
			if (!known) throw new Error('Unknown team');
			return { id: known.id, name: known.name, seasonFormat: known.seasonFormat };
		}
		const { name, kind, country, seasonFormat } = await teamFields(choice, all);
		return { id: null, name, create: { name, kind, countryId: country.id }, seasonFormat };
	}

	/** The cleaned name, kind and Country of a Team, or a readable error. `others` excludes the Team edited. */
	async function teamFields(
		input: { name: string; kind: TeamKind; countryId: number },
		others: TeamView[]
	) {
		const name = required(String(input?.name ?? ''), 'Team name');
		const kind = oneOf(input.kind, ['club', 'national'], 'A team is a Club or a National Team');
		const country = await countryById(Number(input.countryId));
		if (others.some((t) => compare(t.name, name) === 0))
			throw new Error(`A team named “${name}” already exists`);
		const national = others.find((t) => t.kind === 'national' && t.country.id === country.id);
		if (kind === 'national' && national)
			throw new Error(`${country.name} already has a National Team: ${national.name}`);
		const seasonFormat: SeasonFormat =
			kind === 'national' ? 'calendar' : country.league.seasonFormat;
		return { name, kind, country, seasonFormat };
	}

	async function checkAcquisition(input: AcquisitionInput) {
		if (input?.kind === 'purchase') {
			const store = (
				await db
					.select()
					.from(stores)
					.where(eq(stores.id, Number(input.storeId)))
			)[0];
			if (!store) throw new Error('A Purchase needs a Store');
			if (!isCents(input.priceCents)) throw new Error('A Purchase needs a price in euros');
			return { ...purchaseDates(input), storeId: store.id, priceCents: input.priceCents };
		}
		if (input?.kind === 'gift') return giftFields(input);
		throw new Error('Acquisition must be a Purchase or a Gift');
	}

	async function findKitId(teamId: number, seasonStart: number, kitType: KitType) {
		const [found] = await db
			.select({ id: kits.id })
			.from(kits)
			.where(
				and(
					eq(kits.teamId, teamId),
					eq(kits.seasonStartYear, seasonStart),
					eq(kits.kitType, kitType)
				)
			);
		return found?.id ?? null;
	}

	/** Checks the Team, Season and Kit Type, writing nothing. `existingId` is the Kit when it exists. */
	async function checkKit(input: KitInput) {
		const team = await checkTeam(input.team);
		const season = parseSeason(input.season, team.seasonFormat);
		const kitType = checkKitType(input.kitType);
		const existingId = team.id === null ? null : await findKitId(team.id, season.start, kitType);
		if (input.mainPicture) checkImage(input.mainPicture.body, input.mainPicture.contentType);
		return { team, season, kitType, existingId, mainPicture: input.mainPicture ?? null };
	}

	/**
	 * Creates the new Team and the Kit if needed, then stores the sent Main picture, or looks up
	 * the Main Picture of a new Kit. Call it only after every check passed.
	 */
	async function writeKit(checked: Awaited<ReturnType<typeof checkKit>>) {
		const kit = await writeTeamAndKit(checked);
		if (checked.mainPicture) {
			await storeMainPicture(kit.id, checked.mainPicture.body, checked.mainPicture.contentType);
		} else if (kit.created) await lookUpNewKit(kit.id);
		return kit.id;
	}

	async function writeTeamAndKit({ team, season, kitType }: Awaited<ReturnType<typeof checkKit>>) {
		const teamId =
			team.id ?? (await db.insert(teams).values(team.create).returning({ id: teams.id }))[0].id;
		const kit = { teamId, seasonStartYear: season.start, seasonEndYear: season.end, kitType };
		const [created] = await db
			.insert(kits)
			.values(kit)
			.onConflictDoNothing()
			.returning({ id: kits.id });
		if (created) return { id: created.id, created: true };
		return { id: (await findKitId(teamId, season.start, kitType))!, created: false };
	}

	/** Runs the Main Picture lookup of a new Kit. A failure or a timeout is logged, never thrown. */
	async function lookUpNewKit(kitId: number) {
		let timer: ReturnType<typeof setTimeout> | undefined;
		const timeout = new Promise<never>((_, reject) => {
			timer = setTimeout(
				() => reject(new Error('Main Picture lookup timed out')),
				options.lookupTimeoutMs ?? 8000
			);
		});
		try {
			await Promise.race([lookUpMainPicture(lookup, kitId), timeout]);
		} catch (error) {
			console.error(`Main Picture lookup of Kit ${kitId} failed`, error);
		} finally {
			clearTimeout(timer);
		}
	}

	/** Checks the Jersey fields that are not the Kit, writing nothing. */
	async function checkJerseyFields(input: GotItInput['jersey']) {
		return { ...checkCut(input), ...(await checkAcquisition(input.acquisition)) };
	}

	/** Checks the whole input, then creates the new Team and the Kit if needed. Returns the jersey row. */
	async function jerseyRow(input: JerseyInput) {
		const kit = await checkKit(input);
		const fields = await checkJerseyFields(input);
		return { kitId: await writeKit(kit), ...fields };
	}

	// --- Teams and Kits admin ---

	async function readKits(id?: number): Promise<KitView[]> {
		const rows = await db
			.select({ kit: kits, team: teams, country: countries })
			.from(kits)
			.innerJoin(teams, eq(kits.teamId, teams.id))
			.innerJoin(countries, eq(teams.countryId, countries.id))
			.where(id === undefined ? undefined : eq(kits.id, id));
		const key = ({ kit, team }: (typeof rows)[number]) => ({
			teamName: team.name,
			start: kit.seasonStartYear,
			kitType: kit.kitType
		});
		return rows
			.sort((a, b) => compareKits(key(a), key(b)))
			.map(({ kit, team, country }) => kitView(kit, team, country));
	}

	async function readWishlist(id?: number): Promise<WishlistItem[]> {
		const rows = await db
			.select({ item: wishlistItems, kit: kits, team: teams, country: countries })
			.from(wishlistItems)
			.innerJoin(kits, eq(wishlistItems.kitId, kits.id))
			.innerJoin(teams, eq(kits.teamId, teams.id))
			.innerJoin(countries, eq(teams.countryId, countries.id))
			.where(id === undefined ? undefined : eq(wishlistItems.id, id));
		// Newest Season first, then Team name.
		return rows
			.sort(
				(a, b) =>
					b.kit.seasonStartYear - a.kit.seasonStartYear ||
					compare(a.team.name, b.team.name) ||
					b.item.id - a.item.id
			)
			.map(({ item, kit, team, country }): WishlistItem => ({
				id: item.id,
				version: item.version,
				kit: kitView(kit, team, country)
			}));
	}

	async function readCollection(id?: number): Promise<CollectionJersey[]> {
		const rows = await db
			.select({ jersey: jerseys, kit: kits, team: teams, country: countries, store: stores })
			.from(jerseys)
			.innerJoin(kits, eq(jerseys.kitId, kits.id))
			.innerJoin(teams, eq(kits.teamId, teams.id))
			.innerJoin(countries, eq(teams.countryId, countries.id))
			.leftJoin(stores, eq(jerseys.storeId, stores.id))
			.where(id === undefined ? undefined : eq(jerseys.id, id));
		return rows
			.map(({ jersey, kit, team, country, store }): CollectionJersey => {
				const acquisition: Acquisition =
					jersey.acquisitionKind === 'gift'
						? { kind: 'gift', date: jersey.acquisitionDate, giver: jersey.giver }
						: {
								kind: 'purchase',
								store: store && { id: store.id, name: store.name },
								priceCents: jersey.priceCents,
								bought: jersey.acquisitionDate,
								sent: jersey.sentDate,
								received: jersey.receivedDate
							};
				return {
					id: jersey.id,
					version: jersey.version,
					size: jersey.size,
					fit: jersey.fit,
					print: jersey.print,
					kit: kitView(kit, team, country),
					acquisition
				};
			})
			.sort((a, b) => compareDates(b, a) || b.id - a.id);
	}

	return {
		listCountries: readCountries,

		listCollection: () => readCollection(),

		listTeams: readTeams,

		async listPicturedKits() {
			const rows = await db
				.select({
					teamId: kits.teamId,
					start: kits.seasonStartYear,
					end: kits.seasonEndYear,
					kitType: kits.kitType
				})
				.from(kits)
				.where(isNotNull(kits.mainPictureKey));
			return rows.map(({ teamId, start, end, kitType }) => ({
				teamId,
				season: formatSeason(start, end),
				kitType
			}));
		},

		async addJersey(token, input) {
			await requireOwner(token);
			const row = await jerseyRow(input);
			const [{ id }] = await db.insert(jerseys).values(row).returning({ id: jerseys.id });
			return (await readCollection(id))[0];
		},

		async editJersey(token, input) {
			await requireOwner(token);
			const id = Number(input.id);
			if (!(await readCollection(id)).length) throw new Error('Unknown jersey');
			const row = await jerseyRow(input);
			await db.update(jerseys).set(row).where(eq(jerseys.id, id));
			return (await readCollection(id))[0];
		},

		async listCoverage() {
			// A Club plays in its Country's League, so both kinds cover the Team's Country.
			const covered = await db
				.selectDistinct({ id: teams.countryId })
				.from(jerseys)
				.innerJoin(kits, eq(jerseys.kitId, kits.id))
				.innerJoin(teams, eq(kits.teamId, teams.id));
			const ids = new Set(covered.map((row) => row.id));
			return (await readCountries()).map(({ id, name }) => ({ id, name, covered: ids.has(id) }));
		},

		listWishlist: () => readWishlist(),

		async addWishlistItem(token, input) {
			await requireOwner(token);
			const kit = await checkKit(input);
			const version = checkWishVersion(input.version);
			if (kit.existingId !== null) {
				const [listed] = await db
					.select({ id: wishlistItems.id })
					.from(wishlistItems)
					.where(eq(wishlistItems.kitId, kit.existingId));
				if (listed) {
					const season = formatSeason(kit.season.start, kit.season.end);
					throw new Error(
						`${kitLabel(kit.team.name, season, kit.kitType)} is already on the Wishlist`
					);
				}
				const [owned] = await db
					.select({ id: jerseys.id })
					.from(jerseys)
					.where(eq(jerseys.kitId, kit.existingId))
					.limit(1);
				if (owned && !input.addAnyway) return { status: 'already-owned' };
			}
			const kitId = await writeKit(kit);
			const [{ id }] = await db
				.insert(wishlistItems)
				.values({ kitId, version })
				.returning({ id: wishlistItems.id });
			return { status: 'added', item: (await readWishlist(id))[0] };
		},

		// --- Got it and Drop ---

		async gotIt(token, input) {
			await requireOwner(token);
			const [item] = await db
				.select()
				.from(wishlistItems)
				.where(eq(wishlistItems.id, Number(input.wishlistItemId)));
			if (!item) throw new Error('Unknown wishlist item');
			const fields = await checkJerseyFields(input.jersey);
			const [[{ id }]] = await db.batch([
				db
					.insert(jerseys)
					.values({ kitId: item.kitId, ...fields })
					.returning({ id: jerseys.id }),
				db.delete(wishlistItems).where(eq(wishlistItems.id, item.id))
			]);
			return (await readCollection(id))[0];
		},

		async drop(token, wishlistItemId) {
			await requireOwner(token);
			await db.delete(wishlistItems).where(eq(wishlistItems.id, Number(wishlistItemId)));
		},

		// --- Kit Pictures ---

		listPictures: (kitId) =>
			db
				.select({ id: pictures.id, kitId: pictures.kitId, position: pictures.position })
				.from(pictures)
				.where(eq(pictures.kitId, Number(kitId)))
				.orderBy(asc(pictures.position)),

		async getPicture(pictureId) {
			const [picture] = await db
				.select({ key: pictures.key })
				.from(pictures)
				.where(eq(pictures.id, Number(pictureId)));
			return picture ? readImage(picture.key) : null;
		},

		async addPicture(token, input) {
			await requireOwner(token);
			checkImage(input.body, input.contentType);
			const kitId = Number(input.kitId);
			const [kit] = await db.select({ id: kits.id }).from(kits).where(eq(kits.id, kitId));
			if (!kit) throw new Error('Unknown kit');
			// R2 first: a failed put leaves no row without an image.
			const key = `pictures/${kit.id}/${crypto.randomUUID()}`;
			await env.COVERS.put(key, input.body, { httpMetadata: { contentType: input.contentType } });
			const [created] = await db
				.insert(pictures)
				.values({
					kitId: kit.id,
					key,
					position: sql`(SELECT coalesce(max(${pictures.position}), 0) + 1 FROM ${pictures} WHERE ${pictures.kitId} = ${kit.id})`
				})
				.returning({ id: pictures.id, kitId: pictures.kitId, position: pictures.position });
			return created;
		},

		async addCountry(token, input) {
			await requireOwner(token);
			const { continent, leagueName, seasonFormat } = countryFields(input);
			const name = await freeName(countries, 'Country', input.name);
			// One batch is one transaction: the Country takes the League inserted just before it.
			const [, [created]] = await db.batch([
				db.insert(leagues).values({ name: leagueName, seasonFormat }),
				db
					.insert(countries)
					.values({ name, continent, leagueId: sql`last_insert_rowid()` })
					.returning()
			]);
			return countryById(created.id);
		},

		async editCountry(token, input) {
			await requireOwner(token);
			const [current] = await db.select().from(countries).where(eq(countries.id, input.id));
			if (!current) throw new Error('Unknown country');
			const { continent, leagueName, seasonFormat } = countryFields(input);
			const name = await freeName(countries, 'Country', input.name, input.id);
			const clubs = db
				.select({ id: teams.id })
				.from(teams)
				.where(and(eq(teams.countryId, current.id), eq(teams.kind, 'club')));
			await refuseMisfitKit(inArray(kits.teamId, clubs), seasonFormat);
			await db.batch([
				db.update(countries).set({ name, continent }).where(eq(countries.id, input.id)),
				db
					.update(leagues)
					.set({ name: leagueName, seasonFormat })
					.where(eq(leagues.id, current.leagueId))
			]);
			return countryById(input.id);
		},

		async listStores() {
			const all = await db.select().from(stores);
			return all.sort((a, b) => compare(a.name, b.name));
		},

		async addStore(token, name) {
			await requireOwner(token);
			const cleaned = await freeName(stores, 'Store', name);
			const [created] = await db.insert(stores).values({ name: cleaned }).returning();
			return { id: created.id, name: created.name };
		},

		async renameStore(token, id, name) {
			await requireOwner(token);
			const cleaned = await freeName(stores, 'Store', name, id);
			const [renamed] = await db
				.update(stores)
				.set({ name: cleaned })
				.where(eq(stores.id, id))
				.returning();
			if (!renamed) throw new Error('Unknown store');
			return { id: renamed.id, name: renamed.name };
		},

		// --- Teams and Kits admin ---

		listKits: () => readKits(),

		async editKit(token, input) {
			await requireOwner(token);
			const [found] = await readKits(Number(input.kitId));
			if (!found) throw new Error('Unknown kit');
			const team = (await readTeams()).find((t) => t.id === found.team.id)!;
			const season = parseSeason(input.season, team.seasonFormat);
			const kitType = checkKitType(input.kitType);
			const sameId = await findKitId(team.id, season.start, kitType);
			if (sameId !== null && sameId !== found.id) {
				const label = kitLabel(team.name, formatSeason(season.start, season.end), kitType);
				throw new Error(`The Kit ${label} already exists`);
			}
			await db
				.update(kits)
				.set({ seasonStartYear: season.start, seasonEndYear: season.end, kitType })
				.where(eq(kits.id, found.id));
			return (await readKits(found.id))[0];
		},

		async editTeam(token, input) {
			await requireOwner(token);
			const all = await readTeams();
			const team = all.find((t) => t.id === Number(input.teamId));
			if (!team) throw new Error('Unknown team');
			const others = all.filter((t) => t.id !== team.id);
			const { name, kind, country, seasonFormat: format } = await teamFields(input, others);
			await refuseMisfitKit(eq(kits.teamId, team.id), format);
			await db
				.update(teams)
				.set({ name, kind, countryId: country.id })
				.where(eq(teams.id, team.id));
			return (await readTeams()).find((t) => t.id === team.id)!;
		},

		async getMainPicture(kitId) {
			const kit = (
				await db
					.select({ mainPictureKey: kits.mainPictureKey })
					.from(kits)
					.where(eq(kits.id, kitId))
			)[0];
			return kit?.mainPictureKey ? readImage(kit.mainPictureKey) : null;
		},

		async uploadMainPicture(token, input) {
			await requireOwner(token);
			await saveUpload(input.kitId, input.body, input.contentType);
		},

		async uploadMainPictureFromUrl(token, input) {
			await requireOwner(token);
			const image = await fetchImage(input.url);
			await saveUpload(input.kitId, image.body, image.contentType);
		},

		async listPictureCandidates(token, kitId) {
			await requireOwner(token);
			const found = await kitWithTeam(lookup, kitId);
			const sourceTeamId = await sourceTeamOf(lookup, found);
			const pictures = sourceTeamId ? await listKitPictures(sportsDb, sourceTeamId) : [];
			const season = { start: found.kit.seasonStartYear, end: found.kit.seasonEndYear };
			return {
				teamId: found.team.id,
				sourceTeamId,
				candidates: kitSeasonFirst(pictures, season).map((p) => ({
					id: p.imageUrl,
					imageUrl: p.imageUrl,
					season: p.season && formatSeason(p.season.start, p.season.end),
					kitType: p.kitType
				}))
			};
		},

		async searchTeams(token, query) {
			await requireOwner(token);
			const hits = await searchTeams(sportsDb, query);
			return hits
				.filter((hit) => hit.soccer)
				.map(({ id, name, country, league }) => ({ id, name, country, league }));
		},

		async setTeamSource(token, input) {
			await requireOwner(token);
			const sourceTeamId = String(input.sourceTeamId ?? '').trim();
			if (!sourceTeamId) throw new Error('Choose a TheSportsDB team');
			const [updated] = await db
				.update(teams)
				.set({ sourceTeamId })
				.where(eq(teams.id, input.teamId))
				.returning({ id: teams.id });
			if (!updated) throw new Error('Unknown team');
		},

		async pickMainPicture(token, input) {
			await requireOwner(token);
			const kit = (await db.select({ id: kits.id }).from(kits).where(eq(kits.id, input.kitId)))[0];
			if (!kit) throw new Error('Unknown kit');
			const image = await fetchKitPicture(sportsDb, String(input.candidateId ?? ''));
			checkImage(image.body, image.contentType);
			await storeMainPicture(kit.id, image.body, image.contentType);
		},

		async lookupNext(token, input) {
			await requireOwner(token);
			const size = Math.max(0, Math.floor(input.size));
			const notChosen = eq(kits.mainPictureChosen, false);
			const pending = await db
				.select({ id: kits.id })
				.from(kits)
				.where(
					input.rerun
						? and(notChosen, gt(kits.id, input.after ?? 0))
						: and(notChosen, eq(kits.mainPictureLookedUp, false))
				)
				.orderBy(kits.id)
				.limit(size);
			let last = input.after ?? 0;
			let rateLimited = false;
			for (const kit of pending) {
				try {
					await lookUpMainPicture(lookup, kit.id);
				} catch (error) {
					if (error instanceof RateLimitError) {
						rateLimited = true;
						break;
					}
					// Any other error: the Kit stays not looked up, a later batch retries it.
				}
				last = kit.id;
			}
			const stopped = rateLimited ? { rateLimited } : {};
			if (!input.rerun) return { ...(await lookupProgress()), ...stopped };
			// The rerun has no marker to count: done is every not-chosen Kit up to the last one taken.
			const end = rateLimited || pending.length === size ? last : Number.MAX_SAFE_INTEGER;
			const [{ total }] = await db.select({ total: count() }).from(kits).where(notChosen);
			const [{ done }] = await db
				.select({ done: count() })
				.from(kits)
				.where(and(notChosen, lte(kits.id, end)));
			return { total, done, after: last, ...stopped };
		},

		async listKitsWithoutMainPicture(token) {
			await requireOwner(token);
			const rows = await db
				.select({
					id: kits.id,
					teamName: teams.name,
					start: kits.seasonStartYear,
					end: kits.seasonEndYear,
					kitType: kits.kitType
				})
				.from(kits)
				.innerJoin(teams, eq(kits.teamId, teams.id))
				.where(isNull(kits.mainPictureKey));
			return rows.sort(compareKits).map((r) => ({
				id: r.id,
				teamName: r.teamName,
				season: formatSeason(r.start, r.end),
				kitType: r.kitType
			}));
		},

		// --- Delete ---

		async deleteJersey(token, jerseyId) {
			await requireOwner(token);
			const [deleted] = await db
				.delete(jerseys)
				.where(eq(jerseys.id, Number(jerseyId)))
				.returning({ id: jerseys.id });
			if (!deleted) throw new Error('Unknown jersey');
		},

		async deleteStore(token, storeId) {
			await requireOwner(token);
			const [store] = await db
				.select()
				.from(stores)
				.where(eq(stores.id, Number(storeId)));
			if (!store) throw new Error('Unknown store');
			if (compare(store.name, OFFICIAL_STORE) === 0)
				throw new Error('The Official Store cannot be deleted');
			const [{ purchases }] = await db
				.select({ purchases: count() })
				.from(jerseys)
				.where(eq(jerseys.storeId, store.id));
			refuseWhileUsed(store.name, [[purchases, 'Purchase']]);
			await db.delete(stores).where(eq(stores.id, store.id));
		},

		async deleteCountry(token, countryId) {
			await requireOwner(token);
			const [country] = await db
				.select()
				.from(countries)
				.where(eq(countries.id, Number(countryId)));
			if (!country) throw new Error('Unknown country');
			const [{ used }] = await db
				.select({ used: count() })
				.from(teams)
				.where(eq(teams.countryId, country.id));
			refuseWhileUsed(country.name, [[used, 'Team']]);
			// One League per Country: it goes with it.
			await db.batch([
				db.delete(countries).where(eq(countries.id, country.id)),
				db.delete(leagues).where(eq(leagues.id, country.leagueId))
			]);
		},

		async deleteTeam(token, teamId) {
			await requireOwner(token);
			const [team] = await db
				.select()
				.from(teams)
				.where(eq(teams.id, Number(teamId)));
			if (!team) throw new Error('Unknown team');
			const [{ used }] = await db
				.select({ used: count() })
				.from(kits)
				.where(eq(kits.teamId, team.id));
			refuseWhileUsed(team.name, [[used, 'Kit']]);
			await db.delete(teams).where(eq(teams.id, team.id));
		},

		async deleteKit(token, kitId) {
			await requireOwner(token);
			const [kit] = await readKits(Number(kitId));
			if (!kit) throw new Error('Unknown kit');
			const [[{ owned }], [{ wanted }]] = await db.batch([
				db.select({ owned: count() }).from(jerseys).where(eq(jerseys.kitId, kit.id)),
				db.select({ wanted: count() }).from(wishlistItems).where(eq(wishlistItems.kitId, kit.id))
			]);
			refuseWhileUsed(kitLabel(kit.team.name, kit.season, kit.kitType), [
				[owned, 'Jersey'],
				[wanted, 'Wishlist Item']
			]);
			// The rows go first: a failed R2 delete leaves an orphan image, never a row without one.
			const [gone] = await db.batch([
				db.delete(pictures).where(eq(pictures.kitId, kit.id)).returning({ key: pictures.key }),
				db.delete(kits).where(eq(kits.id, kit.id))
			]);
			const keys = gone.map((p) => p.key);
			if (kit.mainPictureKey) keys.push(kit.mainPictureKey);
			if (keys.length) await env.COVERS.delete(keys);
		},

		async deletePicture(token, pictureId) {
			await requireOwner(token);
			const [deleted] = await db
				.delete(pictures)
				.where(eq(pictures.id, Number(pictureId)))
				.returning({ key: pictures.key });
			if (!deleted) throw new Error('Unknown picture');
			await env.COVERS.delete(deleted.key);
		},

		// --- Import (once) ---

		async importRows(token, rows) {
			await requireOwner(token);
			return importRows(db, rows, { readCountries, readTeams });
		},

		async login(password) {
			if (
				!env.OWNER_PASSWORD ||
				!env.JWT_SECRET ||
				!password ||
				!(await passwordMatches(password, env.OWNER_PASSWORD))
			) {
				return { ok: false, error: 'wrong-password' };
			}
			return { ok: true, token: await issueToken(env.JWT_SECRET) };
		},

		verifyToken: async (token) => !!env.JWT_SECRET && (await tokenIsValid(token, env.JWT_SECRET))
	};
}
