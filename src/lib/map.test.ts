import { describe, expect, it } from 'vitest';
import { mapCountries, mapCountryNamed } from './map';

describe('map', () => {
	it('names every shape once', () => {
		const names = mapCountries.map((c) => c.name);
		expect(names.every((n) => n.length > 0)).toBe(true);
		expect(new Set(names).size).toBe(names.length);
	});

	it('finds Countries outside the mockup list', () => {
		expect(mapCountryNamed('Nigeria')?.name).toBe('Nigeria');
		expect(mapCountryNamed('peru')?.name).toBe('Peru');
		expect(mapCountryNamed('Ivory Coast')?.name).toBe("Côte d'Ivoire");
	});

	it('keeps the four UK nations, Hong Kong and the aliases', () => {
		for (const name of ['England', 'Scotland', 'Wales', 'Northern Ireland', 'Hong Kong'])
			expect(mapCountryNamed(name)?.name).toBe(name);
		expect(mapCountryNamed('United Kingdom')).toBeUndefined();
		expect(mapCountryNamed('USA')?.name).toBe('United States');
		expect(mapCountryNamed('Türkiye')?.name).toBe('Turkey');
		expect(mapCountryNamed('Bosnia and Herzegovina')?.name).toBe('Bosnia & Herzegovina');
	});
});
