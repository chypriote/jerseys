import { describe, expect, it } from 'vitest';
import { fitsSeasonFormat, seasonChoices } from './seasons';

describe('seasonChoices', () => {
	const now = new Date('2026-11-23');

	it('offers the current and the next Season, newest first', () => {
		expect(seasonChoices('split', now)).toEqual(['2027-28', '2026-27']);
		expect(seasonChoices('calendar', now)).toEqual(['2027', '2026']);
	});

	it('starts a split Season in July', () => {
		expect(seasonChoices('split', new Date('2027-03-01'))).toEqual(['2027-28', '2026-27']);
		expect(seasonChoices('split', new Date('2027-07-01'))).toEqual(['2028-29', '2027-28']);
	});

	it('adds the Seasons Kits have, once, in the format only', () => {
		expect(
			seasonChoices('split', now, ['2019-20', '2026-27', '2019-20', '2024', '2021-22'])
		).toEqual(['2027-28', '2026-27', '2021-22', '2019-20']);
		expect(seasonChoices('calendar', now, ['2022', '2019-20'])).toEqual(['2027', '2026', '2022']);
	});

	it('keeps the Season of the Kit being edited', () => {
		expect(seasonChoices('split', now, [], '1998-99')).toEqual(['2027-28', '2026-27', '1998-99']);
		expect(seasonChoices('split', now, [], '1998')).toEqual(['2027-28', '2026-27']);
	});
});

describe('fitsSeasonFormat', () => {
	it('checks the shape of a Season', () => {
		expect(fitsSeasonFormat('2025-26', 'split')).toBe(true);
		expect(fitsSeasonFormat('2025-27', 'split')).toBe(false);
		expect(fitsSeasonFormat('2025', 'split')).toBe(false);
		expect(fitsSeasonFormat('2025', 'calendar')).toBe(true);
		expect(fitsSeasonFormat('2025-26', 'calendar')).toBe(false);
	});
});
