<script lang="ts">
	import { kitTypeText } from '#lib/labels';
	import { mainPictureUrl } from '#lib/pictures';
	import type { KitType, KitView } from '#lib/server/catalog/types';
	import MainPicture from './MainPicture.svelte';

	let {
		kits,
		season = $bindable(),
		kitType = $bindable(),
		comment = $bindable('')
	}: {
		/** The Kits of the chosen Team. */
		kits: KitView[];
		season: string;
		kitType: KitType;
		comment?: string;
	} = $props();

	const isPicked = (kit: KitView) => kit.season === season.trim() && kit.kitType === kitType;

	function pick(kit: KitView) {
		season = kit.season;
		kitType = kit.kitType;
		comment = kit.comment ?? '';
	}
</script>

<div class="flex flex-col gap-1.5">
	<span class="text-sm font-bold">Existing kits</span>
	<div class="flex flex-wrap gap-2" role="group" aria-label="Existing kits">
		{#each kits as kit (kit.id)}
			<button
				type="button"
				class="relative flex min-h-11 cursor-pointer items-center gap-2 rounded-control bg-card py-1 ps-1 pe-4 text-sm font-extrabold shadow-(--shadow-raised) outline-ring focus-visible:outline-3 focus-visible:outline-solid aria-pressed:outline-3 aria-pressed:outline-solid"
				aria-pressed={isPicked(kit)}
				onclick={() => pick(kit)}
			>
				<span
					class="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-background"
				>
					<MainPicture url={mainPictureUrl(kit)} />
				</span>
				{kit.season} · {kitTypeText(kit)}
			</button>
		{/each}
	</div>
</div>
