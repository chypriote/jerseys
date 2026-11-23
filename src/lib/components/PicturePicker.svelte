<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { tick } from 'svelte';
	import { shrinkImage } from '#lib/pictures';
	import type { PictureCandidates, SourceTeam } from '#lib/server/catalog/types';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import LinkIcon from '@lucide/svelte/icons/link';
	import SpinnerIcon from '@lucide/svelte/icons/loader-circle';
	import Button from './Button.svelte';
	import { Button as IconButton } from './ui/button/index.js';
	import { Input } from './ui/input/index.js';

	/** Sets the Main Picture of a Kit from a TheSportsDB candidate, an uploaded image or an image address. */
	let { kitId, onDone }: { kitId: number; onDone: () => void } = $props();

	let listing = $state<PictureCandidates | null>(null);
	let listError = $state<string | null>(null);
	/** Candidates whose image does not load are left out. */
	let failed = $state<string[]>([]);
	// Drops the answer of an older request when a newer one was sent.
	let latest = 0;

	async function loadCandidates() {
		const mine = ++latest;
		listing = null;
		listError = null;
		failed = [];
		try {
			const response = await fetch(`/api/kits/${kitId}/picture-candidates`);
			const body = (await response.json()) as PictureCandidates & { error?: string };
			if (mine !== latest) return;
			if (response.ok) listing = body;
			else listError = body.error ?? 'Could not load pictures';
		} catch {
			if (mine === latest) listError = 'Could not load pictures';
		}
	}

	// Candidates load when the picker opens (it is mounted per opening).
	$effect(() => {
		loadCandidates();
	});

	const kitTypeLabel = (kitType: string | null) =>
		kitType ? `${kitType[0].toUpperCase()}${kitType.slice(1)}` : 'Other';

	let teamQuery = $state('');
	let teams = $state<SourceTeam[] | null>(null);
	let searching = $state(false);

	async function searchTeams(event: SubmitEvent) {
		event.preventDefault();
		const query = teamQuery.trim();
		if (!query) return;
		searching = true;
		error = null;
		try {
			const response = await fetch(`/api/teams/search?q=${encodeURIComponent(query)}`);
			const body = (await response.json()) as { teams?: SourceTeam[]; error?: string };
			if (response.ok) teams = body.teams ?? [];
			else error = body.error ?? 'Could not search teams';
		} catch {
			error = 'Could not search teams';
		} finally {
			searching = false;
		}
	}

	async function useTeam(team: SourceTeam) {
		if (!listing) return;
		error = null;
		try {
			const response = await fetch(`/api/teams/${listing.teamId}/source`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ sourceTeamId: team.id })
			});
			if (!response.ok) {
				error = ((await response.json()) as { error?: string }).error ?? 'Could not use this team';
				return;
			}
			teams = null;
			teamQuery = '';
			await loadCandidates();
		} catch {
			error = 'Could not use this team';
		}
	}

	function pick(candidateId: string) {
		save(() =>
			fetch(`/api/kits/${kitId}/main-picture`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ candidateId })
			})
		);
	}

	let error = $state<string | null>(null);
	let busy = $state(false);
	let fileInput = $state<HTMLInputElement | null>(null);
	let urlOpen = $state(false);
	let urlText = $state('');
	let urlInput = $state<HTMLInputElement | null>(null);

	async function save(request: () => Promise<Response>) {
		busy = true;
		error = null;
		try {
			const response = await request();
			if (response.ok) {
				await invalidateAll();
				onDone();
			} else {
				error =
					((await response.json()) as { error?: string }).error ?? 'Could not set the main picture';
			}
		} catch {
			error = 'Could not set the main picture';
		} finally {
			busy = false;
		}
	}

	async function chooseFile() {
		const file = fileInput?.files?.[0];
		if (!file) return;
		let upload: Blob;
		try {
			upload = await shrinkImage(file);
		} catch {
			error = 'Could not read this image';
			return;
		} finally {
			if (fileInput) fileInput.value = '';
		}
		await save(() =>
			fetch(`/api/kits/${kitId}/main-picture-upload`, {
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
			fetch(`/api/kits/${kitId}/main-picture-url`, {
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
			aria-label="Saving the main picture"
			class="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/70"
		>
			<SpinnerIcon class="size-10 text-primary motion-safe:animate-spin" />
		</div>
	{/if}
	{#if listError}
		<p role="alert" class="text-sm text-destructive">{listError}</p>
	{:else if listing === null}
		<ul class="grid grid-cols-3 gap-3" aria-busy="true" aria-label="Loading pictures">
			{#each Array.from({ length: 6 }, (_, i) => i) as i (i)}
				<li class="aspect-square rounded-sm bg-muted motion-safe:animate-pulse"></li>
			{/each}
		</ul>
	{:else if listing.candidates.length === 0}
		<p class="text-sm text-muted-foreground">
			{listing.sourceTeamId
				? 'No pictures on TheSportsDB for this team.'
				: 'No TheSportsDB team found. Search one below.'}
		</p>
	{:else}
		<ul class="grid grid-cols-3 gap-3" aria-label="TheSportsDB pictures">
			{#each listing.candidates as candidate (candidate.id)}
				<li class="min-w-0" hidden={failed.includes(candidate.id)}>
					<button
						type="button"
						class="flex w-full min-w-0 cursor-pointer flex-col gap-1 text-start outline-ring focus-visible:outline-3 focus-visible:outline-solid disabled:opacity-50"
						disabled={busy}
						onclick={() => pick(candidate.id)}
					>
						<img
							src={candidate.imageUrl}
							alt=""
							loading="lazy"
							onerror={() => (failed = [...failed, candidate.id])}
							class="aspect-square w-full rounded-sm bg-muted object-contain"
						/>
						<span class="block truncate text-2xs leading-snug text-muted-foreground">
							{candidate.season ?? '?'} · {kitTypeLabel(candidate.kitType)}
						</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
	<form class="flex gap-2" onsubmit={searchTeams}>
		<Input
			type="search"
			bind:value={teamQuery}
			aria-label="Search TheSportsDB teams"
			placeholder="Search TheSportsDB teams"
			class="flex-1"
		/>
		<Button type="submit" disabled={!teamQuery.trim() || !listing} loading={searching}>
			Search
		</Button>
	</form>
	{#if teams}
		{#if teams.length === 0}
			<p class="text-sm text-muted-foreground">No team found</p>
		{:else}
			<ul class="flex flex-col gap-2" aria-label="TheSportsDB teams">
				{#each teams as team (team.id)}
					<li class="flex items-center justify-between gap-3 rounded-xl bg-card px-4 py-2">
						<span class="min-w-0">
							<span class="block font-medium">{team.name}</span>
							<span class="block text-sm text-muted-foreground">
								{team.league} · {team.country}
							</span>
						</span>
						<Button
							size="sm"
							intent={team.id === listing?.sourceTeamId ? 'success' : 'neutral'}
							onclick={() => useTeam(team)}
						>
							Use<span class="sr-only"> {team.name}</span>
						</Button>
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
	<p class="text-sm text-muted-foreground">Or a JPEG, PNG or WebP image under 2 MB.</p>
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
			aria-label="Upload a main picture"
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
