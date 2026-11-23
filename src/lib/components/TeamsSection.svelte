<script lang="ts">
	import { postAction } from '#lib/forms';
	import type { Country, TeamKind, TeamView } from '#lib/server/catalog/types';
	import Button from './Button.svelte';
	import Field from './Field.svelte';
	import Popup from './Popup.svelte';
	import Select from './Select.svelte';
	import ToggleGroup from './ToggleGroup.svelte';

	let { teams, countries }: { teams: TeamView[]; countries: Country[] } = $props();

	const kinds: { value: TeamKind; label: string }[] = [
		{ value: 'club', label: 'Club' },
		{ value: 'national', label: 'National Team' }
	];

	// Grouped by Country so that a long list stays readable.
	const groups = $derived(
		countries
			.map((country) => ({ country, teams: teams.filter((t) => t.country.id === country.id) }))
			.filter((group) => group.teams.length > 0)
	);

	let open = $state(false);
	let editing = $state<TeamView | null>(null);
	let name = $state('');
	let kind = $state<TeamKind>('club');
	let countryId = $state('');
	let error = $state<string | null>(null);
	let busy = $state(false);

	function show(team: TeamView) {
		editing = team;
		name = team.name;
		kind = team.kind;
		countryId = String(team.country.id);
		error = null;
		open = true;
	}

	async function save(event: SubmitEvent) {
		event.preventDefault();
		if (!editing) return;
		busy = true;
		const outcome = await postAction('?/editTeam', {
			teamId: editing.id,
			name,
			kind,
			countryId: Number(countryId)
		});
		busy = false;
		if (outcome.ok) open = false;
		else error = outcome.error;
	}
</script>

<section aria-labelledby="teams-heading" class="flex min-w-0 flex-col gap-3">
	<h2 id="teams-heading" class="font-display text-xl font-extrabold uppercase italic">Teams</h2>
	{#if groups.length === 0}
		<p class="text-sm text-muted-foreground">No teams yet: the jersey forms add them.</p>
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
								{kinds.find((k) => k.value === team.kind)?.label}
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

<Popup bind:open title="Edit team">
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
			<Button intent="success" type="submit" loading={busy}>Save</Button>
		</form>
	{/snippet}
</Popup>
