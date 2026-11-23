import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { createCatalog } from './index';

describe('Catalog', () => {
	it('has the Official Store from day one', async () => {
		const catalog = createCatalog(env);
		expect(await catalog.listStores()).toEqual([{ id: 1, name: 'Official Store' }]);
	});
});
