<script lang="ts">
	import { untrack } from 'svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { deleteRow, mainPictureUpload, postAction } from '#lib/forms';
	import { mainPictureUrl as pictureUrlOf } from '#lib/pictures';
	import { kitArchiveUrl } from '#lib/kit-archive';
	import { matchesSearch } from '#lib/search';
	import { seasonChoices } from '#lib/seasons';
	import { kitLabel, kitTypeLabels, kitTypeText, labelOptions } from '#lib/labels';
	import type { Country, KitKey, KitType, KitView, TeamView } from '#lib/server/catalog/types';
	import Button from './Button.svelte';
	import DeleteAction from './DeleteAction.svelte';
	import Field from './Field.svelte';
	import FormActions from './FormActions.svelte';
	import MainPicture from './MainPicture.svelte';
	import PictureInput from './PictureInput.svelte';
	import KitAddForm from './KitAddForm.svelte';
	import Popup from './Popup.svelte';
	import SearchField from './SearchField.svelte';
	import { Toggle } from './ui/toggle/index.js';
	import Select from './Select.svelte';

	let {
		kits,
		teams,
		countries,
		pictured
	}: { kits: KitView[]; teams: TeamView[]; countries: Country[]; pictured: KitKey[] } = $props();

	// A link from the Teams page arrives with the Team of the new Kit in `?addKit=`.
	const linkedTeam = Number(page.url.searchParams.get('addKit')) || null;
	const start = untrack(() => (teams.some((t) => t.id === linkedTeam) ? linkedTeam : null));
	let addingFor = $state<number | null>(start);
	let adding = $state(start !== null);

	// A link from the Edit team dialog arrives with the Kit in `?search=`.
	let search = $state(page.url.searchParams.get('search') ?? '');
	let unpicturedOnly = $state(false);
	const shown = $derived(
		kits.filter(
			(k) =>
				(!unpicturedOnly || !k.mainPictureKey) &&
				matchesSearch(search, k.team.name, k.season, kitTypeLabels[k.kitType])
		)
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
	let comment = $state('');
	let mainPicture = $state<File | null>(null);
	let mainPictureUrl = $state('');
	let error = $state<string | null>(null);
	let busy = $state(false);

	const label = (kit: KitView) => kitLabel(kit.team.name, kit.season, kit.kitType);

	// The Season is chosen from the Team's Season Format.
	const seasonOptions = $derived.by(() => {
		const format = teams.find((t) => t.id === editing?.team.id)?.seasonFormat ?? 'split';
		return seasonChoices(
			format,
			new Date(),
			kits.map((k) => k.season),
			editing?.season
		).map((s) => ({ value: s, label: s }));
	});

	function show(kit: KitView) {
		editing = kit;
		season = kit.season;
		kitType = kit.kitType;
		comment = kit.comment ?? '';
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
			{
				kitId: editing.id,
				season,
				kitType,
				comment: comment.trim() || null,
				mainPictureUrl: mainPictureUrl.trim() || undefined
			},
			upload
		);
		busy = false;
		if (outcome.ok) open = false;
		else error = outcome.error;
	}
</script>

<section aria-labelledby="kits-heading" class="flex min-w-0 flex-col gap-3">
	<div class="flex items-center justify-between gap-3">
		<h2 id="kits-heading" class="font-display text-xl font-extrabold uppercase italic">Kits</h2>
		<Button
			intent="success"
			size="sm"
			onclick={() => {
				addingFor = null;
				adding = true;
			}}
		>
			Add a kit
		</Button>
	</div>
	<!-- SearchField sizes itself for a row (basis-48), so a row wrapper keeps it one line tall. -->
	<div class="flex flex-wrap gap-2">
		<SearchField bind:value={search} label="Search kits" placeholder="Search kits" />
		<Toggle bind:pressed={unpicturedOnly}>No main picture</Toggle>
	</div>
	{#if groups.length === 0}
		<p class="text-sm text-muted-foreground">
			{search.trim() || unpicturedOnly ? 'No kit matches.' : 'No kits yet.'}
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
							<span class="font-medium">{kit.season} · {kitTypeText(kit)}</span>
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
			<div class="flex flex-col gap-1.5">
				<span class="text-sm font-bold">Season</span>
				<div class="flex">
					<Select label="Season" bind:value={season} options={seasonOptions} />
				</div>
				{#if error}
					<p class="text-sm font-bold text-destructive" role="alert">! {error}</p>
				{/if}
			</div>
			<div class="flex flex-col gap-1.5">
				<span class="text-sm font-bold">Kit Type</span>
				<Select label="Kit Type" bind:value={kitType} options={labelOptions(kitTypeLabels)} />
			</div>
			{#if kitType === 'special'}
				<Field label="Comment" placeholder="Anniversary, Pride…" bind:value={comment} />
			{/if}
			<PictureInput
				label="Main picture"
				bind:file={mainPicture}
				bind:url={mainPictureUrl}
				findUrl={editing && season.trim()
					? kitArchiveUrl(editing.team.name, season, kitType)
					: null}
			/>
			<FormActions {busy}>
				{#snippet remove()}
					{#if editing}
						{@const row = editing}
						<DeleteAction
							what={label(row)}
							text="This deletes the kit with its main picture and pictures. A kit that jerseys or a wishlist item use cannot be deleted."
							onDelete={() => deleteRow('?/deleteKit', row.id, () => (open = false))}
						/>
					{/if}
				{/snippet}
			</FormActions>
		</form>
		{#if editing}
			<a
				class="self-start font-bold underline"
				href="{resolve('/admin/teams')}?search={encodeURIComponent(editing.team.name)}"
			>
				Edit {editing.team.name}
			</a>
		{/if}
	{/snippet}
</Popup>

<Popup bind:open={adding} wide title="Add a kit">
	{#snippet details()}
		{#if adding}
			<KitAddForm
				{teams}
				{countries}
				{pictured}
				{kits}
				teamId={addingFor}
				onSuccess={() => (adding = false)}
			/>
		{/if}
	{/snippet}
</Popup>
