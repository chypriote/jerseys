import { drizzle } from 'drizzle-orm/d1';
import { stores } from '../db/schema';
import { issueToken, passwordMatches, tokenIsValid } from './auth';
import type { Catalog } from './types';

export interface CatalogEnv {
	DB: D1Database;
	OWNER_PASSWORD: string;
	JWT_SECRET: string;
}

const compare = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' });

export function buildCatalog(env: CatalogEnv): Catalog {
	const db = drizzle(env.DB);

	return {
		async listStores() {
			const all = await db.select().from(stores);
			return all.sort((a, b) => compare(a.name, b.name));
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
