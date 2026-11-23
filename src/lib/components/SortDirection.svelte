<script lang="ts">
	import ArrowDownWideNarrowIcon from '@lucide/svelte/icons/arrow-down-wide-narrow';
	import ArrowUpNarrowWideIcon from '@lucide/svelte/icons/arrow-up-narrow-wide';
	import { Button } from './ui/button/index.js';

	let { value = $bindable() }: { value?: string } = $props();
</script>

<Button variant="neutral" size="icon" onclick={() => (value = value === 'asc' ? 'desc' : 'asc')}>
	{#if value === 'asc'}
		<ArrowUpNarrowWideIcon aria-hidden="true" class="size-5" />
	{:else}
		<ArrowDownWideNarrowIcon aria-hidden="true" class="size-5" />
	{/if}
	<span class="sr-only">Sort order: {value === 'asc' ? 'ascending' : 'descending'}</span>
</Button>
