<script lang="ts">
	import type { Snippet } from 'svelte';

	let { message, action }: { message: string; action?: Snippet } = $props();
</script>

<div class="flex flex-col items-center gap-4 px-4 py-16 text-center">
	<p class="text-sm font-bold text-foreground">{message}</p>
	{@render action?.()}
</div>
