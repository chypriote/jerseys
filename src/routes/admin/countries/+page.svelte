<script lang="ts">
	import CountriesSection from '#lib/components/CountriesSection.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<CountriesSection countries={data.countries} />
