/** How far (RGB distance) a pixel may be from the background colour and still be background. */
const SOLID = 26;
/** Beyond SOLID and up to this distance, a pixel next to the background fades out (anti-aliased edge). */
const FADE = 70;
/** A Kit picture is left alone when more than this share of it would go: the shirt is the background colour. */
const MAX_REMOVED = 0.85;
/** The four corners must agree on one colour, or the background is not a flat one. */
const CORNER_AGREEMENT = 40;
/** Only light backgrounds are removed. */
const MIN_BRIGHTNESS = 170;

const distance = (data: Uint8ClampedArray, i: number, r: number, g: number, b: number) =>
	Math.hypot(data[i] - r, data[i + 1] - g, data[i + 2] - b);

/**
 * Makes the flat light background of a Kit picture transparent, in place. The background is the
 * colour of the corners, flood-filled inward from the edges, so a white part of the shirt that does
 * not touch the edge stays. Answers whether the picture changed. A picture with no flat light
 * background, one that already has transparency, or one that is mostly background colour is left
 * as it is.
 */
export function removeBackground(data: Uint8ClampedArray, width: number, height: number) {
	const at = (x: number, y: number) => (y * width + x) * 4;
	const corners = [at(0, 0), at(width - 1, 0), at(0, height - 1), at(width - 1, height - 1)];
	if (corners.some((i) => data[i + 3] < 255)) return false;
	const [r, g, b] = [0, 1, 2].map((c) => corners.reduce((sum, i) => sum + data[i + c], 0) / 4);
	if (corners.some((i) => distance(data, i, r, g, b) > CORNER_AGREEMENT)) return false;
	if ((r + g + b) / 3 < MIN_BRIGHTNESS) return false;

	const total = width * height;
	const removed = new Uint8Array(total);
	const stack: number[] = [];
	const visit = (x: number, y: number) => {
		const pixel = y * width + x;
		if (removed[pixel] || distance(data, pixel * 4, r, g, b) > SOLID) return;
		removed[pixel] = 1;
		stack.push(pixel);
	};
	for (let x = 0; x < width; x++) {
		visit(x, 0);
		visit(x, height - 1);
	}
	for (let y = 0; y < height; y++) {
		visit(0, y);
		visit(width - 1, y);
	}
	let count = 0;
	for (let pixel = stack.pop(); pixel !== undefined; pixel = stack.pop()) {
		count++;
		const x = pixel % width;
		const y = (pixel - x) / width;
		if (x > 0) visit(x - 1, y);
		if (x < width - 1) visit(x + 1, y);
		if (y > 0) visit(x, y - 1);
		if (y < height - 1) visit(x, y + 1);
	}
	if (count === 0 || count / total > MAX_REMOVED) return false;

	// The fade pass reads `removed`, so it collects first and writes after.
	const faded: [number, number][] = [];
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const pixel = y * width + x;
			if (removed[pixel]) continue;
			const touches =
				(x > 0 && removed[pixel - 1]) ||
				(x < width - 1 && removed[pixel + 1]) ||
				(y > 0 && removed[pixel - width]) ||
				(y < height - 1 && removed[pixel + width]);
			if (!touches) continue;
			const d = distance(data, pixel * 4, r, g, b);
			if (d < FADE) faded.push([pixel, Math.round(((d - SOLID) / (FADE - SOLID)) * 255)]);
		}
	}
	for (let pixel = 0; pixel < total; pixel++) if (removed[pixel]) data[pixel * 4 + 3] = 0;
	for (const [pixel, alpha] of faded) data[pixel * 4 + 3] = Math.max(0, Math.min(255, alpha));
	return true;
}
