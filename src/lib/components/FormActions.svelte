<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from './Button.svelte';

	let { busy = false, remove }: { busy?: boolean; remove?: Snippet } = $props();
</script>

<!-- Delete (when the form has one) on the left, Save on the right. -->
<div class="flex flex-wrap items-center gap-2">
	{@render remove?.()}
	<Button intent="success" type="submit" loading={busy} class="ml-auto">Save</Button>
</div>
