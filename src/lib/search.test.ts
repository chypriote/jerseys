import { describe, expect, it } from 'vitest';
import { matchesSearch } from './search';

describe('matchesSearch', () => {
	it('matches every word in any field, ignoring case', () => {
		expect(matchesSearch('lyon 2023', 'Olympique Lyonnais', '2023-24')).toBe(true);
		expect(matchesSearch('LYON', 'Lyon')).toBe(true);
		expect(matchesSearch('lyon 2022', 'Lyon', '2023-24')).toBe(false);
	});

	it('matches everything for an empty search', () => {
		expect(matchesSearch('  ', 'Lyon')).toBe(true);
	});
});
