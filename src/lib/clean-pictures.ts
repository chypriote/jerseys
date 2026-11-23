import { mainPictureUrl, prepareImage } from './pictures';

type PicturedKit = { id: number; mainPictureKey: string | null; mainPictureVersion: number };

/**
 * Removes the flat light background of the Kit's Main Picture and saves it as the Main Picture
 * again (browser only). Answers whether the picture changed. Throws when it cannot read or save.
 */
export async function cleanMainPicture(kit: PicturedKit) {
	const url = mainPictureUrl(kit);
	if (!url) return false;
	const response = await fetch(url);
	if (!response.ok) throw new Error('read failed');
	const image = await prepareImage(await response.blob());
	if (!image.changed) return false;
	const saved = await fetch(`/api/kits/${kit.id}/main-picture-upload`, {
		method: 'POST',
		headers: { 'content-type': image.blob.type },
		body: image.blob
	});
	if (!saved.ok) throw new Error('save failed');
	return true;
}

const CHECKED = 'checkedMainPictures';

/** The "{kit id}:{version}" of the Main Pictures this browser has already cleaned or found clean. */
export function checkedPictures(): Set<string> {
	try {
		return new Set(JSON.parse(localStorage.getItem(CHECKED) ?? '[]') as string[]);
	} catch {
		return new Set();
	}
}

export function rememberChecked(checked: Set<string>) {
	try {
		localStorage.setItem(CHECKED, JSON.stringify([...checked]));
	} catch {
		// Without storage the pictures are checked again on the next visit.
	}
}

export const checkKey = (kit: PicturedKit) => `${kit.id}:${kit.mainPictureVersion}`;
