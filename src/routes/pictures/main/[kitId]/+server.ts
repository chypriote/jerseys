import { error } from '@sveltejs/kit';
import { catalogFromPlatform } from '#lib/server/catalog';
import type { RequestHandler } from './$types';

/** The Main Picture of a Kit. Pages link it with the Main Picture version (`mainPictureUrl`), so it can be cached long. */
export const GET: RequestHandler = async ({ params }) => {
	const picture = await catalogFromPlatform().getMainPicture(Number(params.kitId));
	if (!picture) error(404, 'No main picture');
	return new Response(picture.body, {
		headers: {
			'content-type': picture.contentType,
			'cache-control': 'public, max-age=604800'
		}
	});
};
