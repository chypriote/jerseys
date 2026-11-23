import { json } from '@sveltejs/kit';
import { catalogFromPlatform } from '#lib/server/catalog';
import type { ImportRows } from '#lib/server/catalog';
import { ownerToken } from '#lib/server/owner';
import { endpointError } from '#lib/server/owner-actions';
import type { RequestHandler } from './$types';

/** Takes the cleaned sheet rows as JSON ({ countries, jerseys, wishlist }). Owner cookie required. */
export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const rows = (await request.json()) as ImportRows;
		return json(await catalogFromPlatform().importRows(ownerToken(cookies), rows));
	} catch (error) {
		return endpointError(error);
	}
};
