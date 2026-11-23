import { eq, isNull, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { continents, seasonFormats } from '../../countries';
import { countries, jerseys, kits, leagues, stores, teams } from '../db/schema';
import { checkImage, MAX_UPLOAD_BYTES, readBody } from './images';
import { issueToken, passwordMatches, tokenIsValid, UnauthorizedError } from './auth';
import type { Acquisition, Catalog, CollectionJersey, Country, CountryInput } from './types';

export interface CatalogEnv {
	DB: D1Database;
	COVERS: R2Bucket;
	OWNER_PASSWORD: string;
	JWT_SECRET: string;
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

const acquiredOn = (j: CollectionJersey) =>
	j.acquisition.kind === 'gift' ? j.acquisition.date : j.acquisition.bought;

/** By Acquisition date as stored: a year sorts before the full dates of that year. */
const compareDates = (a: CollectionJersey, b: CollectionJersey) =>
	acquiredOn(a) < acquiredOn(b) ? -1 : acquiredOn(a) > acquiredOn(b) ? 1 : 0;

const KIT_TYPE_ORDER = ['home', 'away', 'third', 'fourth', 'cup', 'special'];

export function buildCatalog(env: CatalogEnv): Catalog {
	const db = drizzle(env.DB);

	async function owner(token: string) {
		if (!env.JWT_SECRET || !(await tokenIsValid(token, env.JWT_SECRET)))
			throw new UnauthorizedError();
	}

	/** Writes the image as the Main Picture of the Kit, marks it Owner-chosen and changes its URL. */
	async function storeMainPicture(kitId: number, body: ArrayBuffer, contentType: string) {
		const mainPictureKey = `main-pictures/${kitId}`;
		await env.COVERS.put(mainPictureKey, body, { httpMetadata: { contentType } });
		await db
			.update(kits)
			.set({
				mainPictureKey,
				mainPictureChosen: true,
				mainPictureVersion: sql`${kits.mainPictureVersion} + 1`
			})
			.where(eq(kits.id, kitId));
	}

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
						kit: {
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
						},
						acquisition
					};
				})
				.sort((a, b) => compareDates(b, a) || b.id - a.id);
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
