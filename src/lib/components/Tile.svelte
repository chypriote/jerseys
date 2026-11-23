<script lang="ts">
	import type { Desire } from '#lib/server/catalog/types';
	import DesireDots from './DesireDots.svelte';
	import MainPicture from './MainPicture.svelte';

	let {
		team,
		season,
		kitType,
		mainPictureUrl = null,
		desire,
		onSelect
	}: {
		team: string;
		/** Already formatted ("2023-24", "2024"). */
		season: string;
		kitType: string;
		mainPictureUrl?: string | null;
		/** Wishlist only: DesireDots under the caption. */
		desire?: Desire;
		/** Gives the Popup the Tile to focus on close. */
		onSelect?: (el: HTMLElement) => void;
	} = $props();
</script>

<button
	type="button"
	class="group flex w-full min-w-0 cursor-pointer flex-col rounded-md text-start outline-ring outline-offset-3 focus-visible:outline-3 focus-visible:outline-solid"
	onclick={(e) => onSelect?.(e.currentTarget)}
>
	<span
		class="flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-card shadow-(--shadow-raised) motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-(--easing-out) motion-safe:group-hover:translate-y-(--tile-hover-lift) motion-safe:group-hover:rotate-(--tile-hover-tilt) motion-safe:group-focus-visible:translate-y-(--tile-hover-lift) motion-safe:group-focus-visible:rotate-(--tile-hover-tilt)"
	>
		<MainPicture url={mainPictureUrl} />
	</span>
	<span class="grid min-w-0 px-0.5 pt-2">
		<span
			class="truncate font-display text-sm leading-[1.25] font-extrabold tracking-[0.02em] uppercase italic"
		>
			{team}
		</span>
		<span class="truncate text-[11px] leading-[1.25] font-medium text-muted-foreground">
			{season} · {kitType}
		</span>
		{#if desire}
			<span class="pt-1"><DesireDots value={desire} /></span>
		{/if}
	</span>
</button>
