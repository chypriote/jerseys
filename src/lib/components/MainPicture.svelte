<script lang="ts">
	import ShirtOutline from './ShirtOutline.svelte';

	let { url = null }: { url?: string | null } = $props();

	let failed = $state(false);
	let img = $state<HTMLImageElement | null>(null);

	$effect(() => {
		void url;
		failed = false;
	});

	// An image can fail before hydration, so the error event is already gone.
	$effect(() => {
		if (img && img.complete && img.naturalWidth === 0) failed = true;
	});

	// Hydration keeps the `src` of the server-rendered image even when the page state now asks for
	// another one (a browser that restores the search field on reload filters the list while the
	// page hydrates). Set it again once hydrated.
	$effect(() => {
		if (img && url && img.getAttribute('src') !== url) img.src = url;
	});
</script>

{#if url && !failed}
	<img
		bind:this={img}
		src={url}
		alt=""
		loading="lazy"
		class="size-full object-contain p-[8%] mix-blend-multiply dark:mix-blend-normal"
		onerror={() => (failed = true)}
	/>
{:else}
	<ShirtOutline class="size-4/5" />
{/if}
