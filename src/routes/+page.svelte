<script lang="ts">
	import LoginAction from '#lib/components/LoginAction.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Jerseys</title>
</svelte:head>

<main class="p-4">
	<header class="flex items-center justify-between gap-4">
		<h1>Jerseys</h1>
		<LoginAction isOwner={data.isOwner} />
	</header>
</main>
