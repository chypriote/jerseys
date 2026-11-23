import { json } from '@sveltejs/kit';
import { catalogFromPlatform } from '#lib/server/catalog';
import { ownerToken } from '#lib/server/owner';
import { endpointError } from '#lib/server/owner-actions';
import type { RequestHandler } from './$types';

/** Replaces the TheSportsDB Team (JSON { sourceTeamId }) of a Team. */
export const POST: RequestHandler = async ({ params, request, cookies }) => {
	try {
		const { sourceTeamId } = (await request.json()) as { sourceTeamId?: string };
		await catalogFromPlatform().setTeamSource(ownerToken(cookies), {
			teamId: Number(params.teamId),
			sourceTeamId: String(sourceTeamId ?? '')
		});
		return json({ ok: true });
	} catch (error) {
		return endpointError(error);
	}
};
