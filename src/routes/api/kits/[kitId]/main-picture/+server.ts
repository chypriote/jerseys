import { json } from '@sveltejs/kit';
import { catalogFromPlatform } from '#lib/server/catalog';
import { ownerToken } from '#lib/server/owner';
import { endpointError } from '#lib/server/owner-actions';
import type { RequestHandler } from './$types';

/** Uses a TheSportsDB candidate (JSON { candidateId }) as the Main Picture of a Kit. */
export const POST: RequestHandler = async ({ params, request, cookies }) => {
	try {
		const { candidateId } = (await request.json()) as { candidateId?: string };
		await catalogFromPlatform().pickMainPicture(ownerToken(cookies), {
			kitId: Number(params.kitId),
			candidateId: String(candidateId ?? '')
		});
		return json({ ok: true });
	} catch (error) {
		return endpointError(error);
	}
};
