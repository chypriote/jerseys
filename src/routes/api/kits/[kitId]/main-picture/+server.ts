import { json } from '@sveltejs/kit';
import { ownerEndpoint } from '#lib/server/owner-actions';
import type { RequestHandler } from './$types';

/** Uses a TheSportsDB candidate (JSON { candidateId }) as the Main Picture of a Kit. */
export const POST: RequestHandler = ({ params, request, cookies }) =>
	ownerEndpoint(cookies, async (catalog, token) => {
		const { candidateId } = (await request.json()) as { candidateId?: string };
		await catalog.pickMainPicture(token, {
			kitId: Number(params.kitId),
			candidateId: String(candidateId ?? '')
		});
		return json({ ok: true });
	});
