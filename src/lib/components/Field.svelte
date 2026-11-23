<script lang="ts">
	import { Input } from './ui/input/index.js';
	import { Label } from './ui/label/index.js';

	let {
		value = $bindable(''),
		label,
		type = 'text',
		required = false,
		error = null
	}: {
		value?: string;
		label: string;
		type?: 'text' | 'password' | 'number';
		required?: boolean;
		error?: string | null;
	} = $props();

	const id = $props.id();
</script>

<div class="flex flex-col gap-1.5">
	<Label for={id}>{label}</Label>
	<Input
		{id}
		{type}
		{required}
		bind:value
		step={type === 'number' ? '0.01' : undefined}
		aria-invalid={error ? true : undefined}
		aria-describedby={error ? `${id}-error` : undefined}
	/>
	{#if error}
		<p id="{id}-error" class="text-sm font-bold text-destructive">! {error}</p>
	{/if}
</div>
