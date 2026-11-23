import { describe, expect, it } from 'vitest';
import { removeBackground } from './background';

/** A width x height picture of `background` with a `shirt` square in the middle. */
function picture(
	background: [number, number, number],
	shirt: [number, number, number],
	size = 20,
	hole?: [number, number, number]
) {
	const data = new Uint8ClampedArray(size * size * 4);
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const inShirt = x >= 5 && x < 15 && y >= 5 && y < 15;
			const inHole = hole && x >= 8 && x < 12 && y >= 8 && y < 12;
			const [r, g, b] = inHole ? hole : inShirt ? shirt : background;
			data.set([r, g, b, 255], (y * size + x) * 4);
		}
	}
	return data;
}

const alphaAt = (data: Uint8ClampedArray, x: number, y: number, size = 20) =>
	data[(y * size + x) * 4 + 3];

describe('removeBackground', () => {
	it('makes a white background transparent and keeps the shirt', () => {
		const data = picture([255, 255, 255], [20, 20, 20]);
		expect(removeBackground(data, 20, 20)).toBe(true);
		expect(alphaAt(data, 0, 0)).toBe(0);
		expect(alphaAt(data, 19, 10)).toBe(0);
		expect(alphaAt(data, 10, 10)).toBe(255);
	});

	it('removes a light grey background', () => {
		const data = picture([218, 222, 222], [240, 220, 140]);
		expect(removeBackground(data, 20, 20)).toBe(true);
		expect(alphaAt(data, 0, 0)).toBe(0);
		expect(alphaAt(data, 10, 10)).toBe(255);
	});

	it('keeps a white part of the shirt that does not touch the edge', () => {
		const data = picture([255, 255, 255], [20, 20, 20], 20, [255, 255, 255]);
		removeBackground(data, 20, 20);
		expect(alphaAt(data, 10, 10)).toBe(255);
		expect(alphaAt(data, 0, 0)).toBe(0);
	});

	it('fades an anti-aliased edge', () => {
		const data = picture([255, 255, 255], [20, 20, 20]);
		data.set([230, 230, 230, 255], (10 * 20 + 4) * 4);
		removeBackground(data, 20, 20);
		const alpha = alphaAt(data, 4, 10);
		expect(alpha).toBeGreaterThan(0);
		expect(alpha).toBeLessThan(255);
	});

	it('removes a flat orange background and keeps a red shirt opaque', () => {
		const data = picture([255, 143, 57], [250, 101, 64], 20, [222, 32, 46]);
		expect(removeBackground(data, 20, 20)).toBe(true);
		expect(alphaAt(data, 0, 0)).toBe(0);
		expect(alphaAt(data, 5, 10)).toBe(255);
		expect(alphaAt(data, 10, 10)).toBe(255);
	});

	it('leaves a coloured background alone when the shirt touches the edge', () => {
		const data = picture([255, 143, 57], [250, 101, 64]);
		for (let y = 0; y < 20; y++)
			for (let x = 0; x < 8; x++) data.set([222, 32, 46, 255], (y * 20 + x) * 4);
		for (let y = 0; y < 20; y++) data.set([255, 143, 57, 255], (y * 20 + 0) * 4);
		expect(removeBackground(data, 20, 20)).toBe(false);
	});

	it('leaves an uneven one and a transparent one alone', () => {
		const uneven = picture([255, 255, 255], [20, 20, 20]);
		uneven.set([120, 120, 120, 255], 0);
		expect(removeBackground(uneven, 20, 20)).toBe(false);
		const done = picture([255, 255, 255], [20, 20, 20]);
		removeBackground(done, 20, 20);
		expect(removeBackground(done, 20, 20)).toBe(false);
	});

	it('leaves a picture that is nearly all background colour alone', () => {
		const data = picture([255, 255, 255], [250, 250, 250]);
		expect(removeBackground(data, 20, 20)).toBe(false);
		expect(alphaAt(data, 0, 0)).toBe(255);
	});
});
