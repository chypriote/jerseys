<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { tick } from 'svelte';
	import { shrinkImage } from '#lib/pictures';
	import LinkIcon from '@lucide/svelte/icons/link';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import Button from './Button.svelte';
	import { Button as IconButton } from './ui/button/index.js';
	import { Input } from './ui/input/index.js';
	import { Label } from './ui/label/index.js';

	let { kitId, onAdded }: { kitId: number; onAdded: () => void | Promise<void> } = $props();

	let fileInput = $state<HTMLInputElement | null>(null);
	let busy = $state(false);
	let error = $state<string | null>(null);
	let urlOpen = $state(false);
	let urlText = $state('');
	let urlInput = $state<HTMLInputElement | null>(null);

	/** Runs the adds, then reloads the Pictures. A failed add shows its message. */
	async function run(work: () => Promise<string | null>) {
		busy = true;
		error = null;
		try {
			error = await work();
		} catch {
			error = 'Network error';
		} finally {
			busy = false;
			// A first Picture may have become the Kit's Main Picture.
			await Promise.all([invalidateAll(), onAdded()]);
		}
	}

	async function refusal(response: Response) {
		const answer = (await response.json().catch(() => ({}))) as { error?: string };
		return answer.error ?? 'Could not add the picture';
	}

	/** Adds the chosen files one by one, in the order picked. The first refused one stops the rest. */
	async function chooseFiles() {
		const files = [...(fileInput?.files ?? [])];
		if (fileInput) fileInput.value = '';
		if (!files.length) return;
		await run(async () => {
			for (const file of files) {
				let upload: Blob;
				try {
					upload = await shrinkImage(file);
				} catch {
					return `Could not read ${file.name}`;
				}
				const response = await fetch(`/api/kits/${kitId}/pictures`, {
					method: 'POST',
					headers: { 'content-type': upload.type },
					body: upload
				});
				if (!response.ok) return refusal(response);
			}
			return null;
		});
	}

	async function toggleUrl() {
		urlOpen = !urlOpen;
		if (!urlOpen) return;
		await tick();
		urlInput?.focus();
	}

	async function chooseUrl(event: SubmitEvent) {
		event.preventDefault();
		const address = urlText.trim();
		if (!/^https?:\/\//i.test(address)) {
			error = 'Use an http or https address';
			return;
		}
		await run(async () => {
			const response = await fetch(`/api/kits/${kitId}/pictures-url`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ url: address })
			});
			if (!response.ok) return refusal(response);
			urlText = '';
			urlOpen = false;
			return null;
		});
	}
</script>

<div class="flex w-full flex-col gap-1.5">
	<Label>Add pictures</Label>
	<div class="flex gap-2">
		<input
			bind:this={fileInput}
			type="file"
			multiple
			accept="image/jpeg,image/png,image/webp"
			class="hidden"
			onchange={chooseFiles}
		/>
		<IconButton
			variant="neutral"
			size="icon"
			aria-label="Upload pictures"
			loading={busy}
			onclick={() => fileInput?.click()}
		>
			<UploadIcon class="size-5" />
		</IconButton>
		<IconButton
			variant="neutral"
			size="icon"
			aria-label="Use an image address"
			aria-expanded={urlOpen}
			disabled={busy}
			onclick={toggleUrl}
		>
			<LinkIcon class="size-5" />
		</IconButton>
	</div>
	{#if urlOpen}
		<form class="flex gap-2" onsubmit={chooseUrl}>
			<Input
				type="url"
				bind:ref={urlInput}
				bind:value={urlText}
				aria-label="Image address"
				placeholder="https://…"
				class="flex-1"
			/>
			<Button intent="success" type="submit" disabled={!urlText.trim() || busy}>Add</Button>
		</form>
	{/if}
	{#if busy}
		<p class="text-sm text-muted-foreground" aria-live="polite">Adding…</p>
	{/if}
	{#if error}
		<p class="text-sm font-bold text-destructive" role="alert">! {error}</p>
	{/if}
</div>
