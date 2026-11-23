<script lang="ts">
	import { untrack } from 'svelte';
	import { addStore, emptyAcquisition, postAction, toAcquisitionInput } from '#lib/forms';
	import { fitLabels, labelOptions, versionLabels } from '#lib/labels';
	import type { Fit, Size, Store, Version } from '#lib/server/catalog/types';
	import AcquisitionFields from './AcquisitionFields.svelte';
	import Button from './Button.svelte';
	import Field from './Field.svelte';
	import ToggleGroup from './ToggleGroup.svelte';

	let {
		wishlistItemId,
		version: wantedVersion,
		stores,
		onDone,
		onCancel
	}: {
		wishlistItemId: number;
		/** The Wishlist Item's Version (null = any): pre-sets the field. */
		version: Version | null;
		stores: Store[];
		/** Saved: the Wishlist Item is gone. */
		onDone: () => void;
		onCancel: () => void;
	} = $props();

	// The field starts from the prop and is then edited freely.
	let version = $state<Version>(untrack(() => wantedVersion) ?? 'fan');
	let size = $state<Size>('M');
	let fit = $state<Fit>('good');
	let print = $state('');
	let acquisition = $state(emptyAcquisition());
	let error = $state<string | null>(null);
	let busy = $state(false);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		const acquisitionInput = toAcquisitionInput(acquisition);
		if (typeof acquisitionInput === 'string') {
			error = acquisitionInput;
			return;
		}
		busy = true;
		const outcome = await postAction('?/gotIt', {
			wishlistItemId,
			jersey: { version, size, fit, print: print.trim() || null, acquisition: acquisitionInput }
		});
		busy = false;
		if (outcome.ok) onDone();
		else error = outcome.error;
	}
</script>

<!-- Two columns from `sm` (Popup `wide`), as the JerseyForm. -->
<form class="grid grid-cols-1 gap-4 sm:grid-cols-2" onsubmit={submit}>
	<ToggleGroup label="Version" bind:value={version} options={labelOptions(versionLabels)} />
	<ToggleGroup
		label="Size"
		bind:value={size}
		options={(['S', 'M', 'L'] as const).map((s) => ({ value: s, label: s }))}
	/>
	<ToggleGroup label="Fit" bind:value={fit} options={labelOptions(fitLabels)} />
	<Field label="Print" bind:value={print} />
	<AcquisitionFields bind:acquisition {stores} onAddStore={addStore} />
	{#if error}
		<p class="text-sm font-bold text-destructive sm:col-span-2" role="alert">! {error}</p>
	{/if}
	<div class="flex flex-wrap justify-end gap-2 sm:col-span-2">
		<Button onclick={onCancel}>Cancel</Button>
		<Button intent="success" type="submit" loading={busy}>Save</Button>
	</div>
</form>
