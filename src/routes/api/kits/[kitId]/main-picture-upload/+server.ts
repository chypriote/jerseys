import { json } from '@sveltejs/kit';
import { catalogFromPlatform } from '#lib/server/catalog';
import { ownerToken } from '#lib/server/owner';
import { endpointError } from '#lib/server/owner-actions';
import type { RequestHandler } from './$types';

/** Uses the image in the request body as the Main Picture of a Kit. The Catalog checks token, type and size. */
export const POST: RequestHandler = async ({ params, request, cookies }) => {
	try {
		await catalogFromPlatform().uploadMainPicture(ownerToken(cookies), {
			kitId: Number(params.kitId),
			body: await request.arrayBuffer(),
			contentType: request.headers.get('content-type') ?? ''
		});
		return json({ ok: true });
	} catch (error) {
		return endpointError(error);
	}
};
