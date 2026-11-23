import { continents, seasonFormats } from '../../countries';
import { kitTypeLabels, versionLabels } from '../../labels';
import { KIT_TYPES, VERSIONS } from '../db/schema';
import type { CountryInput, JerseyInput, SeasonFormat } from './types';

/**
 * Input checks shared by the Catalog forms and the import. Form payloads are untrusted, so each
 * check answers the cleaned value or throws a readable error.
 */

export const compare = (a: string, b: string) =>
	a.localeCompare(b, undefined, { sensitivity: 'base' });

/** "2023-24" for a Split Season, "2024" for a Calendar Season. */
export function formatSeason(start: number, end: number | null) {
	return end === null ? String(start) : `${start}-${String(end % 100).padStart(2, '0')}`;
}

/** "A, B or C". */
const orList = (words: string[]) => `${words.slice(0, -1).join(', ')} or ${words.at(-1)}`;

export function required(value: string, what: string) {
	const cleaned = value.trim();
	if (!cleaned) throw new Error(`${what} is required`);
	return cleaned;
}

/** The cleaned Country and League fields. */
export function countryFields(input: CountryInput) {
	if (!continents.some((c) => c.value === input.continent))
		throw new Error(`Continent must be one of ${continents.map((c) => c.label).join(', ')}`);
	if (!seasonFormats.some((f) => f.value === input.seasonFormat))
		throw new Error('Season Format must be Season or Calendar');
	return {
		continent: input.continent,
		leagueName: required(input.leagueName ?? '', 'League name'),
		seasonFormat: input.seasonFormat
	};
}

const YEAR_OR_DATE = /^(\d{4})(?:-(\d{2})-(\d{2}))?$/;

/** `YYYY`, or a real calendar date `YYYY-MM-DD` (2024-02-31 is not one). */
function checkDate(value: unknown, what: string): string {
	const text = typeof value === 'string' ? value.trim() : '';
	const match = YEAR_OR_DATE.exec(text);
	if (match && match[2]) {
		const date = new Date(`${text}T00:00:00Z`);
		if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) {
			throw new Error(`${what} is not a real date`);
		}
	}
	if (!match) throw new Error(`${what} must be YYYY or YYYY-MM-DD`);
	return text;
}

const optionalDate = (value: unknown, what: string) =>
	typeof value === 'string' && value.trim() ? checkDate(value, what) : null;

export const cleanOrNull = (value: unknown) => (typeof value === 'string' && value.trim()) || null;

export function oneOf<T extends string>(value: unknown, allowed: readonly T[], message: string): T {
	if (!allowed.includes(value as T)) throw new Error(message);
	return value as T;
}

function nullableOneOf<T extends string>(value: unknown, allowed: readonly T[], message: string) {
	return value === null || value === undefined || value === ''
		? null
		: oneOf(value, allowed, message);
}

/** A Season as start and end year, checked against the Team's Season Format. */
export function parseSeason(value: unknown, format: SeasonFormat) {
	const text = typeof value === 'string' ? value.trim() : '';
	if (format === 'calendar') {
		if (/^\d{4}$/.test(text)) return { start: Number(text), end: null };
		throw new Error('Season must be one year, like 2024');
	}
	const match = /^(\d{4})-(\d{2})$/.exec(text);
	const start = Number(match?.[1]);
	if (match && (start + 1) % 100 === Number(match[2])) return { start, end: start + 1 };
	throw new Error('Season must be two years in a row, like 2024-25');
}

export const checkKitType = (value: unknown) =>
	oneOf(value, KIT_TYPES, `Kit Type must be ${orList(KIT_TYPES.map((t) => kitTypeLabels[t]))}`);

const versionNames = VERSIONS.map((v) => versionLabels[v]);

export const isCents = (value: unknown): value is number =>
	Number.isInteger(value) && (value as number) >= 0;

/** Version, Size, Fit and Print of a Jersey. */
export function checkCut(input: Pick<JerseyInput, 'version' | 'size' | 'fit' | 'print'>) {
	return {
		version: oneOf(input.version, VERSIONS, `Version must be ${orList(versionNames)}`),
		size: nullableOneOf(input.size, ['S', 'M', 'L'], 'Size must be S, M or L'),
		fit: nullableOneOf(
			input.fit,
			['too-small', 'good', 'too-big'],
			'Fit must be Too small, Good or Too big'
		),
		print: cleanOrNull(input.print)
	};
}

export const checkWishVersion = (value: unknown) =>
	nullableOneOf(value, VERSIONS, `Version must be ${orList(['Any', ...versionNames])}`);

/** The Purchase dates, from the form or the import. */
export const purchaseDates = (input: { bought: unknown; sent?: unknown; received?: unknown }) => ({
	acquisitionKind: 'purchase' as const,
	acquisitionDate: checkDate(input.bought, 'Bought date'),
	sentDate: optionalDate(input.sent, 'Sent date'),
	receivedDate: optionalDate(input.received, 'Received date'),
	giver: null
});

export const giftFields = (input: { date: unknown; giver?: unknown }) => ({
	acquisitionKind: 'gift' as const,
	acquisitionDate: checkDate(input.date, 'Gift date'),
	sentDate: null,
	receivedDate: null,
	storeId: null,
	priceCents: null,
	giver: cleanOrNull(input.giver)
});
