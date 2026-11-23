import { expect, it } from 'vitest';
import { jerseyCount } from './format-count';

it('counts jerseys', () => {
	expect(jerseyCount(undefined)).toBe('0 jerseys');
	expect(jerseyCount(1)).toBe('1 jersey');
	expect(jerseyCount(3)).toBe('3 jerseys');
});
