import type { SeasonFormat } from '#lib/server/catalog/types';

const label = (format: SeasonFormat, start: number) =>
	format === 'calendar' ? String(start) : `${start}-${String((start + 1) % 100).padStart(2, '0')}`;

/** Whether `text` is a Season of the format ("2025-26" for split, "2025" for calendar). */
export function fitsSeasonFormat(text: string, format: SeasonFormat) {
	if (format === 'calendar') return /^\d{4}$/.test(text);
	const match = /^(\d{4})-(\d{2})$/.exec(text);
	return !!match && (Number(match[1]) + 1) % 100 === Number(match[2]);
}

/**
 * The Seasons to choose from, newest first: the ones `used` by Kits, the current Season and the
 * next one, and `current` (the Season of the Kit being edited). A split Season starts in July.
 */
export function seasonChoices(format: SeasonFormat, now: Date, used: string[] = [], current = '') {
	const year = now.getFullYear();
	const start = format === 'calendar' ? year : now.getMonth() >= 6 ? year : year - 1;
	const seasons = new Set([label(format, start), label(format, start + 1)]);
	for (const text of [...used, current.trim()]) {
		if (fitsSeasonFormat(text, format)) seasons.add(text);
	}
	return [...seasons].sort().reverse();
}
