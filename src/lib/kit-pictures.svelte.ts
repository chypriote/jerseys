import type { Picture } from '#lib/server/catalog/types';
import { pictureUrl } from '#lib/pictures';

/**
 * The extra Picture URLs of the Kit that `kitId` returns, fetched when it changes. Call it while a
 * component initialises. `reload` fetches them again, after the Owner added some. `delete`
 * deletes one (Owner) and answers an error message, or null.
 */
export function kitPictures(kitId: () => number | null) {
	let list = $state<Picture[]>([]);
	const urls = $derived(list.map(pictureUrl));

	async function load(id: number) {
		try {
			const response = await fetch(`/api/kits/${id}/pictures`);
			const found: Picture[] = response.ok ? await response.json() : [];
			if (kitId() === id) list = found;
		} catch {
			// Offline: the Popup shows the Main Picture only.
		}
	}

	$effect(() => {
		const id = kitId();
		list = [];
		if (id !== null) void load(id);
	});

	return {
		get urls() {
			return urls;
		},
		reload: async () => {
			const id = kitId();
			if (id !== null) await load(id);
		},
		/** `index` is the Picture's place in `urls`. */
		delete: async (index: number) => {
			const picture = list[index];
			if (!picture) return null;
			try {
				const response = await fetch(pictureUrl(picture), { method: 'DELETE' });
				if (!response.ok) {
					const answer = (await response.json().catch(() => ({}))) as { error?: string };
					return answer.error ?? 'Could not delete the picture';
				}
			} catch {
				return 'Network error';
			}
			list = list.filter((p) => p.id !== picture.id);
			return null;
		}
	};
}
