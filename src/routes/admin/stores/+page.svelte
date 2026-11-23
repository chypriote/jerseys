<script lang="ts">
	import StoresSection from '#lib/components/StoresSection.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<StoresSection stores={data.stores} />
