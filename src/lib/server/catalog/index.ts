import { env } from 'cloudflare:workers';
import { buildCatalog, type CatalogEnv } from './catalog';
import type { Catalog } from './types';

export { UnauthorizedError } from './auth';
export type { CatalogEnv } from './catalog';
export type * from './types';

export function createCatalog(env: CatalogEnv): Catalog {
	return buildCatalog(env);
}

/** Builds the Catalog for a route from the Worker bindings (adapter-cloudflare 9 no longer sets `platform`). */
export function catalogFromPlatform(): Catalog {
	return createCatalog(env as unknown as CatalogEnv);
}
