<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { tick } from 'svelte';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import LinkIcon from '@lucide/svelte/icons/link';
	import SpinnerIcon from '@lucide/svelte/icons/loader-circle';
	import Button from './Button.svelte';
	import { Button as IconButton } from './ui/button/index.js';
	import { Input } from './ui/input/index.js';

	/** Sets the Cover of a Kit from an uploaded image or an image address. Candidates come later. */
	let { kitId, onDone }: { kitId: number; onDone: () => void } = $props();

	let error = $state<string | null>(null);
	let busy = $state(false);
	let fileInput = $state<HTMLInputElement | null>(null);
	let urlOpen = $state(false);
	let urlText = $state('');
	let urlInput = $state<HTMLInputElement | null>(null);

	/** Scales the image down to 1000 px on its long side and re-encodes it as JPEG. */
	async function shrink(file: File): Promise<Blob> {
		const bitmap = await createImageBitmap(file);
		const scale = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height));
		const canvas = document.createElement('canvas');
		canvas.width = Math.round(bitmap.width * scale);
		canvas.height = Math.round(bitmap.height * scale);
		canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
		bitmap.close();
		const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, 'image/jpeg', 0.85));
		if (!blob) throw new Error('shrink failed');
		return blob;
	}

	async function save(request: () => Promise<Response>) {
		busy = true;
		error = null;
		try {
			const response = await request();
			if (response.ok) {
				await invalidateAll();
				onDone();
			} else {
				error = ((await response.json()) as { error?: string }).error ?? 'Could not set the cover';
			}
		} catch {
			error = 'Could not set the cover';
		} finally {
			busy = false;
		}
	}

	async function chooseFile() {
		const file = fileInput?.files?.[0];
		if (!file) return;
		let upload: Blob;
		try {
			upload = await shrink(file);
		} catch {
			error = 'Could not read this image';
			return;
		} finally {
			if (fileInput) fileInput.value = '';
		}
		await save(() =>
			fetch(`/api/kits/${kitId}/cover-upload`, {
				method: 'POST',
				headers: { 'content-type': upload.type },
				body: upload
			})
		);
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
		await save(() =>
			fetch(`/api/kits/${kitId}/cover-url`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ url: address })
			})
		);
	}
</script>

<div class="relative flex min-w-0 flex-col gap-3">
	{#if busy}
		<div
			role="status"
			aria-label="Saving the cover"
			class="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/70"
		>
			<SpinnerIcon class="size-10 text-primary motion-safe:animate-spin" />
		</div>
	{/if}
	<p class="text-sm text-muted-foreground">A JPEG, PNG or WebP image under 2 MB.</p>
	<div class="flex gap-2">
		<input
			bind:this={fileInput}
			type="file"
			accept="image/jpeg,image/png,image/webp"
			class="hidden"
			onchange={chooseFile}
		/>
		<IconButton
			variant="neutral"
			size="icon"
			aria-label="Upload a cover"
			disabled={busy}
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
			<Button intent="success" type="submit" disabled={!urlText.trim() || busy}>Use image</Button>
		</form>
	{/if}
	{#if error}
		<p role="alert" class="text-sm text-destructive">{error}</p>
	{/if}
</div>
