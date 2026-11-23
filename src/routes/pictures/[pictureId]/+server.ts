import { error } from '@sveltejs/kit';
import { catalogFromPlatform } from '#lib/server/catalog';
import type { RequestHandler } from './$types';

/** An extra Picture of a Kit. A Picture id never gets another image, so it can be cached long. */
export const GET: RequestHandler = async ({ params }) => {
	const picture = await catalogFromPlatform().getPicture(Number(params.pictureId));
	if (!picture) error(404, 'No picture');
	return new Response(picture.body, {
		headers: {
			'content-type': picture.contentType,
			'cache-control': 'public, max-age=604800'
		}
	});
};
