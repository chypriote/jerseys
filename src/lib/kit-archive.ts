import type { KitType } from './server/catalog/types';

/** Kit Types with a page of their own on Football Kit Archive. */
const ARCHIVE_TYPES: KitType[] = ['home', 'away', 'third', 'fourth'];

const slug = (...words: string[]) =>
	words
		.join(' ')
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

/**
 * "Hansa Rostock", "2023-24", "away" → the Football Kit Archive page of that Kit. A Kit Type it has
 * no page for (Cup, Special) links to the Team's page.
 */
export function kitArchiveUrl(team: string, season: string, kitType: KitType) {
	const base = 'https://www.footballkitarchive.com';
	return ARCHIVE_TYPES.includes(kitType)
		? `${base}/${slug(team, season, kitType)}-kit`
		: `${base}/${slug(team)}-kits/`;
}
