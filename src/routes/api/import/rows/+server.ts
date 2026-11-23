import { json } from '@sveltejs/kit';
import type { ImportRows } from '#lib/server/catalog';
import { ownerEndpoint } from '#lib/server/owner-actions';
import type { RequestHandler } from './$types';

/** Takes the cleaned sheet rows as JSON ({ countries, jerseys, wishlist }). Owner cookie required. */
export const POST: RequestHandler = ({ request, cookies }) =>
	ownerEndpoint(cookies, async (catalog, token) => {
		const rows = (await request.json()) as ImportRows;
		return json(await catalog.importRows(token, rows));
	});
