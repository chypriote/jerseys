import { drizzle } from 'drizzle-orm/d1';
import { stores } from '../db/schema';
import type { Catalog } from './types';

export interface CatalogEnv {
	DB: D1Database;
}

const compare = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' });

export function buildCatalog(env: CatalogEnv): Catalog {
	const db = drizzle(env.DB);

	return {
		async listStores() {
			const all = await db.select().from(stores);
			return all.sort((a, b) => compare(a.name, b.name));
		}
	};
}
