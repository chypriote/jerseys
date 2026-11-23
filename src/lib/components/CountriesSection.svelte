<script lang="ts">
	import { continents, seasonFormats } from '#lib/countries';
	import type { Country } from '#lib/server/catalog/types';
	import { deleteRow } from '#lib/forms';
	import { jerseyCount } from '#lib/format-count';
	import { matchesSearch } from '#lib/search';
	import Button from './Button.svelte';
	import DeleteAction from './DeleteAction.svelte';
	import CountryForm from './CountryForm.svelte';
	import Popup from './Popup.svelte';
	import SearchField from './SearchField.svelte';

	let { countries, counts }: { countries: Country[]; counts: Record<number, number> } = $props();

	let search = $state('');
	const shown = $derived(
		countries.filter((c) =>
			matchesSearch(search, c.name, c.league.name, continentLabel(c.continent) ?? '')
		)
	);

	let open = $state(false);
	/** The Country being edited; null while adding. */
	let editing = $state<Country | null>(null);

	function show(country: Country | null) {
		editing = country;
		open = true;
	}

	const continentLabel = (value: string) => continents.find((c) => c.value === value)?.label;
	const formatLabel = (value: string) => seasonFormats.find((f) => f.value === value)?.label;
</script>

<section aria-labelledby="countries-heading" class="flex min-w-0 flex-col gap-3">
	<div class="flex items-center justify-between gap-3">
		<h2 id="countries-heading" class="font-display text-xl font-extrabold uppercase italic">
			Countries
		</h2>
		<Button intent="success" size="sm" onclick={() => show(null)}>Add a country</Button>
	</div>
	<!-- SearchField sizes itself for a row (basis-48), so a row wrapper keeps it one line tall. -->
	<div class="flex">
		<SearchField bind:value={search} label="Search countries" placeholder="Search countries" />
	</div>
	<ul class="flex flex-col gap-2">
		{#each shown as country (country.id)}
			<li class="flex items-center justify-between gap-3 rounded-xl bg-card px-4 py-2">
				<div class="flex min-w-0 flex-col">
					<span class="font-medium">{country.name}</span>
					<span class="text-sm text-muted-foreground">
						{continentLabel(country.continent)} · {country.league.name} · {formatLabel(
							country.league.seasonFormat
						)} · {jerseyCount(counts[country.id])}
					</span>
				</div>
				<Button size="sm" onclick={() => show(country)}>
					Edit<span class="sr-only"> {country.name}</span>
				</Button>
			</li>
		{/each}
	</ul>
</section>

<Popup bind:open title={editing ? 'Edit country' : 'Add a country'}>
	{#snippet details()}
		{#key editing}
			<CountryForm country={editing} onSuccess={() => (open = false)} />
		{/key}
	{/snippet}
	{#snippet actions()}
		{#if editing}
			{@const row = editing}
			<DeleteAction
				what={row.name}
				text="This deletes the country and its league. A country that teams use cannot be deleted."
				onDelete={() => deleteRow('?/deleteCountry', row.id, () => (open = false))}
			/>
		{/if}
	{/snippet}
</Popup>
