import { json } from '@sveltejs/kit';
import { catalogFromPlatform } from '#lib/server/catalog';
import { ownerToken } from '#lib/server/owner';
import { endpointError } from '#lib/server/owner-actions';
import type { RequestHandler } from './$types';

/** The extra Pictures of a Kit, in the order they were added. */
export const GET: RequestHandler = async ({ params }) =>
	json(await catalogFromPlatform().listPictures(Number(params.kitId)));

/** Adds the image in the request body as the Kit's next Picture. The Catalog checks token, type and size. */
export const POST: RequestHandler = async ({ params, request, cookies }) => {
	try {
		const picture = await catalogFromPlatform().addPicture(ownerToken(cookies), {
			kitId: Number(params.kitId),
			body: await request.arrayBuffer(),
			contentType: request.headers.get('content-type') ?? ''
		});
		return json(picture);
	} catch (error) {
		return endpointError(error);
	}
};
