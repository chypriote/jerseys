<script lang="ts">
	import type { Store } from '#lib/server/catalog/types';
	import Button from './Button.svelte';
	import Popup from './Popup.svelte';
	import StoreForm from './StoreForm.svelte';

	let { stores }: { stores: Store[] } = $props();

	let open = $state(false);
	/** The Store being renamed; null while adding. */
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
	<ul class="flex flex-col gap-2">
		{#each stores as store (store.id)}
			<li class="flex items-center justify-between gap-3 rounded-xl bg-card px-4 py-2">
				<span class="font-medium">{store.name}</span>
				<Button size="sm" onclick={() => show(store)}>
					Rename<span class="sr-only"> {store.name}</span>
				</Button>
			</li>
		{/each}
	</ul>
</section>

<Popup bind:open title={editing ? 'Rename store' : 'Add a store'}>
	{#snippet details()}
		{#key editing}
			<StoreForm store={editing} onSuccess={() => (open = false)} />
		{/key}
	{/snippet}
</Popup>
