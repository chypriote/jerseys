<script lang="ts">
	import AdminNav from '#lib/components/AdminNav.svelte';
	import { Button as UiButton } from '#lib/components/ui/button/index.js';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head><title>Jerseys | Admin</title></svelte:head>

<main class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
	<div class="flex items-center justify-between gap-3">
		<h1>Admin</h1>
		<UiButton variant="neutral" href="/">Back home</UiButton>
	</div>
	<AdminNav />
	{@render children()}
</main>
