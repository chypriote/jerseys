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
</script>

{#if url && !failed}
	<img
		bind:this={img}
		src={url}
		alt=""
		loading="lazy"
		class="size-full object-contain p-[8%]"
		onerror={() => (failed = true)}
	/>
{:else}
	<ShirtOutline class="size-4/5" />
{/if}
