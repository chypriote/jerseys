<script lang="ts">
	import { untrack } from 'svelte';
	import { continents, seasonFormats } from '#lib/countries';
	import { postAction } from '#lib/forms';
	import type { Continent, Country, SeasonFormat } from '#lib/server/catalog/types';
	import Button from './Button.svelte';
	import Field from './Field.svelte';
	import Select from './Select.svelte';

	/** `country` set: edits it and its League. Unset: adds a Country with its League. */
	let { country = null, onSuccess }: { country?: Country | null; onSuccess: () => void } = $props();

	// The form starts from the Country; the caller re-creates it for another Country.
	const start = untrack(() => country);
	let name = $state(start?.name ?? '');
	let continent = $state<Continent>(start?.continent ?? 'europe');
	let leagueName = $state(start?.league.name ?? '');
	let seasonFormat = $state<SeasonFormat>(start?.league.seasonFormat ?? 'split');
	let error = $state<string | null>(null);
	let busy = $state(false);

	async function save(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		const input = { name, continent, leagueName, seasonFormat };
		const outcome = country
			? await postAction('?/editCountry', { ...input, id: country.id })
			: await postAction('?/addCountry', input);
		busy = false;
		if (outcome.ok) {
			error = null;
			onSuccess();
		} else {
			error = outcome.error;
		}
	}
</script>

<form class="flex flex-col gap-4" onsubmit={save}>
	<Field label="Name" required bind:value={name} {error} />
	<div class="flex flex-col gap-1.5">
		<span class="text-sm font-bold">Continent</span>
		<Select label="Continent" bind:value={continent} options={continents} />
	</div>
	<Field label="League" required bind:value={leagueName} />
	<div class="flex flex-col gap-1.5">
		<span class="text-sm font-bold">Season Format</span>
		<Select
			label="Season Format"
			bind:value={seasonFormat}
			options={seasonFormats.map((f) => ({
				value: f.value,
				label: f.value === 'split' ? 'Season (2023-24)' : 'Calendar (2024)'
			}))}
		/>
	</div>
	<Button intent="success" type="submit" loading={busy}>Save</Button>
</form>
