<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { postAction } from '#lib/forms';
	import type { Store } from '#lib/server/catalog/types';
	import Field from './Field.svelte';
	import FormActions from './FormActions.svelte';

	/** `store` set: edits it. Unset: adds a Store. */
	let {
		store = null,
		onSuccess,
		remove
	}: { store?: Store | null; onSuccess: () => void; remove?: Snippet } = $props();

	// The form starts from the Store; the caller re-creates it for another Store.
	let name = $state(untrack(() => store?.name ?? ''));
	let error = $state<string | null>(null);
	let busy = $state(false);

	async function save(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		const outcome = store
			? await postAction('?/renameStore', { id: store.id, name })
			: await postAction('?/addStore', { name });
		busy = false;
		if (outcome.ok) {
			error = null;
			onSuccess();
		} else {
			error = outcome.error;
		}
	}
</script>

<form class="flex flex-col gap-4" onsubmit={save}>
	<Field label="Name" required bind:value={name} {error} />
	<FormActions {busy} {remove} />
</form>
