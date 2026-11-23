<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { deleteRow, postAction } from '#lib/forms';
	import { kitLabel, kitTypeLabels } from '#lib/labels';
	import { jerseyCount } from '#lib/format-count';
	import { matchesSearch } from '#lib/search';
	import type { Country, KitView, TeamKind, TeamView } from '#lib/server/catalog/types';
	import Button from './Button.svelte';
	import DeleteAction from './DeleteAction.svelte';
	import Field from './Field.svelte';
	import FormActions from './FormActions.svelte';
	import Popup from './Popup.svelte';
	import SearchField from './SearchField.svelte';
	import Select from './Select.svelte';
	import ToggleGroup from './ToggleGroup.svelte';

	let {
		teams,
		countries,
		kits,
		counts
	}: {
		teams: TeamView[];
		countries: Country[];
		kits: KitView[];
		counts: Record<number, number>;
	} = $props();

	const kinds: { value: TeamKind; label: string }[] = [
		{ value: 'club', label: 'Club' },
		{ value: 'national', label: 'National Team' }
	];

	// A link from the Edit kit dialog arrives with the Team in `?search=`.
	let search = $state(page.url.searchParams.get('search') ?? '');

	// Grouped by Country so that a long list stays readable.
	const groups = $derived(
		countries
			.map((country) => ({
				country,
				teams: teams.filter(
					(t) => t.country.id === country.id && matchesSearch(search, t.name, country.name)
				)
			}))
			.filter((group) => group.teams.length > 0)
	);

	let open = $state(false);
	let editing = $state<TeamView | null>(null);
	let name = $state('');
	let kind = $state<TeamKind>('club');
	let countryId = $state('');
	let error = $state<string | null>(null);
	let busy = $state(false);

	/** `team` set: edits it. Null: adds a Team. */
	function show(team: TeamView | null) {
		editing = team;
		name = team?.name ?? '';
		kind = team?.kind ?? 'club';
		countryId = String(team?.country.id ?? countries[0]?.id ?? '');
		error = null;
		open = true;
	}

	async function save(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		const input = { name, kind, countryId: Number(countryId) };
		const outcome = editing
			? await postAction('?/editTeam', { ...input, teamId: editing.id })
			: await postAction('?/addTeam', input);
		busy = false;
		if (outcome.ok) open = false;
		else error = outcome.error;
	}
</script>

<section aria-labelledby="teams-heading" class="flex min-w-0 flex-col gap-3">
	<div class="flex items-center justify-between gap-3">
		<h2 id="teams-heading" class="font-display text-xl font-extrabold uppercase italic">Teams</h2>
		<Button intent="success" size="sm" onclick={() => show(null)}>Add a team</Button>
	</div>
	<!-- SearchField sizes itself for a row (basis-48), so a row wrapper keeps it one line tall. -->
	<div class="flex">
		<SearchField bind:value={search} label="Search teams" placeholder="Search teams" />
	</div>
	{#if groups.length === 0}
		<p class="text-sm text-muted-foreground">
			{search.trim() ? 'No team matches.' : 'No teams yet.'}
		</p>
	{/if}
	{#each groups as group (group.country.id)}
		<div class="flex flex-col gap-2">
			<h3 class="text-sm font-bold text-muted-foreground">
				{group.country.name} · {group.country.league.name}
			</h3>
			<ul class="flex flex-col gap-2">
				{#each group.teams as team (team.id)}
					<li class="flex items-center justify-between gap-3 rounded-xl bg-card px-4 py-2">
						<div class="flex min-w-0 flex-col">
							<span class="font-medium">{team.name}</span>
							<span class="text-sm text-muted-foreground">
								{kinds.find((k) => k.value === team.kind)?.label} · {jerseyCount(counts[team.id])}
							</span>
						</div>
						<Button size="sm" onclick={() => show(team)}>
							Edit<span class="sr-only"> {team.name}</span>
						</Button>
					</li>
				{/each}
			</ul>
		</div>
	{/each}
</section>

<Popup bind:open title={editing ? 'Edit team' : 'Add a team'}>
	{#snippet details()}
		<form class="flex flex-col gap-4" onsubmit={save}>
			<Field label="Name" required bind:value={name} {error} />
			<ToggleGroup label="Kind" bind:value={kind} options={kinds} />
			<div class="flex flex-col gap-1.5">
				<span class="text-sm font-bold">Country</span>
				<Select
					label="Country"
					bind:value={countryId}
					options={countries.map((c) => ({ value: String(c.id), label: c.name }))}
				/>
			</div>
			<FormActions {busy}>
				{#snippet remove()}
					{#if editing}
						{@const row = editing}
						<DeleteAction
							what={row.name}
							text="This deletes the team. A team with kits cannot be deleted."
							onDelete={() => deleteRow('?/deleteTeam', row.id, () => (open = false))}
						/>
					{/if}
				{/snippet}
			</FormActions>
		</form>
		{#if editing}
			{@const teamKits = kits.filter((k) => k.team.id === editing!.id)}
			{#if teamKits.length > 0}
				<div class="flex flex-col gap-1.5">
					<span class="text-sm font-bold">Kits</span>
					<ul class="flex flex-col gap-1">
						{#each teamKits as kit (kit.id)}
							<li>
								<a
									class="underline"
									href="{resolve('/admin/kits')}?search={encodeURIComponent(
										kitLabel(kit.team.name, kit.season, kit.kitType)
									)}"
								>
									{kit.season} · {kitTypeLabels[kit.kitType]}
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		{/if}
	{/snippet}
</Popup>
