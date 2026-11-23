import { json } from '@sveltejs/kit';
import { ownerEndpoint } from '#lib/server/owner-actions';
import type { RequestHandler } from './$types';

/** Fetches the image at `url` and uses it as the Main Picture of a Kit. The Catalog checks token, type and size. */
export const POST: RequestHandler = ({ params, request, cookies }) =>
	ownerEndpoint(cookies, async (catalog, token) => {
		const { url } = (await request.json()) as { url?: string };
		await catalog.uploadMainPictureFromUrl(token, {
			kitId: Number(params.kitId),
			url: String(url ?? '')
		});
		return json({ ok: true });
	});
