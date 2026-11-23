<script lang="ts">
	import { Input } from './ui/input/index.js';

	let {
		value = $bindable(''),
		label,
		placeholder = ''
	}: { value?: string; label: string; placeholder?: string } = $props();
</script>

<Input type="search" bind:value aria-label={label} {placeholder} class="w-auto flex-1 basis-48" />
