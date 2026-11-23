<script lang="ts">
	import KitsWithoutMainPictureSection from '#lib/components/KitsWithoutMainPictureSection.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<KitsWithoutMainPictureSection kits={data.kitsWithoutMainPicture} />
