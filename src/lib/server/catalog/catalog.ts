import { and, count, eq, gt, isNull, lte, or, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { continents, seasonFormats } from '../../countries';
import { countries, jerseys, kits, leagues, stores, teams, wishlistItems } from '../db/schema';
import { kitSeasonFirst } from './matching';
import {
	fetchKitPicture,
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
import { checkImage, MAX_UPLOAD_BYTES, readBody } from './images';
import { issueToken, passwordMatches, tokenIsValid, UnauthorizedError } from './auth';
import type {
	Acquisition,
	Catalog,
	CollectionJersey,
	Country,
	CountryInput,
	Desire,
	KitView,
	LookupProgress,
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

	/** Fetches the image at an http(s) address. The caller checks it as an upload. */
	async function fetchImage(address: string) {
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
		if (!body) throw new Error('The image must be under 2 MB');
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

	return {
		listCountries: readCountries,

		async listCollection() {
			const rows = await db
				.select({ jersey: jerseys, kit: kits, team: teams, country: countries, store: stores })
				.from(jerseys)
				.innerJoin(kits, eq(jerseys.kitId, kits.id))
				.innerJoin(teams, eq(kits.teamId, teams.id))
				.innerJoin(countries, eq(teams.countryId, countries.id))
				.leftJoin(stores, eq(jerseys.storeId, stores.id));
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

		async listWishlist() {
			const rows = await db
				.select({ item: wishlistItems, kit: kits, team: teams, country: countries })
				.from(wishlistItems)
				.innerJoin(kits, eq(wishlistItems.kitId, kits.id))
				.innerJoin(teams, eq(kits.teamId, teams.id))
				.innerJoin(countries, eq(teams.countryId, countries.id));
			return rows
				.map(({ item, kit, team, country }): WishlistItem => ({
					id: item.id,
					version: item.version,
					desire: item.desire as Desire,
					kit: kitView(kit, team, country)
				}))
				.sort((a, b) => b.desire - a.desire || b.id - a.id);
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
