<script lang="ts">
	import KitsWithoutCoverSection from '#lib/components/KitsWithoutCoverSection.svelte';
	import StoresSection from '#lib/components/StoresSection.svelte';
	import { Button as UiButton } from '#lib/components/ui/button/index.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Jerseys | Admin</title></svelte:head>

<main class="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
	<div class="flex items-center justify-between gap-3">
		<h1>Admin</h1>
		<UiButton variant="neutral" href="/">Back home</UiButton>
	</div>
	<!-- One section per kind of reference data (Countries, Kits without a Cover come next). -->
	<div class="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
		<StoresSection stores={data.stores} />
		<KitsWithoutCoverSection kits={data.kitsWithoutCover} />
	</div>
</main>
