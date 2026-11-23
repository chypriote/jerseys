import { describe, expect, it } from 'vitest';
import { fitsSeasonFormat, seasonChoices } from './seasons';

describe('seasonChoices', () => {
	it('lists split Seasons newest first, up to the next one', () => {
		const seasons = seasonChoices('split', new Date('2026-11-23'));
		expect(seasons.slice(0, 3)).toEqual(['2027-28', '2026-27', '2025-26']);
		expect(seasons.at(-1)).toBe('1960-61');
	});

	it('starts a split Season in July', () => {
		expect(seasonChoices('split', new Date('2027-03-01'))[0]).toBe('2027-28');
		expect(seasonChoices('split', new Date('2027-03-01'))[1]).toBe('2026-27');
		expect(seasonChoices('split', new Date('2027-07-01'))[0]).toBe('2028-29');
	});

	it('lists calendar years newest first, up to next year', () => {
		const seasons = seasonChoices('calendar', new Date('2026-11-23'));
		expect(seasons.slice(0, 2)).toEqual(['2027', '2026']);
		expect(seasons.at(-1)).toBe('1960');
	});

	it('keeps a current value outside the range, in order', () => {
		const seasons = seasonChoices('split', new Date('2026-11-23'), '1955-56');
		expect(seasons.at(-1)).toBe('1955-56');
		expect(seasonChoices('split', new Date('2026-11-23'), '2024')).not.toContain('2024');
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
