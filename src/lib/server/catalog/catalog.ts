import { eq, isNull, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { kits, stores, teams } from '../db/schema';
import { checkImage, MAX_UPLOAD_BYTES, readBody } from './images';
import { issueToken, passwordMatches, tokenIsValid, UnauthorizedError } from './auth';
import type { Catalog } from './types';

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

const compare = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' });

/** "2023-24" for a Split Season, "2024" for a Calendar Season. */
function formatSeason(start: number, end: number | null) {
	return end === null ? String(start) : `${start}-${String(end % 100).padStart(2, '0')}`;
}

const KIT_TYPE_ORDER = ['home', 'away', 'third', 'fourth', 'cup', 'special'];

export function buildCatalog(env: CatalogEnv): Catalog {
	const db = drizzle(env.DB);

	async function owner(token: string) {
		if (!env.JWT_SECRET || !(await tokenIsValid(token, env.JWT_SECRET)))
			throw new UnauthorizedError();
	}

	/** Writes the image as the Cover of the Kit, marks it Owner-chosen and changes its URL. */
	async function storeCover(kitId: number, body: ArrayBuffer, contentType: string) {
		const coverKey = `covers/${kitId}`;
		await env.COVERS.put(coverKey, body, { httpMetadata: { contentType } });
		await db
			.update(kits)
			.set({ coverKey, coverChosen: true, coverVersion: sql`${kits.coverVersion} + 1` })
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
		await storeCover(kit.id, body, contentType);
	}

	/** The trimmed name, or a readable error when it is empty or another Store has it. */
	async function freeStoreName(name: string, exceptId?: number) {
		const cleaned = required(name, 'Store name');
		const all = await db.select().from(stores);
		if (all.some((s) => s.id !== exceptId && compare(s.name, cleaned) === 0))
			throw new Error(`A store named “${cleaned}” already exists`);
		return cleaned;
	}

	return {
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

		async getCover(kitId) {
			const kit = (
				await db.select({ coverKey: kits.coverKey }).from(kits).where(eq(kits.id, kitId))
			)[0];
			if (!kit?.coverKey) return null;
			const object = await env.COVERS.get(kit.coverKey);
			if (!object) return null;
			return { body: object.body, contentType: object.httpMetadata?.contentType ?? 'image/jpeg' };
		},

		async uploadCover(token, input) {
			await owner(token);
			await saveUpload(input.kitId, input.body, input.contentType);
		},

		async uploadCoverFromUrl(token, input) {
			await owner(token);
			const image = await fetchImage(input.url);
			await saveUpload(input.kitId, image.body, image.contentType);
		},

		async listKitsWithoutCover(token) {
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
				.where(isNull(kits.coverKey));
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
