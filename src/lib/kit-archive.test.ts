import { describe, expect, it } from 'vitest';
import { kitArchiveUrl } from './kit-archive';

describe('kitArchiveUrl', () => {
	it('builds the page from Team, Season and Kit Type', () => {
		expect(kitArchiveUrl('Hansa Rostock', '2023-24', 'away')).toBe(
			'https://www.footballkitarchive.com/hansa-rostock-2023-24-away-kit'
		);
	});

	it('drops accents and punctuation', () => {
		expect(kitArchiveUrl('Beşiktaş J.K.', '2024-25', 'home')).toBe(
			'https://www.footballkitarchive.com/besiktas-j-k-2024-25-home-kit'
		);
	});

	it('has no page for a Cup or Special Kit', () => {
		expect(kitArchiveUrl('Lyon', '2023-24', 'cup')).toBeNull();
		expect(kitArchiveUrl('Lyon', '2023-24', 'special')).toBeNull();
	});
});
