<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { checkedPictures, cleanMainPicture, rememberChecked } from '#lib/clean-pictures';
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
		const checked = checkedPictures();
		let changed = 0;
		let failed = 0;
		try {
			for (const [index, kit] of pictured.entries()) {
				message = `${index + 1} of ${pictured.length}…`;
				try {
					const done = await cleanMainPicture(kit);
					checked.add(`${kit.id}:${kit.mainPictureVersion + (done ? 1 : 0)}`);
					if (done) changed++;
				} catch {
					failed++;
				}
			}
		} finally {
			rememberChecked(checked);
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
