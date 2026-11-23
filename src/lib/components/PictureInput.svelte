<script lang="ts">
	import { tick } from 'svelte';
	import LinkIcon from '@lucide/svelte/icons/link';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import { Button as IconButton } from './ui/button/index.js';
	import FindPicturesLink from './FindPicturesLink.svelte';
	import { Input } from './ui/input/index.js';

	/** A picture for a form: an uploaded file or an image address, never both. */
	let {
		label,
		file = $bindable(null),
		url = $bindable(''),
		findUrl = null
	}: { label: string; file?: File | null; url?: string; findUrl?: string | null } = $props();

	let fileInput = $state<HTMLInputElement | null>(null);
	let urlInput = $state<HTMLInputElement | null>(null);
	let urlOpen = $state(false);

	function chooseFile() {
		const chosen = fileInput?.files?.[0] ?? null;
		if (fileInput) fileInput.value = '';
		if (!chosen) return;
		file = chosen;
		url = '';
		urlOpen = false;
	}

	async function toggleUrl() {
		urlOpen = !urlOpen;
		if (!urlOpen) return;
		await tick();
		urlInput?.focus();
	}

	async function openUrl() {
		urlOpen = true;
		await tick();
		urlInput?.focus();
	}
</script>

<div class="flex flex-col gap-1.5">
	<span class="text-sm font-bold">{label}</span>
	<div class="flex items-center gap-2">
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
			aria-label="Upload a picture"
			onclick={() => fileInput?.click()}
		>
			<UploadIcon class="size-5" />
		</IconButton>
		<IconButton
			variant="neutral"
			size="icon"
			aria-label="Use an image address"
			aria-expanded={urlOpen}
			onclick={toggleUrl}
		>
			<LinkIcon class="size-5" />
		</IconButton>
		{#if file}
			<span class="min-w-0 truncate text-sm text-muted-foreground">{file.name}</span>
		{/if}
	</div>
	{#if findUrl}
		<FindPicturesLink url={findUrl} onOpen={openUrl} />
	{/if}
	{#if urlOpen}
		<Input
			type="url"
			bind:ref={urlInput}
			bind:value={url}
			oninput={() => (file = null)}
			aria-label="Image address"
			placeholder="https://…"
		/>
	{/if}
</div>
