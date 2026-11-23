import { json } from '@sveltejs/kit';
import { ownerEndpoint } from '#lib/server/owner-actions';
import type { RequestHandler } from './$types';

/** Uses the image in the request body as the Main Picture of a Kit. The Catalog checks token, type and size. */
export const POST: RequestHandler = ({ params, request, cookies }) =>
	ownerEndpoint(cookies, async (catalog, token) => {
		await catalog.uploadMainPicture(token, {
			kitId: Number(params.kitId),
			body: await request.arrayBuffer(),
			contentType: request.headers.get('content-type') ?? ''
		});
		return json({ ok: true });
	});
