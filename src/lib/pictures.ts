import { removeBackground } from './background';
import type { KitKey, KitType, TeamChoice } from '#lib/server/catalog/types';

/** The URL of a Kit Main Picture on the `/pictures/main` route, or null for no Main Picture. The version busts the cache. */
export function mainPictureUrl(kit: {
	id: number;
	mainPictureKey: string | null;
	mainPictureVersion: number;
}) {
	return kit.mainPictureKey ? `/pictures/main/${kit.id}?v=${kit.mainPictureVersion}` : null;
}

/** The URL of an extra Picture of a Kit, on the `/pictures` route. */
export const pictureUrl = (picture: { id: number }) => `/pictures/${picture.id}`;

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

/**
 * Scales the image down to 1000 px on its long side and removes a flat background (browser
 * only). The result is a WebP (PNG where the browser cannot write WebP) when the background went,
 * a JPEG otherwise. `changed` tells whether the background was removed.
 */
export async function shrinkImage(file: Blob): Promise<Blob> {
	return (await prepareImage(file)).blob;
}

/** Like `shrinkImage`, and also says whether the background was removed. */
export async function prepareImage(file: Blob): Promise<{ blob: Blob; changed: boolean }> {
	const bitmap = await createImageBitmap(file);
	const scale = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height));
	const canvas = document.createElement('canvas');
	canvas.width = Math.round(bitmap.width * scale);
	canvas.height = Math.round(bitmap.height * scale);
	const context = canvas.getContext('2d', { willReadFrequently: true })!;
	context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
	bitmap.close();
	const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
	const changed = removeBackground(pixels.data, canvas.width, canvas.height);
	if (changed) context.putImageData(pixels, 0, 0);
	const blob = await new Promise<Blob | null>((done) =>
		changed ? canvas.toBlob(done, 'image/webp', 0.9) : canvas.toBlob(done, 'image/jpeg', 0.85)
	);
	if (!blob) throw new Error('shrink failed');
	return { blob, changed };
}
