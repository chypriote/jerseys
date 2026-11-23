import { ownerEndpoint } from '#lib/server/owner-actions';
import type { RequestHandler } from './$types';

/** The image at `?url`, fetched by the server: the browser cannot read other sites' images. Owner only. */
export const GET: RequestHandler = ({ url, cookies }) =>
	ownerEndpoint(cookies, async (catalog, token) => {
		const image = await catalog.fetchPicture(token, url.searchParams.get('url') ?? '');
		return new Response(image.body, { headers: { 'content-type': image.contentType } });
	});
