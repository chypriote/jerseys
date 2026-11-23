<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { mainPictureUrl, prepareImage } from '#lib/pictures';
	import type { KitView } from '#lib/server/catalog/types';
	import Button from './Button.svelte';

	let { kits }: { kits: KitView[] } = $props();

	let running = $state(false);
	let message = $state<string | null>(null);

	/**
	 * Removes the flat light background of every Main Picture, one after the other, in the browser.
	 * A picture already without one is left as it is, so the button can be pressed again.
	 */
	async function run() {
		running = true;
		message = null;
		const pictured = kits.filter((k) => k.mainPictureKey);
		let changed = 0;
		let failed = 0;
		try {
			for (const [index, kit] of pictured.entries()) {
				message = `${index + 1} of ${pictured.length}…`;
				try {
					const response = await fetch(mainPictureUrl(kit)!);
					if (!response.ok) throw new Error('read failed');
					const image = await prepareImage(await response.blob());
					if (!image.changed) continue;
					const saved = await fetch(`/api/kits/${kit.id}/main-picture-upload`, {
						method: 'POST',
						headers: { 'content-type': image.blob.type },
						body: image.blob
					});
					if (!saved.ok) throw new Error('save failed');
					changed++;
				} catch {
					failed++;
				}
			}
		} finally {
			running = false;
			await invalidateAll();
		}
		message = `${changed} changed of ${pictured.length}${failed ? `, ${failed} failed` : ''}.`;
	}
</script>

<div class="flex flex-wrap items-center gap-x-4 gap-y-2">
	<Button loading={running} onclick={run}>Remove picture backgrounds</Button>
	{#if message}
		<p class="text-sm text-muted-foreground" aria-live="polite">{message}</p>
	{/if}
</div>
