import { json } from '@sveltejs/kit';
import { catalogFromPlatform } from '#lib/server/catalog';
import { ownerEndpoint } from '#lib/server/owner-actions';
import type { RequestHandler } from './$types';

/** The extra Pictures of a Kit, in the order they were added. */
export const GET: RequestHandler = async ({ params }) =>
	json(await catalogFromPlatform().listPictures(Number(params.kitId)));

/** Adds the image in the request body as the Kit's next Picture. The Catalog checks token, type and size. */
export const POST: RequestHandler = ({ params, request, cookies }) =>
	ownerEndpoint(cookies, async (catalog, token) => {
		const picture = await catalog.addPicture(token, {
			kitId: Number(params.kitId),
			body: await request.arrayBuffer(),
			contentType: request.headers.get('content-type') ?? ''
		});
		return json(picture);
	});
