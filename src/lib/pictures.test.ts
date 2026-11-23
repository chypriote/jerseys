import { describe, expect, it } from 'vitest';
import { kitHasMainPicture, mainPictureUrl } from './pictures';

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

describe('kitHasMainPicture', () => {
	const pictured = [{ teamId: 3, season: '2023-24', kitType: 'home' as const }];

	it('is true only for the Team, Season and Kit Type of a pictured Kit', () => {
		expect(kitHasMainPicture(pictured, { teamId: 3 }, ' 2023-24 ', 'home')).toBe(true);
		expect(kitHasMainPicture(pictured, { teamId: 3 }, '2023-24', 'away')).toBe(false);
		expect(kitHasMainPicture(pictured, { teamId: 3 }, '2022-23', 'home')).toBe(false);
		expect(kitHasMainPicture(pictured, { teamId: 4 }, '2023-24', 'home')).toBe(false);
	});

	it('is false for a new Team or no Team yet', () => {
		const lyon = { name: 'Lyon', kind: 'club' as const, countryId: 1 };
		expect(kitHasMainPicture(pictured, lyon, '2023-24', 'home')).toBe(false);
		expect(kitHasMainPicture(pictured, null, '2023-24', 'home')).toBe(false);
	});
});
