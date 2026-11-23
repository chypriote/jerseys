import { error } from '@sveltejs/kit';
import { catalogFromPlatform } from '#lib/server/catalog';
import { ownerToken } from '#lib/server/owner';
import { endpointError } from '#lib/server/owner-actions';
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

/** Owner: deletes the Picture and its image. */
export const DELETE: RequestHandler = async ({ params, cookies }) => {
	try {
		await catalogFromPlatform().deletePicture(ownerToken(cookies), Number(params.pictureId));
		return new Response(null, { status: 204 });
	} catch (error) {
		return endpointError(error);
	}
};
