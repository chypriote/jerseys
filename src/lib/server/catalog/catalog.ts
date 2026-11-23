import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { stores } from '../db/schema';
import { issueToken, passwordMatches, tokenIsValid, UnauthorizedError } from './auth';
import type { Catalog } from './types';

export interface CatalogEnv {
	DB: D1Database;
	OWNER_PASSWORD: string;
	JWT_SECRET: string;
}

function required(value: string, what: string) {
	const cleaned = value.trim();
	if (!cleaned) throw new Error(`${what} is required`);
	return cleaned;
}

const compare = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' });

export function buildCatalog(env: CatalogEnv): Catalog {
	const db = drizzle(env.DB);

	async function owner(token: string) {
		if (!env.JWT_SECRET || !(await tokenIsValid(token, env.JWT_SECRET)))
			throw new UnauthorizedError();
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
