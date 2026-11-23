<script lang="ts">
	import CalendarIcon from '@lucide/svelte/icons/calendar';
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

	let picker = $state<HTMLInputElement | null>(null);
	function openPicker() {
		if (!picker) return;
		// Only a full date can seed the picker; a year alone cannot.
		picker.value = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
		picker.showPicker();
	}
</script>

<div class="flex flex-col gap-1.5">
	<Label for={id}>{label}</Label>
	<div class="relative">
		<Input
			{id}
			type={isDate ? 'text' : type}
			{required}
			bind:value
			placeholder={placeholder ?? (isDate ? '2024 or 2024-05-12' : undefined)}
			autocomplete={isDate ? 'off' : undefined}
			step={type === 'number' ? '0.01' : undefined}
			class={isDate ? 'pe-12' : undefined}
			aria-invalid={error ? true : undefined}
			aria-describedby={error ? `${id}-error` : undefined}
		/>
		{#if isDate}
			<button
				type="button"
				class="absolute end-1 top-1/2 inline-flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-foreground outline-ring hover:bg-muted focus-visible:outline-3 focus-visible:outline-solid"
				onclick={openPicker}
			>
				<CalendarIcon class="size-5" />
				<span class="sr-only">Pick {label} date</span>
			</button>
			<input
				bind:this={picker}
				type="date"
				tabindex="-1"
				aria-hidden="true"
				class="pointer-events-none absolute end-0 bottom-0 size-0 opacity-0"
				onchange={() => picker?.value && (value = picker.value)}
			/>
		{/if}
	</div>
	{#if error}
		<p id="{id}-error" class="text-sm font-bold text-destructive">! {error}</p>
	{/if}
</div>
