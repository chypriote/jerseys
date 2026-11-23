import type { Fit, KitType, Version } from './server/catalog/types';

/** Display names of the stored enum values (GLOSSARY.md). */
export const kitTypeLabels: Record<KitType, string> = {
	home: 'Home',
	away: 'Away',
	third: 'Third',
	fourth: 'Fourth',
	cup: 'Cup',
	special: 'Special'
};

/** "Lyon 2023-24 Home": a Kit as its Team, Season and Kit Type. */
export const kitLabel = (team: string, season: string, kitType: KitType) =>
	`${team} ${season} ${kitTypeLabels[kitType]}`;

export const versionLabels: Record<Version, string> = {
	fan: 'Fan',
	player: 'Player',
	tracksuit: 'Tracksuit'
};

export const fitLabels: Record<Fit, string> = {
	'too-small': 'Too small',
	good: 'Good',
	'too-big': 'Too big'
};

/** Select and ToggleGroup options from a labels record, in its order. */
export const labelOptions = <T extends string>(labels: Record<T, string>) =>
	(Object.entries(labels) as [T, string][]).map(([value, label]) => ({ value, label }));
