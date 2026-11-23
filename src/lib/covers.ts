/** The URL of a Kit Cover on the `/covers` route, or null for no Cover. The version busts the cache. */
export function coverUrl(kit: { id: number; coverKey: string | null; coverVersion: number }) {
	return kit.coverKey ? `/covers/${kit.id}?v=${kit.coverVersion}` : null;
}
