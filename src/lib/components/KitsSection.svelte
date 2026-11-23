<script lang="ts">
	import { page } from '$app/state';
	import { deleteRow, mainPictureUpload, postAction } from '#lib/forms';
	import { mainPictureUrl as pictureUrlOf } from '#lib/pictures';
	import { matchesSearch } from '#lib/search';
	import { kitLabel, kitTypeLabels, labelOptions } from '#lib/labels';
	import type { KitType, KitView, TeamView } from '#lib/server/catalog/types';
	import Button from './Button.svelte';
	import DeleteAction from './DeleteAction.svelte';
	import Field from './Field.svelte';
	import MainPicture from './MainPicture.svelte';
	import PictureInput from './PictureInput.svelte';
	import Popup from './Popup.svelte';
	import SearchField from './SearchField.svelte';
	import Select from './Select.svelte';

	let { kits, teams }: { kits: KitView[]; teams: TeamView[] } = $props();

	// A link from the Edit team dialog arrives with the Kit in `?search=`.
	let search = $state(page.url.searchParams.get('search') ?? '');
	const shown = $derived(
		kits.filter((k) => matchesSearch(search, k.team.name, k.season, kitTypeLabels[k.kitType]))
	);

	// Grouped by Team (the Catalog lists Kits by Team, then Season, then Kit Type).
	const groups = $derived(
		shown.reduce<{ team: KitView['team']; kits: KitView[] }[]>((all, kit) => {
			const last = all.at(-1);
			if (last?.team.id === kit.team.id) last.kits.push(kit);
			else all.push({ team: kit.team, kits: [kit] });
			return all;
		}, [])
	);

	let open = $state(false);
	let editing = $state<KitView | null>(null);
	let season = $state('');
	let kitType = $state<KitType>('home');
	let mainPicture = $state<File | null>(null);
	let mainPictureUrl = $state('');
	let error = $state<string | null>(null);
	let busy = $state(false);

	const label = (kit: KitView) => kitLabel(kit.team.name, kit.season, kit.kitType);

	// The Season follows the Team's Season Format.
	const seasonPlaceholder = $derived(
		teams.find((t) => t.id === editing?.team.id)?.seasonFormat === 'calendar' ? '2024' : '2024-25'
	);

	function show(kit: KitView) {
		editing = kit;
		season = kit.season;
		kitType = kit.kitType;
		mainPicture = null;
		mainPictureUrl = '';
		error = null;
		open = true;
	}

	async function save(event: SubmitEvent) {
		event.preventDefault();
		if (!editing) return;
		busy = true;
		const upload = await mainPictureUpload(mainPicture);
		if (typeof upload === 'string') {
			busy = false;
			error = upload;
			return;
		}
		const outcome = await postAction(
			'?/editKit',
			{ kitId: editing.id, season, kitType, mainPictureUrl: mainPictureUrl.trim() || undefined },
			upload
		);
		busy = false;
		if (outcome.ok) open = false;
		else error = outcome.error;
	}
</script>

<section aria-labelledby="kits-heading" class="flex min-w-0 flex-col gap-3">
	<h2 id="kits-heading" class="font-display text-xl font-extrabold uppercase italic">Kits</h2>
	<!-- SearchField sizes itself for a row (basis-48), so a row wrapper keeps it one line tall. -->
	<div class="flex">
		<SearchField bind:value={search} label="Search kits" placeholder="Search kits" />
	</div>
	{#if groups.length === 0}
		<p class="text-sm text-muted-foreground">
			{search.trim() ? 'No kit matches.' : 'No kits yet: the jersey forms add them.'}
		</p>
	{/if}
	{#each groups as group (group.team.id)}
		<div class="flex flex-col gap-2">
			<h3 class="text-sm font-bold text-muted-foreground">{group.team.name}</h3>
			<ul class="flex flex-col gap-2">
				{#each group.kits as kit (kit.id)}
					<li class="flex items-center justify-between gap-3 rounded-xl bg-card px-4 py-2">
						<div class="flex min-w-0 items-center gap-3">
							<div
								class="flex size-12 shrink-0 items-center justify-center rounded-lg bg-background"
							>
								<MainPicture url={pictureUrlOf(kit)} />
							</div>
							<span class="font-medium">{kit.season} · {kitTypeLabels[kit.kitType]}</span>
						</div>
						<Button size="sm" onclick={() => show(kit)}>
							Edit<span class="sr-only"> {label(kit)}</span>
						</Button>
					</li>
				{/each}
			</ul>
		</div>
	{/each}
</section>

<Popup bind:open title={editing ? `Edit ${label(editing)}` : 'Edit kit'}>
	{#snippet details()}
		<form class="flex flex-col gap-4" onsubmit={save}>
			<Field label="Season" required placeholder={seasonPlaceholder} bind:value={season} {error} />
			<div class="flex flex-col gap-1.5">
				<span class="text-sm font-bold">Kit Type</span>
				<Select label="Kit Type" bind:value={kitType} options={labelOptions(kitTypeLabels)} />
			</div>
			<PictureInput label="Main picture" bind:file={mainPicture} bind:url={mainPictureUrl} />
			<Button intent="success" type="submit" loading={busy}>Save</Button>
		</form>
	{/snippet}
	{#snippet actions()}
		{#if editing}
			{@const row = editing}
			<DeleteAction
				what={label(row)}
				text="This deletes the kit with its main picture and pictures. A kit that jerseys or a wishlist item use cannot be deleted."
				onDelete={() => deleteRow('?/deleteKit', row.id, () => (open = false))}
			/>
		{/if}
	{/snippet}
</Popup>
