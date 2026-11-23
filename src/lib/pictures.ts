import type { KitKey, KitType, TeamChoice } from '#lib/server/catalog/types';

/** The URL of a Kit Main Picture on the `/pictures/main` route, or null for no Main Picture. The version busts the cache. */
export function mainPictureUrl(kit: {
	id: number;
	mainPictureKey: string | null;
	mainPictureVersion: number;
}) {
	return kit.mainPictureKey ? `/pictures/main/${kit.id}?v=${kit.mainPictureVersion}` : null;
}

/** Whether the Kit of these form fields exists and has a Main Picture. A new Team has no Kit yet. */
export function kitHasMainPicture(
	pictured: KitKey[],
	team: TeamChoice | null,
	season: string,
	kitType: KitType
) {
	if (!team || !('teamId' in team)) return false;
	const text = season.trim();
	return pictured.some(
		(k) => k.teamId === team.teamId && k.season === text && k.kitType === kitType
	);
}

/** Scales the image down to 1000 px on its long side and re-encodes it as JPEG (browser only). */
export async function shrinkImage(file: Blob): Promise<Blob> {
	const bitmap = await createImageBitmap(file);
	const scale = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height));
	const canvas = document.createElement('canvas');
	canvas.width = Math.round(bitmap.width * scale);
	canvas.height = Math.round(bitmap.height * scale);
	canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
	bitmap.close();
	const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, 'image/jpeg', 0.85));
	if (!blob) throw new Error('shrink failed');
	return blob;
}
