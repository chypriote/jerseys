<script lang="ts">
	import TeamsSection from '#lib/components/TeamsSection.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<TeamsSection teams={data.teams} countries={data.countries} counts={data.counts} />
