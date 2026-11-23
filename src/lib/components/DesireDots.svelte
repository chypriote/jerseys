<script lang="ts">
	import type { Desire } from '#lib/server/catalog/types';

	let { value }: { value: Desire } = $props();
</script>

<span class="inline-flex items-center">
	<span aria-hidden="true" class="inline-flex gap-[3px]">
		{#each { length: 5 }, i (i)}
			<span class="size-1.5 rounded-full {i < value ? 'bg-icon-accent' : 'bg-border'}"></span>
		{/each}
	</span>
	<span class="sr-only">Desire {value} of 5</span>
</span>
