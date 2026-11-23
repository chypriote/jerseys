<script lang="ts">
	import { Input } from './ui/input/index.js';
	import { Label } from './ui/label/index.js';

	let {
		value = $bindable(''),
		label,
		type = 'text',
		required = false,
		placeholder = undefined,
		error = null
	}: {
		value?: string;
		label: string;
		/** `date`: a text input for `YYYY` or `YYYY-MM-DD` (native date inputs cannot hold a year only). */
		type?: 'text' | 'password' | 'number' | 'date';
		required?: boolean;
		placeholder?: string;
		error?: string | null;
	} = $props();

	const id = $props.id();
	const isDate = $derived(type === 'date');
</script>

<div class="flex flex-col gap-1.5">
	<Label for={id}>{label}</Label>
	<Input
		{id}
		type={isDate ? 'text' : type}
		{required}
		bind:value
		placeholder={placeholder ?? (isDate ? '2024 or 2024-05-12' : undefined)}
		autocomplete={isDate ? 'off' : undefined}
		step={type === 'number' ? '0.01' : undefined}
		aria-invalid={error ? true : undefined}
		aria-describedby={error ? `${id}-error` : undefined}
	/>
	{#if error}
		<p id="{id}-error" class="text-sm font-bold text-destructive">! {error}</p>
	{/if}
</div>
