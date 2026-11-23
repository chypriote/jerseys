import { json } from '@sveltejs/kit';
import { ownerEndpoint } from '#lib/server/owner-actions';
import type { RequestHandler } from './$types';

/** Fetches the image at `url` and adds it as the Kit's next Picture. The Catalog checks token, type and size. */
export const POST: RequestHandler = ({ params, request, cookies }) =>
	ownerEndpoint(cookies, async (catalog, token) => {
		const { url } = (await request.json()) as { url?: string };
		const picture = await catalog.addPictureFromUrl(token, {
			kitId: Number(params.kitId),
			url: String(url ?? '')
		});
		return json(picture);
	});
