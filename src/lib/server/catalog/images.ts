/** Cover image rules, the same for uploads, pasted addresses and lookup candidates. */
export const UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
/** Images must be under this size. */
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

/** Throws a readable error for an image of another type, empty, or of 2 MB or more. */
export function checkImage(body: ArrayBuffer, contentType: string) {
	if (!UPLOAD_TYPES.includes(contentType)) throw new Error('Use a JPEG, PNG or WebP image');
	if (body.byteLength === 0 || body.byteLength >= MAX_UPLOAD_BYTES) {
		throw new Error('The image must be under 2 MB');
	}
}

/** The body of a response, or null once it passes `max` bytes: the read stops there. */
export async function readBody(response: Response, max: number): Promise<Uint8Array | null> {
	if (!response.body) return new Uint8Array();
	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		size += value.byteLength;
		if (size > max) {
			await reader.cancel();
			return null;
		}
		chunks.push(value);
	}
	return new Uint8Array(await new Blob(chunks as BlobPart[]).arrayBuffer());
}
