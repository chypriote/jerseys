import { buildCatalog, type CatalogEnv } from './catalog';
import type { Catalog } from './types';

export type { CatalogEnv } from './catalog';
export type * from './types';

export function createCatalog(env: CatalogEnv): Catalog {
	return buildCatalog(env);
}
