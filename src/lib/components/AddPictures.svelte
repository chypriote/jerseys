<script lang="ts">
	import { shrinkImage } from '#lib/pictures';
	import { Input } from './ui/input/index.js';
	import { Label } from './ui/label/index.js';

	let { kitId, onAdded }: { kitId: number; onAdded: () => void | Promise<void> } = $props();

	const id = $props.id();
	let input = $state<HTMLInputElement | null>(null);
	let busy = $state(false);
	let error = $state<string | null>(null);

	/** Adds the chosen files one by one, in the order picked. The first refused one stops the rest. */
	async function add() {
		const files = [...(input?.files ?? [])];
		if (input) input.value = '';
		if (!files.length) return;
		busy = true;
		error = null;
		try {
			for (const file of files) {
				let upload: Blob;
				try {
					upload = await shrinkImage(file);
				} catch {
					error = `Could not read ${file.name}`;
					return;
				}
				const response = await fetch(`/api/kits/${kitId}/pictures`, {
					method: 'POST',
					headers: { 'content-type': upload.type },
					body: upload
				});
				if (!response.ok) {
					const answer = (await response.json().catch(() => ({}))) as { error?: string };
					error = answer.error ?? 'Could not add the picture';
					return;
				}
			}
		} catch {
			error = 'Network error';
		} finally {
			busy = false;
			await onAdded();
		}
	}
</script>

<div class="flex w-full flex-col gap-1.5">
	<Label for={id}>Add pictures</Label>
	<Input
		{id}
		type="file"
		multiple
		accept="image/jpeg,image/png,image/webp"
		disabled={busy}
		bind:ref={input}
		onchange={add}
	/>
	{#if busy}
		<p class="text-sm text-muted-foreground" aria-live="polite">Adding…</p>
	{/if}
	{#if error}
		<p class="text-sm font-bold text-destructive" role="alert">! {error}</p>
	{/if}
</div>
