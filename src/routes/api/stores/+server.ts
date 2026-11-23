import { json } from '@sveltejs/kit';
import { ownerEndpoint } from '#lib/server/owner-actions';
import type { RequestHandler } from './$types';

/** Adds a Store at once ("Add a store…" in the forms). The Catalog checks the Owner token. */
export const POST: RequestHandler = ({ request, cookies }) =>
	ownerEndpoint(cookies, async (catalog, token) => {
		const { name } = (await request.json()) as { name?: string };
		const store = await catalog.addStore(token, String(name ?? ''));
		return json(store);
	});
