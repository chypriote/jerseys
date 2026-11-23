import type { SeasonFormat } from '#lib/server/catalog/types';

/** The oldest start year offered: retro Kits stay selectable. */
const FIRST_YEAR = 1960;

const label = (format: SeasonFormat, start: number) =>
	format === 'calendar' ? String(start) : `${start}-${String((start + 1) % 100).padStart(2, '0')}`;

/** Whether `text` is a Season of the format ("2025-26" for split, "2025" for calendar). */
export function fitsSeasonFormat(text: string, format: SeasonFormat) {
	if (format === 'calendar') return /^\d{4}$/.test(text);
	const match = /^(\d{4})-(\d{2})$/.exec(text);
	return !!match && (Number(match[1]) + 1) % 100 === Number(match[2]);
}

/**
 * The Seasons to choose from, newest first: from the next one down to 1960. A Season split runs
 * from July, so before July the latest started last year. `current` stays in the list even when
 * it is outside the range.
 */
export function seasonChoices(format: SeasonFormat, now: Date, current = '') {
	const year = now.getFullYear();
	const latest = format === 'calendar' ? year + 1 : (now.getMonth() >= 6 ? year : year - 1) + 1;
	const seasons: string[] = [];
	for (let start = latest; start >= FIRST_YEAR; start--) seasons.push(label(format, start));
	const text = current.trim();
	if (text && fitsSeasonFormat(text, format) && !seasons.includes(text)) {
		seasons.push(text);
		seasons.sort().reverse();
	}
	return seasons;
}
