<script lang="ts">
	import Button from './Button.svelte';
	import Field from './Field.svelte';
	import Select from './Select.svelte';

	let {
		value = $bindable(''),
		stores,
		onAddStore,
		label = 'Store'
	}: {
		value?: string;
		stores: { id: number | string; name: string }[];
		onAddStore: (name: string) => Promise<{ id: number | string }>;
		label?: string;
	} = $props();

	const ADD = '__add__';

	// Stores added here show at once, before the page data reloads.
	let added = $state<{ id: number | string; name: string }[]>([]);
	let name = $state('');
	let error = $state<string | null>(null);
	let busy = $state(false);

	const all = $derived([
		...stores,
		...added.filter((a) => !stores.some((s) => String(s.id) === String(a.id)))
	]);
	const options = $derived([
		{ value: '', label: 'Choose a store' },
		...all.map((s) => ({ value: String(s.id), label: s.name })),
		{ value: ADD, label: 'Add a store…' }
	]);

	async function add() {
		const clean = name.trim();
		if (!clean) {
			error = 'Name is required';
			return;
		}
		busy = true;
		try {
			const store = await onAddStore(clean);
			added = [...added, { id: store.id, name: clean }];
			value = String(store.id);
			name = '';
			error = null;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not add the store';
		} finally {
			busy = false;
		}
	}
</script>

<div class="flex flex-col gap-1.5">
	<span class="text-sm font-bold">{label}</span>
	<div class="flex">
		<Select bind:value {label} {options} />
	</div>
	{#if value === ADD}
		<div class="flex flex-col gap-2">
			<Field label="New store" bind:value={name} {error} />
			<div>
				<Button intent="success" loading={busy} onclick={add}>Add</Button>
			</div>
		</div>
	{/if}
</div>
