<script lang="ts">
	import PictureCleaner from '#lib/components/PictureCleaner.svelte';
	import RemoveBackgrounds from '#lib/components/RemoveBackgrounds.svelte';
	import KitsSection from '#lib/components/KitsSection.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<div class="flex flex-col gap-6">
	<PictureCleaner kits={data.kits} />
	<RemoveBackgrounds kits={data.kits} />
	<KitsSection kits={data.kits} teams={data.teams} />
</div>
