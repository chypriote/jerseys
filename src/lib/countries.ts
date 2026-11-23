import type { Continent, SeasonFormat } from './server/catalog/types';

/** Continents in GLOSSARY.md order, with their display names. */
export const continents: { value: Continent; label: string }[] = [
	{ value: 'europe', label: 'Europe' },
	{ value: 'asia-oceania', label: 'Asia & Oceania' },
	{ value: 'americas', label: 'Americas' },
	{ value: 'africa', label: 'Africa' }
];

export const seasonFormats: { value: SeasonFormat; label: string }[] = [
	{ value: 'split', label: 'Split' },
	{ value: 'calendar', label: 'Calendar' }
];
