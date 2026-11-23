<script lang="ts">
	import type { Desire } from '#lib/server/catalog/types';
	import { NativeSelect, NativeSelectOption } from './ui/native-select/index.js';

	let {
		value = null,
		label,
		placeholder,
		disabled = false,
		onPick
	}: {
		value?: Desire | null;
		label: string;
		/** Label of the empty option. Leave unset when a level is always chosen. */
		placeholder?: string;
		disabled?: boolean;
		onPick: (level: Desire | null) => void;
	} = $props();

	const levels = [5, 4, 3, 2, 1] as const;
	const names: Record<number, string> = { 5: 'most wanted', 1: 'least wanted' };
</script>

<NativeSelect
	aria-label={label}
	{disabled}
	value={value === null ? '' : String(value)}
	onchange={(e) => {
		const picked = e.currentTarget.value;
		// The chosen value comes back through `value`; until then show the current one.
		e.currentTarget.value = value === null ? '' : String(value);
		onPick(picked === '' ? null : (Number(picked) as Desire));
	}}
>
	{#if placeholder !== undefined}
		<NativeSelectOption value="">{placeholder}</NativeSelectOption>
	{/if}
	{#each levels as level (level)}
		<NativeSelectOption value={String(level)}>
			{names[level] ? `${level} (${names[level]})` : level}
		</NativeSelectOption>
	{/each}
</NativeSelect>
