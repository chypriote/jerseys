import { json } from '@sveltejs/kit';
import { ownerEndpoint } from '#lib/server/owner-actions';
import type { RequestHandler } from './$types';

/** The TheSportsDB pictures of a Kit's Team, the Kit Season first. */
export const GET: RequestHandler = ({ params, cookies }) =>
	ownerEndpoint(cookies, async (catalog, token) => {
		return json(await catalog.listPictureCandidates(token, Number(params.kitId)));
	});
