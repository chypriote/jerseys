import { json } from '@sveltejs/kit';
import { ownerEndpoint } from '#lib/server/owner-actions';
import type { RequestHandler } from './$types';

/** TheSportsDB Teams for the typed text `q`. */
export const GET: RequestHandler = ({ url, cookies }) =>
	ownerEndpoint(cookies, async (catalog, token) => {
		const teams = await catalog.searchTeams(token, url.searchParams.get('q') ?? '');
		return json({ teams });
	});
