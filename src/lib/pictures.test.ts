import { describe, expect, it } from 'vitest';
import { mainPictureUrl } from './pictures';

describe('mainPictureUrl', () => {
	it('points at the Main Picture route with the Main Picture version, so a new Main Picture gets a new URL', () => {
		expect(
			mainPictureUrl({ id: 7, mainPictureKey: 'main-pictures/7', mainPictureVersion: 1 })
		).toBe('/pictures/main/7?v=1');
		expect(
			mainPictureUrl({ id: 7, mainPictureKey: 'main-pictures/7', mainPictureVersion: 2 })
		).toBe('/pictures/main/7?v=2');
	});

	it('is null for a Kit with no Main Picture', () => {
		expect(mainPictureUrl({ id: 7, mainPictureKey: null, mainPictureVersion: 0 })).toBeNull();
	});
});
