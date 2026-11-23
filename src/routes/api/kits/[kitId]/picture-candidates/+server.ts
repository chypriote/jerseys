import { json } from '@sveltejs/kit';
import { catalogFromPlatform } from '#lib/server/catalog';
import { ownerToken } from '#lib/server/owner';
import { endpointError } from '#lib/server/owner-actions';
import type { RequestHandler } from './$types';

/** The TheSportsDB pictures of a Kit's Team, the Kit Season first. */
export const GET: RequestHandler = async ({ params, cookies }) => {
	try {
		return json(
			await catalogFromPlatform().listPictureCandidates(ownerToken(cookies), Number(params.kitId))
		);
	} catch (error) {
		return endpointError(error);
	}
};
