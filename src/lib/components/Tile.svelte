<script lang="ts">
	import MainPicture from './MainPicture.svelte';

	let {
		team,
		season,
		kitType,
		mainPictureUrl = null,
		name = null,
		number = null,
		onSelect
	}: {
		team: string;
		/** Already formatted ("2023-24", "2024"). */
		season: string;
		kitType: string;
		mainPictureUrl?: string | null;
		/** The Jersey's Print without its number. */
		name?: string | null;
		/** Shirt number of the Jersey's Print. */
		number?: string | null;
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
		class="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-card shadow-(--shadow-raised) motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-(--easing-out) motion-safe:group-hover:translate-y-(--tile-hover-lift) motion-safe:group-hover:rotate-(--tile-hover-tilt) motion-safe:group-focus-visible:translate-y-(--tile-hover-lift) motion-safe:group-focus-visible:rotate-(--tile-hover-tilt)"
	>
		<MainPicture url={mainPictureUrl} />
		{#if name}
			<span
				class="absolute inset-x-7 bottom-2 truncate text-center font-display text-sm leading-none font-extrabold tracking-caption text-foreground uppercase italic [paint-order:stroke] [-webkit-text-stroke:3px_var(--card)]"
				aria-hidden="true"
			>
				{name}
			</span>
		{/if}
		{#if number}
			<span
				class="absolute right-2 bottom-2 font-display text-sm leading-none font-extrabold text-foreground italic [paint-order:stroke] [-webkit-text-stroke:4px_var(--card)]"
				aria-hidden="true"
			>
				{number}
			</span>
		{/if}
	</span>
	<span class="grid min-w-0 px-0.5 pt-2">
		<span
			class="truncate font-display text-sm leading-snug font-extrabold tracking-caption uppercase italic"
		>
			{team}
		</span>
		<span class="truncate text-2xs leading-snug font-medium text-muted-foreground">
			{season} · {kitType}
		</span>
	</span>
</button>
