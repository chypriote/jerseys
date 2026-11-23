import type { KitType } from './server/catalog/types';

/** Kit Types with a page on Football Kit Archive. */
const ARCHIVE_TYPES: KitType[] = ['home', 'away', 'third', 'fourth'];

/** "Hansa Rostock", "2023-24", "away" → the Football Kit Archive page of that Kit, or null for a Kit Type it has none for. */
export function kitArchiveUrl(team: string, season: string, kitType: KitType) {
	if (!ARCHIVE_TYPES.includes(kitType)) return null;
	const slug = [team, season, kitType]
		.join(' ')
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
	return `https://www.footballkitarchive.com/${slug}-kit`;
}
