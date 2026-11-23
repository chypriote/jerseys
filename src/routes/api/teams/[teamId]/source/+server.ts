import { json } from '@sveltejs/kit';
import { ownerEndpoint } from '#lib/server/owner-actions';
import type { RequestHandler } from './$types';

/** Replaces the TheSportsDB Team (JSON { sourceTeamId }) of a Team. */
export const POST: RequestHandler = ({ params, request, cookies }) =>
	ownerEndpoint(cookies, async (catalog, token) => {
		const { sourceTeamId } = (await request.json()) as { sourceTeamId?: string };
		await catalog.setTeamSource(token, {
			teamId: Number(params.teamId),
			sourceTeamId: String(sourceTeamId ?? '')
		});
		return json({ ok: true });
	});
