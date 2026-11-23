<script lang="ts">
	import { continents } from '#lib/countries';
	import { kitTypeLabels, labelOptions } from '#lib/labels';
	import { kitArchiveUrl } from '#lib/kit-archive';
	import { kitHasMainPicture } from '#lib/pictures';
	import type {
		Country,
		KitKey,
		KitType,
		KitView,
		SeasonFormat,
		TeamChoice,
		TeamView
	} from '#lib/server/catalog/types';
	import ExistingKits from './ExistingKits.svelte';
	import Field from './Field.svelte';
	import PictureInput from './PictureInput.svelte';
	import Select from './Select.svelte';
	import TeamLookup from './TeamLookup.svelte';

	let {
		team = $bindable(),
		season = $bindable(),
		kitType = $bindable(),
		comment = $bindable(''),
		mainPicture = $bindable(null),
		mainPictureUrl = $bindable(''),
		teams,
		countries,
		pictured,
		kits = [],
		teamError = null
	}: {
		team: TeamChoice | null;
		season: string;
		kitType: KitType;
		/** What a Special Kit is. Shown for the Special Kit Type only. */
		comment?: string;
		/** The "Main picture" file or address, empty when the Kit already has a Main Picture. */
		mainPicture?: File | null;
		mainPictureUrl?: string;
		teams: TeamView[];
		countries: Country[];
		/** Kits that have a Main Picture: no "Main picture" input for them. */
		pictured: KitKey[];
		/** Every Kit: the ones of the chosen Team can be picked. */
		kits?: KitView[];
		teamError?: string | null;
	} = $props();

	const hasMainPicture = $derived(kitHasMainPicture(pictured, team, season, kitType));
	// The Football Kit Archive page of the Kit the fields describe, once they are filled.
	const findUrl = $derived.by(() => {
		const choice = team;
		if (!choice || !season.trim()) return null;
		const name = 'teamId' in choice ? teams.find((t) => t.id === choice.teamId)?.name : choice.name;
		return name?.trim() ? kitArchiveUrl(name, season, kitType) : null;
	});
	// A picture chosen before the fields moved to a pictured Kit is not sent.
	$effect(() => {
		if (hasMainPicture) {
			mainPicture = null;
			mainPictureUrl = '';
		}
	});

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
	const teamKits = $derived(
		team && 'teamId' in team
			? kits.filter((k) => k.team.id === (team as { teamId: number }).teamId)
			: []
	);
	// An example of the format, not a suggestion.
	const seasonPlaceholder = $derived(
		seasonFormat === 'split'
			? 'e.g. 2024-25'
			: seasonFormat === 'calendar'
				? 'e.g. 2024'
				: 'e.g. 2024-25 or 2024'
	);
</script>

<!-- No wrapper: the fields are grid items of the form (two columns from `sm`). -->
<div class="flex flex-col gap-4 sm:col-span-2">
	<TeamLookup bind:value={team} {teams} countries={countryGroups} error={teamError} />
</div>
{#if teamKits.length > 0}
	<div class="flex flex-col gap-4 sm:col-span-2">
		<ExistingKits kits={teamKits} bind:season bind:kitType bind:comment />
	</div>
{/if}
<Field label="Season" required placeholder={seasonPlaceholder} bind:value={season} />
<div class="flex flex-col gap-1.5">
	<span class="text-sm font-bold">Kit Type</span>
	<div class="flex">
		<Select label="Kit Type" bind:value={kitType} options={labelOptions(kitTypeLabels)} />
	</div>
</div>
{#if kitType === 'special'}
	<Field label="Comment" placeholder="Anniversary, Pride…" bind:value={comment} />
{/if}
{#if !hasMainPicture}
	<PictureInput label="Main picture" bind:file={mainPicture} bind:url={mainPictureUrl} {findUrl} />
{/if}
