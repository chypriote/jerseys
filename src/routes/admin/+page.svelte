<script lang="ts">
	import CountriesSection from '#lib/components/CountriesSection.svelte';
	import KitsSection from '#lib/components/KitsSection.svelte';
	import KitsWithoutMainPictureSection from '#lib/components/KitsWithoutMainPictureSection.svelte';
	import StoresSection from '#lib/components/StoresSection.svelte';
	import TeamsSection from '#lib/components/TeamsSection.svelte';
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
	<!-- One section per kind of reference data. -->
	<div class="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
		<CountriesSection countries={data.countries} />
		<StoresSection stores={data.stores} />
		<TeamsSection teams={data.teams} countries={data.countries} />
		<KitsSection kits={data.kits} teams={data.teams} />
		<KitsWithoutMainPictureSection kits={data.kitsWithoutMainPicture} />
	</div>
</main>
