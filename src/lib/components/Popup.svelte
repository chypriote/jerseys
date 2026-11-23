<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as Dialog from './ui/dialog/index.js';

	let {
		open = $bindable(false),
		title,
		details
	}: {
		open?: boolean;
		title: string;
		details?: Snippet;
	} = $props();
</script>

<Dialog.Root bind:open>
	<Dialog.Content>
		<Dialog.Title>{title}</Dialog.Title>
		{@render details?.()}
	</Dialog.Content>
</Dialog.Root>
