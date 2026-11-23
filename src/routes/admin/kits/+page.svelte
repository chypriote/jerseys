<script lang="ts">
	import KitsSection from '#lib/components/KitsSection.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<KitsSection kits={data.kits} teams={data.teams} />
