<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import {
		checkedPictures,
		checkKey,
		cleanMainPicture,
		rememberChecked
	} from '#lib/clean-pictures';

	/** Owner only: removes the background of the Main Pictures that came in through the server. */
	let {
		kits
	}: { kits: { id: number; mainPictureKey: string | null; mainPictureVersion: number }[] } =
		$props();

	let running = false;

	async function clean(list: typeof kits) {
		if (running) return;
		const checked = checkedPictures();
		const todo = list.filter((k) => k.mainPictureKey && !checked.has(checkKey(k)));
		if (todo.length === 0) return;
		running = true;
		let changed = false;
		try {
			for (const kit of todo) {
				try {
					const done = await cleanMainPicture(kit);
					// A save is a new version: the new picture is clean.
					checked.add(`${kit.id}:${kit.mainPictureVersion + (done ? 1 : 0)}`);
					changed ||= done;
				} catch {
					// Tried again on the next visit.
				}
			}
		} finally {
			rememberChecked(checked);
			running = false;
		}
		if (changed) await invalidateAll();
	}

	$effect(() => {
		void clean(kits);
	});
</script>
