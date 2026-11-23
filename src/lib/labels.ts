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
