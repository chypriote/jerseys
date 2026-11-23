<script lang="ts">
	import type { Store } from '#lib/server/catalog/types';
	import { deleteRow } from '#lib/forms';
	import { jerseyCount } from '#lib/format-count';
	import { matchesSearch } from '#lib/search';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import Button from './Button.svelte';
	import DeleteAction from './DeleteAction.svelte';
	import Popup from './Popup.svelte';
	import SearchField from './SearchField.svelte';
	import StoreForm from './StoreForm.svelte';

	let { stores, counts }: { stores: Store[]; counts: Record<number, number> } = $props();

	let search = $state('');
	const shown = $derived(stores.filter((s) => matchesSearch(search, s.name)));

	let open = $state(false);
	/** The Store being edited; null while adding. */
	let editing = $state<Store | null>(null);

	function show(store: Store | null) {
		editing = store;
		open = true;
	}
</script>

<section aria-labelledby="stores-heading" class="flex min-w-0 flex-col gap-3">
	<div class="flex items-center justify-between gap-3">
		<h2 id="stores-heading" class="font-display text-xl font-extrabold uppercase italic">Stores</h2>
		<Button intent="success" size="sm" onclick={() => show(null)}>Add a store</Button>
	</div>
	<!-- SearchField sizes itself for a row (basis-48), so a row wrapper keeps it one line tall. -->
	<div class="flex">
		<SearchField bind:value={search} label="Search stores" placeholder="Search stores" />
	</div>
	<ul class="grid grid-cols-2 gap-2 sm:grid-cols-3">
		{#each shown as store (store.id)}
			<li class="flex min-w-0 items-center justify-between gap-2 rounded-xl bg-card p-3">
				<div class="flex min-w-0 flex-col">
					<span class="font-medium break-words">{store.name}</span>
					<span class="text-sm text-muted-foreground">{jerseyCount(counts[store.id])}</span>
				</div>
				<Button size="icon" onclick={() => show(store)}>
					<PencilIcon class="size-5" aria-hidden="true" />
					<span class="sr-only">Edit {store.name}</span>
				</Button>
			</li>
		{/each}
	</ul>
</section>

<Popup bind:open title={editing ? 'Edit store' : 'Add a store'}>
	{#snippet details()}
		{#key editing}
			<StoreForm store={editing} onSuccess={() => (open = false)}>
				{#snippet remove()}
					{#if editing}
						{@const row = editing}
						<DeleteAction
							what={row.name}
							text="This deletes the store. A store that purchases use cannot be deleted."
							onDelete={() => deleteRow('?/deleteStore', row.id, () => (open = false))}
						/>
					{/if}
				{/snippet}
			</StoreForm>
		{/key}
	{/snippet}
</Popup>
