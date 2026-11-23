import { describe, expect, it } from 'vitest';
import { coverUrl } from './covers';

describe('coverUrl', () => {
	it('points at the Cover route with the Cover version, so a new Cover gets a new URL', () => {
		expect(coverUrl({ id: 7, coverKey: 'covers/7', coverVersion: 1 })).toBe('/covers/7?v=1');
		expect(coverUrl({ id: 7, coverKey: 'covers/7', coverVersion: 2 })).toBe('/covers/7?v=2');
	});

	it('is null for a Kit with no Cover', () => {
		expect(coverUrl({ id: 7, coverKey: null, coverVersion: 0 })).toBeNull();
	});
});
