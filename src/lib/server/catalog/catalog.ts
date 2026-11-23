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
import { continents, seasonFormats } from '../../countries';
import { kitTypeLabels } from '../../labels';
import {
	countries,
	jerseys,
	kits,
	leagues,
	pictures,
	stores,
	teams,
	wishlistItems
} from '../db/schema';
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
	CountryInput,
	Desire,
	GotItInput,
	ImportCountryRow,
	ImportKitRow,
	ImportRows,
	ImportTeam,
	JerseyInput,
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

function required(value: string, what: string) {
	const cleaned = value.trim();
	if (!cleaned) throw new Error(`${what} is required`);
	return cleaned;
}

/** The cleaned Country and League fields, or a readable error. Form payloads are untrusted. */
function countryFields(input: CountryInput) {
	if (!continents.some((c) => c.value === input.continent))
		throw new Error(`Continent must be one of ${continents.map((c) => c.label).join(', ')}`);
	if (!seasonFormats.some((f) => f.value === input.seasonFormat))
		throw new Error('Season Format must be Split or Calendar');
	return {
		continent: input.continent,
		leagueName: required(input.leagueName ?? '', 'League name'),
		seasonFormat: input.seasonFormat
	};
}

const compare = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' });

/** "2023-24" for a Split Season, "2024" for a Calendar Season. */
function formatSeason(start: number, end: number | null) {
	return end === null ? String(start) : `${start}-${String(end % 100).padStart(2, '0')}`;
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

const KIT_TYPE_ORDER = ['home', 'away', 'third', 'fourth', 'cup', 'special'];

// --- Jerseys: input checks (form payloads are untrusted) -------------------------------

const YEAR_OR_DATE = /^(\d{4})(?:-(\d{2})-(\d{2}))?$/;

/** `YYYY`, or a real calendar date `YYYY-MM-DD` (2024-02-31 is not one). */
function checkDate(value: unknown, what: string): string {
	const text = typeof value === 'string' ? value.trim() : '';
	const match = YEAR_OR_DATE.exec(text);
	if (match && match[2]) {
		const date = new Date(`${text}T00:00:00Z`);
		if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) {
			throw new Error(`${what} is not a real date`);
		}
	}
	if (!match) throw new Error(`${what} must be YYYY or YYYY-MM-DD`);
	return text;
}

const optionalDate = (value: unknown, what: string) =>
	typeof value === 'string' && value.trim() ? checkDate(value, what) : null;

const cleanOrNull = (value: unknown) => (typeof value === 'string' && value.trim()) || null;

function oneOf<T extends string>(value: unknown, allowed: readonly T[], message: string): T {
	if (!allowed.includes(value as T)) throw new Error(message);
	return value as T;
}

function nullableOneOf<T extends string>(value: unknown, allowed: readonly T[], message: string) {
	return value === null || value === undefined || value === ''
		? null
		: oneOf(value, allowed, message);
}

/** A Season as start and end year, checked against the Team's Season Format. */
function parseSeason(value: unknown, format: SeasonFormat) {
	const text = typeof value === 'string' ? value.trim() : '';
	if (format === 'calendar') {
		if (/^\d{4}$/.test(text)) return { start: Number(text), end: null };
		throw new Error('Season must be one year, like 2024');
	}
	const match = /^(\d{4})-(\d{2})$/.exec(text);
	const start = Number(match?.[1]);
	if (match && (start + 1) % 100 === Number(match[2])) return { start, end: start + 1 };
	throw new Error('Season must be two years in a row, like 2024-25');
}

const checkKitType = (value: unknown) =>
	oneOf<KitType>(
		value,
		['home', 'away', 'third', 'fourth', 'cup', 'special'],
		'Kit Type must be Home, Away, Third, Fourth, Cup or Special'
	);

// --- Delete ---

const OFFICIAL_STORE = 'Official Store';

/** "1 Purchase", "2 Purchases". */
const counted = (n: number, what: string) => `${n} ${what}${n === 1 ? '' : 's'}`;

/** Refuses a delete while other rows use the row, naming them. `uses` are [count, singular name]. */
function refuseWhileUsed(name: string, uses: [number, string][]) {
	const used = uses.filter(([n]) => n > 0).map(([n, what]) => counted(n, what));
	if (used.length) throw new Error(`${name} is still used by ${used.join(' and ')}`);
}

const isCents = (value: unknown): value is number =>
	Number.isInteger(value) && (value as number) >= 0;

/** Version, Size, Fit and Print of a Jersey. */
function checkCut(input: Pick<JerseyInput, 'version' | 'size' | 'fit' | 'print'>) {
	return {
		version: oneOf(
			input.version,
			['fan', 'player', 'tracksuit'],
			'Version must be Fan, Player or Tracksuit'
		),
		size: nullableOneOf(input.size, ['S', 'M', 'L'], 'Size must be S, M or L'),
		fit: nullableOneOf(
			input.fit,
			['too-small', 'good', 'too-big'],
			'Fit must be Too small, Good or Too big'
		),
		print: cleanOrNull(input.print)
	};
}

const checkWishVersion = (value: unknown) =>
	nullableOneOf(
		value,
		['fan', 'player', 'tracksuit'],
		'Version must be Any, Fan, Player or Tracksuit'
	);

function checkDesire(value: unknown) {
	const desire = Number(value);
	if (!Number.isInteger(desire) || desire < 1 || desire > 5)
		throw new Error('Desire must be 1 to 5');
	return desire;
}

/** The Purchase dates, from the form or the import. */
const purchaseDates = (input: { bought: unknown; sent?: unknown; received?: unknown }) => ({
	acquisitionKind: 'purchase' as const,
	acquisitionDate: checkDate(input.bought, 'Bought date'),
	sentDate: optionalDate(input.sent, 'Sent date'),
	receivedDate: optionalDate(input.received, 'Received date'),
	giver: null
});

const giftFields = (input: { date: unknown; giver?: unknown }) => ({
	acquisitionKind: 'gift' as const,
	acquisitionDate: checkDate(input.date, 'Gift date'),
	sentDate: null,
	receivedDate: null,
	storeId: null,
	priceCents: null,
	giver: cleanOrNull(input.giver)
});

type BatchStatements = Parameters<ReturnType<typeof drizzle>['batch']>[0];

export function buildCatalog(env: CatalogEnv, options: CatalogOptions = {}): Catalog {
	const db = drizzle(env.DB);
	const sportsDb: SportsDbConfig = {
		key: env.THESPORTSDB_KEY,
		intervalMs: options.lookupIntervalMs ?? 2000
	};

	async function owner(token: string) {
		if (!env.JWT_SECRET || !(await tokenIsValid(token, env.JWT_SECRET)))
			throw new UnauthorizedError();
	}

	const lookup: LookupContext = { db, covers: env.COVERS, sportsDb };
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
		if (!kit) throw new Error('Kit not found');
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

	/** The trimmed name, or a readable error when it is empty or another Store has it. */
	async function freeStoreName(name: string, exceptId?: number) {
		const cleaned = required(name, 'Store name');
		const all = await db.select().from(stores);
		if (all.some((s) => s.id !== exceptId && compare(s.name, cleaned) === 0))
			throw new Error(`A store named “${cleaned}” already exists`);
		return cleaned;
	}

	/** The trimmed name, or a readable error when it is empty or another Country has it. */
	async function freeCountryName(name: string, exceptId?: number) {
		const cleaned = required(name ?? '', 'Country name');
		const all = await db.select().from(countries);
		if (all.some((c) => c.id !== exceptId && compare(c.name, cleaned) === 0))
			throw new Error(`A country named “${cleaned}” already exists`);
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
				`${misfit.team} has a Kit of Season ${formatSeason(misfit.start, misfit.end)}, which does not fit a ${label} Season Format`
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
		return rows
			.sort(
				(a, b) =>
					compare(a.team.name, b.team.name) ||
					a.kit.seasonStartYear - b.kit.seasonStartYear ||
					KIT_TYPE_ORDER.indexOf(a.kit.kitType) - KIT_TYPE_ORDER.indexOf(b.kit.kitType)
			)
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
		return rows
			.map(({ item, kit, team, country }): WishlistItem => ({
				id: item.id,
				version: item.version,
				desire: item.desire as Desire,
				kit: kitView(kit, team, country)
			}))
			.sort((a, b) => b.desire - a.desire || b.id - a.id);
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

	// --- Import (once) ---------------------------------------------------------

	/** Checks every row, writing nothing. Returns what the one write batch needs. */
	async function checkImport(rows: ImportRows) {
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

		const countryList: (ImportCountryRow & { created: boolean })[] = (await readCountries()).map(
			(c) => ({ ...c, league: c.league.name, seasonFormat: c.league.seasonFormat, created: false })
		);
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
		const teamList = (await readTeams()).map((t) => ({
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
				const desire = checkDesire(input.desire);
				if (wished.has(kit)) {
					const season = formatSeason(kit.start, kit.end);
					throw new Error(
						`${kit.team} ${season} ${kitTypeLabels[kit.kitType]} is twice on the Wishlist`
					);
				}
				wished.add(kit);
				return { kit, version, desire };
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
			await owner(token);
			const row = await jerseyRow(input);
			const [{ id }] = await db.insert(jerseys).values(row).returning({ id: jerseys.id });
			return (await readCollection(id))[0];
		},

		async editJersey(token, input) {
			await owner(token);
			const id = Number(input.id);
			if (!(await readCollection(id)).length) throw new Error('Jersey not found');
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
			await owner(token);
			const kit = await checkKit(input);
			const version = checkWishVersion(input.version);
			const desire = checkDesire(input.desire);
			if (kit.existingId !== null) {
				const [listed] = await db
					.select({ id: wishlistItems.id })
					.from(wishlistItems)
					.where(eq(wishlistItems.kitId, kit.existingId));
				if (listed) {
					const season = formatSeason(kit.season.start, kit.season.end);
					throw new Error(
						`${kit.team.name} ${season} ${kitTypeLabels[kit.kitType]} is already on the Wishlist`
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
				.values({ kitId, version, desire })
				.returning({ id: wishlistItems.id });
			return { status: 'added', item: (await readWishlist(id))[0] };
		},

		// --- Got it and Drop ---

		async gotIt(token, input) {
			await owner(token);
			const [item] = await db
				.select()
				.from(wishlistItems)
				.where(eq(wishlistItems.id, Number(input.wishlistItemId)));
			if (!item) throw new Error('Wishlist Item not found');
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
			await owner(token);
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
			if (!picture) return null;
			const object = await env.COVERS.get(picture.key);
			if (!object) return null;
			return { body: object.body, contentType: object.httpMetadata?.contentType ?? 'image/jpeg' };
		},

		async addPicture(token, input) {
			await owner(token);
			checkImage(input.body, input.contentType);
			const kitId = Number(input.kitId);
			const [kit] = await db.select({ id: kits.id }).from(kits).where(eq(kits.id, kitId));
			if (!kit) throw new Error('Kit not found');
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
			await owner(token);
			const { continent, leagueName, seasonFormat } = countryFields(input);
			const name = await freeCountryName(input.name);
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
			await owner(token);
			const [current] = await db.select().from(countries).where(eq(countries.id, input.id));
			if (!current) throw new Error('Unknown country');
			const { continent, leagueName, seasonFormat } = countryFields(input);
			const name = await freeCountryName(input.name, input.id);
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
			await owner(token);
			const cleaned = await freeStoreName(name);
			const [created] = await db.insert(stores).values({ name: cleaned }).returning();
			return { id: created.id, name: created.name };
		},

		async renameStore(token, id, name) {
			await owner(token);
			const cleaned = await freeStoreName(name, id);
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
			await owner(token);
			const [found] = await readKits(Number(input.kitId));
			if (!found) throw new Error('Kit not found');
			const team = (await readTeams()).find((t) => t.id === found.team.id)!;
			const season = parseSeason(input.season, team.seasonFormat);
			const kitType = checkKitType(input.kitType);
			const sameId = await findKitId(team.id, season.start, kitType);
			if (sameId !== null && sameId !== found.id) {
				const label = `${team.name} ${formatSeason(season.start, season.end)} ${kitTypeLabels[kitType]}`;
				throw new Error(`The Kit ${label} already exists`);
			}
			await db
				.update(kits)
				.set({ seasonStartYear: season.start, seasonEndYear: season.end, kitType })
				.where(eq(kits.id, found.id));
			return (await readKits(found.id))[0];
		},

		async editTeam(token, input) {
			await owner(token);
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
			if (!kit?.mainPictureKey) return null;
			const object = await env.COVERS.get(kit.mainPictureKey);
			if (!object) return null;
			return { body: object.body, contentType: object.httpMetadata?.contentType ?? 'image/jpeg' };
		},

		async uploadMainPicture(token, input) {
			await owner(token);
			await saveUpload(input.kitId, input.body, input.contentType);
		},

		async uploadMainPictureFromUrl(token, input) {
			await owner(token);
			const image = await fetchImage(input.url);
			await saveUpload(input.kitId, image.body, image.contentType);
		},

		async listPictureCandidates(token, kitId) {
			await owner(token);
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
			await owner(token);
			const hits = await searchTeams(sportsDb, query);
			return hits
				.filter((hit) => hit.soccer)
				.map(({ id, name, country, league }) => ({ id, name, country, league }));
		},

		async setTeamSource(token, input) {
			await owner(token);
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
			await owner(token);
			const kit = (await db.select({ id: kits.id }).from(kits).where(eq(kits.id, input.kitId)))[0];
			if (!kit) throw new Error('Kit not found');
			const image = await fetchKitPicture(sportsDb, String(input.candidateId ?? ''));
			checkImage(image.body, image.contentType);
			await storeMainPicture(kit.id, image.body, image.contentType);
		},

		async lookupNext(token, input) {
			await owner(token);
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
			await owner(token);
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
			return rows
				.sort(
					(a, b) =>
						compare(a.teamName, b.teamName) ||
						a.start - b.start ||
						KIT_TYPE_ORDER.indexOf(a.kitType) - KIT_TYPE_ORDER.indexOf(b.kitType)
				)
				.map((r) => ({
					id: r.id,
					teamName: r.teamName,
					season: formatSeason(r.start, r.end),
					kitType: r.kitType
				}));
		},

		// --- Delete ---

		async deleteJersey(token, jerseyId) {
			await owner(token);
			const [deleted] = await db
				.delete(jerseys)
				.where(eq(jerseys.id, Number(jerseyId)))
				.returning({ id: jerseys.id });
			if (!deleted) throw new Error('Jersey not found');
		},

		async deleteStore(token, storeId) {
			await owner(token);
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
			await owner(token);
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
			await owner(token);
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
			await owner(token);
			const [kit] = await readKits(Number(kitId));
			if (!kit) throw new Error('Kit not found');
			const [[{ owned }], [{ wanted }]] = await db.batch([
				db.select({ owned: count() }).from(jerseys).where(eq(jerseys.kitId, kit.id)),
				db.select({ wanted: count() }).from(wishlistItems).where(eq(wishlistItems.kitId, kit.id))
			]);
			refuseWhileUsed(`${kit.team.name} ${kit.season} ${kitTypeLabels[kit.kitType]}`, [
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
			await owner(token);
			const [deleted] = await db
				.delete(pictures)
				.where(eq(pictures.id, Number(pictureId)))
				.returning({ key: pictures.key });
			if (!deleted) throw new Error('Picture not found');
			await env.COVERS.delete(deleted.key);
		},

		// --- Import (once) ---

		async importRows(token, rows) {
			await owner(token);
			const [{ held }] = await db
				.select({
					held: sql<number>`(SELECT count(*) FROM ${jerseys}) + (SELECT count(*) FROM ${wishlistItems})`
				})
				.from(sql`(SELECT 1)`);
			if (held > 0) throw new Error('The Collection or the Wishlist already has entries');
			const checked = await checkImport(rows);
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
					db
						.insert(teams)
						.values({ name: t.name, kind: t.kind, countryId: countryIdNamed(t.country) })
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
				...checked.wishlist.map(({ kit, version, desire }) =>
					db.insert(wishlistItems).values({ kitId: kitIdOf(kit), version, desire })
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
