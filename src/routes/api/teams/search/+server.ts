import { json } from '@sveltejs/kit';
import { catalogFromPlatform } from '#lib/server/catalog';
import { ownerToken } from '#lib/server/owner';
import { endpointError } from '#lib/server/owner-actions';
import type { RequestHandler } from './$types';

/** TheSportsDB Teams for the typed text `q`. */
export const GET: RequestHandler = async ({ url, cookies }) => {
	try {
		const teams = await catalogFromPlatform().searchTeams(
			ownerToken(cookies),
			url.searchParams.get('q') ?? ''
		);
		return json({ teams });
	} catch (error) {
		return endpointError(error);
	}
};
