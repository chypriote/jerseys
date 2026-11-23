<script lang="ts">
	import { untrack } from 'svelte';
	import { continents } from '#lib/countries';
	import {
		acquisitionState,
		addStore,
		emptyAcquisition,
		postAction,
		toAcquisitionInput
	} from '#lib/forms';
	import { fitLabels, kitTypeLabels, versionLabels } from '#lib/labels';
	import type {
		CollectionJersey,
		Country,
		Fit,
		KitType,
		SeasonFormat,
		Size,
		Store,
		TeamChoice,
		TeamView,
		Version
	} from '#lib/server/catalog/types';
	import AcquisitionFields from './AcquisitionFields.svelte';
	import Button from './Button.svelte';
	import Field from './Field.svelte';
	import Select from './Select.svelte';
	import TeamLookup from './TeamLookup.svelte';
	import ToggleGroup from './ToggleGroup.svelte';

	let {
		jersey = null,
		teams,
		countries,
		stores,
		onDone
	}: {
		/** Set to edit this Jersey: the form starts from it. */
		jersey?: CollectionJersey | null;
		teams: TeamView[];
		countries: Country[];
		stores: Store[];
		/** Save succeeded, or Cancel. */
		onDone: () => void;
	} = $props();

	const options = <T extends string>(labels: Record<T, string>) =>
		(Object.entries(labels) as [T, string][]).map(([value, label]) => ({ value, label }));

	// The form is mounted per opening, so the starting values are read once.
	const start = untrack(() => jersey);
	let team = $state<TeamChoice | null>(start ? { teamId: start.kit.team.id } : null);
	let season = $state(start?.kit.season ?? '');
	let kitType = $state<KitType>(start?.kit.kitType ?? 'home');
	let version = $state<Version>(start?.version ?? 'fan');
	// Imported Jerseys may have no Size or Fit: the form then asks for one.
	let size = $state<Size>(start?.size ?? 'M');
	let fit = $state<Fit>(start?.fit ?? 'good');
	let print = $state(start?.print ?? '');
	let acquisition = $state(start ? acquisitionState(start.acquisition) : emptyAcquisition());
	let error = $state<string | null>(null);
	let teamError = $state<string | null>(null);
	let busy = $state(false);

	const countryGroups = $derived(
		continents
			.map((continent) => ({
				continent: continent.label,
				countries: countries
					.filter((c) => c.continent === continent.value)
					.map((c) => ({ id: String(c.id), name: c.name }))
			}))
			.filter((group) => group.countries.length > 0)
	);

	// GLOSSARY: a National Team's Season is one year; a Club follows its League.
	const seasonFormat = $derived.by((): SeasonFormat | null => {
		if (!team) return null;
		if ('teamId' in team) {
			const id = team.teamId;
			return teams.find((t) => t.id === id)?.seasonFormat ?? null;
		}
		if (team.kind === 'national') return 'calendar';
		const countryId = team.countryId;
		return countries.find((c) => c.id === countryId)?.league.seasonFormat ?? null;
	});
	const seasonPlaceholder = $derived(
		seasonFormat === 'split' ? '2024-25' : seasonFormat === 'calendar' ? '2024' : '2024-25 or 2024'
	);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		teamError = null;
		if (!team) {
			teamError = 'Pick a team, or add it as a new team';
			return;
		}
		if (!('teamId' in team) && !team.countryId) {
			teamError = 'Choose the Country of the new team';
			return;
		}
		const acquisitionInput = toAcquisitionInput(acquisition);
		if (typeof acquisitionInput === 'string') {
			error = acquisitionInput;
			return;
		}
		busy = true;
		const input = {
			team,
			season,
			kitType,
			version,
			size,
			fit,
			print: print.trim() || null,
			acquisition: acquisitionInput
		};
		const outcome = jersey
			? await postAction('?/editJersey', { ...input, id: jersey.id })
			: await postAction('?/addJersey', input);
		busy = false;
		if (outcome.ok) onDone();
		else error = outcome.error;
	}
</script>

<!-- Two columns from `sm` (Popup `wide`). -->
<form class="grid grid-cols-1 gap-4 sm:grid-cols-2" onsubmit={submit}>
	<div class="flex flex-col gap-4 sm:col-span-2">
		<TeamLookup bind:value={team} {teams} countries={countryGroups} error={teamError} />
	</div>
	<Field label="Season" required placeholder={seasonPlaceholder} bind:value={season} />
	<div class="flex flex-col gap-1.5">
		<span class="text-sm font-bold">Kit Type</span>
		<div class="flex">
			<Select label="Kit Type" bind:value={kitType} options={options(kitTypeLabels)} />
		</div>
	</div>
	<ToggleGroup label="Version" bind:value={version} options={options(versionLabels)} />
	<ToggleGroup
		label="Size"
		bind:value={size}
		options={(['S', 'M', 'L'] as const).map((s) => ({ value: s, label: s }))}
	/>
	<ToggleGroup label="Fit" bind:value={fit} options={options(fitLabels)} />
	<Field label="Print" bind:value={print} />
	<AcquisitionFields bind:acquisition {stores} onAddStore={addStore} />
	{#if error}
		<p class="text-sm font-bold text-destructive sm:col-span-2" role="alert">! {error}</p>
	{/if}
	<div class="flex flex-wrap justify-end gap-2 sm:col-span-2">
		<Button onclick={onDone}>Cancel</Button>
		<Button intent="success" type="submit" loading={busy}>Save</Button>
	</div>
</form>
