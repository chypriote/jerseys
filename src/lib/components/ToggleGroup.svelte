<script lang="ts" generics="T extends string">
	import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group/index.js';

	let {
		value = $bindable(),
		label,
		options
	}: { value: T; label: string; options: { value: T; label: string }[] } = $props();

	const labelId = $props.id();
</script>

<!-- Radio pills: one is always picked, so pressing the picked pill keeps it. -->
<div class="flex flex-col gap-1.5">
	<span class="text-sm font-bold" id={labelId}>{label}</span>
	<ToggleGroup
		type="single"
		aria-labelledby={labelId}
		{value}
		onValueChange={(next: string) => {
			const found = options.find((o) => o.value === next);
			if (found) value = found.value;
		}}
	>
		{#each options as option (option.value)}
			<ToggleGroupItem value={option.value}>{option.label}</ToggleGroupItem>
		{/each}
	</ToggleGroup>
</div>
