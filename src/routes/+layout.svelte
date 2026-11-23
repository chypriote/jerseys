<script lang="ts">
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<!-- layer.safe-area: page-color strip over the top inset, above the sticky bar. -->
<div
	aria-hidden="true"
	class="pointer-events-none fixed inset-x-0 top-0 z-(--layer-safe-area) h-[env(safe-area-inset-top)] bg-background"
></div>

<div class="min-h-dvh bg-background text-foreground">
	{@render children()}
</div>
