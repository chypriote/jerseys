/** The URL of a Kit Main Picture on the `/pictures/main` route, or null for no Main Picture. The version busts the cache. */
export function mainPictureUrl(kit: {
	id: number;
	mainPictureKey: string | null;
	mainPictureVersion: number;
}) {
	return kit.mainPictureKey ? `/pictures/main/${kit.id}?v=${kit.mainPictureVersion}` : null;
}
