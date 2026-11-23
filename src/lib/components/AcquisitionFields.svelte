<script lang="ts">
	import type { AcquisitionState } from '#lib/forms';
	import Field from './Field.svelte';
	import StoreSelect from './StoreSelect.svelte';
	import ToggleGroup from './ToggleGroup.svelte';

	let {
		acquisition = $bindable(),
		stores,
		onAddStore
	}: {
		acquisition: AcquisitionState;
		stores: { id: number; name: string }[];
		onAddStore: (name: string) => Promise<{ id: number | string }>;
	} = $props();
</script>

<!-- No wrapper: the fields are items of the form's grid. -->
<div class="sm:col-span-2">
	<ToggleGroup
		label="Acquisition"
		bind:value={acquisition.kind}
		options={[
			{ value: 'purchase', label: 'Purchase' },
			{ value: 'gift', label: 'Gift' }
		]}
	/>
</div>
{#if acquisition.kind === 'purchase'}
	<StoreSelect bind:value={acquisition.storeId} {stores} {onAddStore} />
	<Field label="Price (€)" type="number" required bind:value={acquisition.price} />
	<Field label="Bought" type="date" required bind:value={acquisition.date} />
	<Field label="Sent" type="date" bind:value={acquisition.sent} />
	<Field label="Received" type="date" bind:value={acquisition.received} />
{:else}
	<Field label="Date" type="date" required bind:value={acquisition.date} />
	<Field label="From" bind:value={acquisition.giver} />
{/if}
