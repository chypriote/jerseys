import { json } from '@sveltejs/kit';
import { catalogFromPlatform } from '#lib/server/catalog';
import { ownerToken } from '#lib/server/owner';
import { endpointError } from '#lib/server/owner-actions';
import type { RequestHandler } from './$types';

/** Fetches the image at `url` and uses it as the Cover of a Kit. The Catalog checks token, type and size. */
export const POST: RequestHandler = async ({ params, request, cookies }) => {
	try {
		const { url } = (await request.json()) as { url?: string };
		await catalogFromPlatform().uploadCoverFromUrl(ownerToken(cookies), {
			kitId: Number(params.kitId),
			url: String(url ?? '')
		});
		return json({ ok: true });
	} catch (error) {
		return endpointError(error);
	}
};
