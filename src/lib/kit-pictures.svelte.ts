import type { Picture } from '#lib/server/catalog/types';
import { pictureUrl } from '#lib/pictures';

/**
 * The extra Picture URLs of the Kit that `kitId` returns, fetched when it changes. Call it while a
 * component initialises. `reload` fetches them again, after the Owner added some.
 */
export function kitPictures(kitId: () => number | null) {
	let urls = $state<string[]>([]);

	async function load(id: number) {
		try {
			const response = await fetch(`/api/kits/${id}/pictures`);
			const list: Picture[] = response.ok ? await response.json() : [];
			if (kitId() === id) urls = list.map(pictureUrl);
		} catch {
			// Offline: the Popup shows the Main Picture only.
		}
	}

	$effect(() => {
		const id = kitId();
		urls = [];
		if (id !== null) void load(id);
	});

	return {
		get urls() {
			return urls;
		},
		reload: async () => {
			const id = kitId();
			if (id !== null) await load(id);
		}
	};
}
