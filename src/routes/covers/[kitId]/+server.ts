import { error } from '@sveltejs/kit';
import { catalogFromPlatform } from '#lib/server/catalog';
import type { RequestHandler } from './$types';

/** The Cover of a Kit. Pages link it with the Cover version (`coverUrl`), so it can be cached long. */
export const GET: RequestHandler = async ({ params }) => {
	const cover = await catalogFromPlatform().getCover(Number(params.kitId));
	if (!cover) error(404, 'No cover');
	return new Response(cover.body, {
		headers: {
			'content-type': cover.contentType,
			'cache-control': 'public, max-age=604800'
		}
	});
};
