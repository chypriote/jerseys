<script lang="ts">
	import { NativeSelect, NativeSelectOption } from './ui/native-select/index.js';

	let {
		value = $bindable(),
		label,
		options,
		disabled = false
	}: {
		value?: string;
		label: string;
		options: { value: string; label: string }[];
		disabled?: boolean;
	} = $props();
</script>

<NativeSelect bind:value aria-label={label} {disabled}>
	{#each options as option (option.value)}
		<NativeSelectOption value={option.value}>{option.label}</NativeSelectOption>
	{/each}
</NativeSelect>
