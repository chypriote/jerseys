import { describe, expect, it } from 'vitest';
import { centsToEuros, eurosToCents } from './money';

describe('money', () => {
	it('converts euros to cents', () => {
		expect(eurosToCents('12.50')).toBe(1250);
		expect(eurosToCents('12,5')).toBe(1250);
		expect(eurosToCents('19.99')).toBe(1999);
		expect(eurosToCents('0')).toBe(0);
	});
	it('rejects what is not a price', () => {
		expect(eurosToCents('')).toBeNull();
		expect(eurosToCents('abc')).toBeNull();
		expect(eurosToCents('-3')).toBeNull();
		expect(eurosToCents('1.234')).toBeNull();
	});
	it('converts cents to an input value', () => {
		expect(centsToEuros(1250)).toBe('12.50');
	});
});
