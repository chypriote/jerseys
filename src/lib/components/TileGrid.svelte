<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<ul
	class="grid grid-cols-3 gap-x-2 gap-y-3 ps-[max(1rem,env(safe-area-inset-left))] pe-[max(1rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-8"
>
	{@render children()}
</ul>
