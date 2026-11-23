import { describe, expect, it } from 'vitest';
import { printNumber } from './print-number';

describe('printNumber', () => {
	it('returns the trailing digits of the Print, in any script', () => {
		expect(printNumber('NICOLAS 4')).toBe('4');
		expect(printNumber('尼古拉斯 4')).toBe('4');
		expect(printNumber('ニコラス 10')).toBe('10');
		expect(printNumber('10')).toBe('10');
	});

	it('returns null without a number at the end', () => {
		expect(printNumber(null)).toBeNull();
		expect(printNumber(undefined)).toBeNull();
		expect(printNumber('')).toBeNull();
		expect(printNumber('NICOLAS')).toBeNull();
		expect(printNumber('4 NICOLAS')).toBeNull();
	});
});
