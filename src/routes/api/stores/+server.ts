import { json } from '@sveltejs/kit';
import { catalogFromPlatform } from '#lib/server/catalog';
import { ownerToken } from '#lib/server/owner';
import { endpointError } from '#lib/server/owner-actions';
import type { RequestHandler } from './$types';

/** Adds a Store at once ("Add a store…" in the forms). The Catalog checks the Owner token. */
export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const { name } = (await request.json()) as { name?: string };
		const store = await catalogFromPlatform().addStore(ownerToken(cookies), String(name ?? ''));
		return json(store);
	} catch (error) {
		return endpointError(error);
	}
};
