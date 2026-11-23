<script lang="ts">
	import { continents } from '#lib/countries';
	import { kitTypeLabels, labelOptions } from '#lib/labels';
	import type {
		Country,
		KitType,
		SeasonFormat,
		TeamChoice,
		TeamView
	} from '#lib/server/catalog/types';
	import Field from './Field.svelte';
	import Select from './Select.svelte';
	import TeamLookup from './TeamLookup.svelte';

	let {
		team = $bindable(),
		season = $bindable(),
		kitType = $bindable(),
		teams,
		countries,
		teamError = null
	}: {
		team: TeamChoice | null;
		season: string;
		kitType: KitType;
		teams: TeamView[];
		countries: Country[];
		teamError?: string | null;
	} = $props();

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
</script>

<!-- No wrapper: the fields are grid items of the form (two columns from `sm`). -->
<div class="flex flex-col gap-4 sm:col-span-2">
	<TeamLookup bind:value={team} {teams} countries={countryGroups} error={teamError} />
</div>
<Field label="Season" required placeholder={seasonPlaceholder} bind:value={season} />
<div class="flex flex-col gap-1.5">
	<span class="text-sm font-bold">Kit Type</span>
	<div class="flex">
		<Select label="Kit Type" bind:value={kitType} options={labelOptions(kitTypeLabels)} />
	</div>
</div>
