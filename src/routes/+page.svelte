<script lang="ts">
	import type { PageProps } from './$types';
	import type { CollectionJersey } from '#lib/server/catalog/types';
	import { continents } from '#lib/countries';
	import { formatCents, formatDate } from '#lib/format';
	import { fitLabels, kitTypeLabels, versionLabels } from '#lib/labels';
	import { mainPictureUrl } from '#lib/pictures';
	import { deleteRow } from '#lib/forms';
	import { kitPictures } from '#lib/kit-pictures.svelte';
	import AddPictures from '#lib/components/AddPictures.svelte';
	import { kitArchiveUrl } from '#lib/kit-archive';
	import AddAction from '#lib/components/AddAction.svelte';
	import Button from '#lib/components/Button.svelte';
	import DeleteAction from '#lib/components/DeleteAction.svelte';
	import JerseyForm from '#lib/components/JerseyForm.svelte';
	import Chip from '#lib/components/Chip.svelte';
	import CoverageMap from '#lib/components/CoverageMap.svelte';
	import CountryFilter from '#lib/components/CountryFilter.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import LoginAction from '#lib/components/LoginAction.svelte';
	import Popup from '#lib/components/Popup.svelte';
	import SearchField from '#lib/components/SearchField.svelte';
	import Select from '#lib/components/Select.svelte';
	import SortDirection from '#lib/components/SortDirection.svelte';
	import StickyBar from '#lib/components/StickyBar.svelte';
	import Tile from '#lib/components/Tile.svelte';
	import TileGrid from '#lib/components/TileGrid.svelte';

	let { data }: PageProps = $props();

	const sorts = [
		{ value: 'acquired', label: 'Sort: acquired' },
		{ value: 'team', label: 'Sort: team' },
		{ value: 'season', label: 'Sort: season' }
	];

	// The usual direction of each sort: the latest first for season and acquired.
	const usualDirection: Record<string, string> = { acquired: 'desc', team: 'asc', season: 'desc' };

	// Filters are page state, not in the URL. They run here, over the loaded list.
	let search = $state('');
	let selectedCountries = $state<string[]>([]);
	let sort = $state('acquired');
	let direction = $derived(usualDirection[sort]);

	const compareText = (a: string, b: string) =>
		a.localeCompare(b, undefined, { sensitivity: 'base' });
	const acquiredOn = (j: CollectionJersey) =>
		j.acquisition.kind === 'gift' ? j.acquisition.date : j.acquisition.bought;
	const sortKeys: Record<string, (a: CollectionJersey, b: CollectionJersey) => number> = {
		acquired: (a, b) =>
			acquiredOn(a) < acquiredOn(b) ? -1 : acquiredOn(a) > acquiredOn(b) ? 1 : 0,
		team: (a, b) => compareText(a.kit.team.name, b.kit.team.name),
		season: (a, b) => parseInt(a.kit.season) - parseInt(b.kit.season)
	};

	const totalSpentCents = $derived(
		data.jerseys.reduce(
			(sum, j) => sum + (j.acquisition.kind === 'purchase' ? (j.acquisition.priceCents ?? 0) : 0),
			0
		)
	);

	// Only Countries with a Jersey, under their Continent.
	const countryGroups = $derived.by(() => {
		const present = new Map(data.jerseys.map((j) => [j.kit.team.country.id, j.kit.team.country]));
		return continents
			.map((continent) => ({
				continent: continent.label,
				countries: [...present.values()]
					.filter((c) => c.continent === continent.value)
					.sort((a, b) => compareText(a.name, b.name))
					.map((c) => ({ id: String(c.id), name: c.name }))
			}))
			.filter((group) => group.countries.length > 0);
	});

	const query = $derived(search.trim().toLocaleLowerCase());
	const isFiltering = $derived(query !== '' || selectedCountries.length > 0);
	const jerseys = $derived.by(() => {
		const order = direction === 'asc' ? 1 : -1;
		return data.jerseys
			.filter(
				(j) =>
					(!query || `${j.kit.team.name} ${j.print ?? ''}`.toLocaleLowerCase().includes(query)) &&
					(selectedCountries.length === 0 ||
						selectedCountries.includes(String(j.kit.team.country.id)))
			)
			.sort(
				(a, b) =>
					sortKeys[sort](a, b) * order ||
					compareText(a.kit.team.name, b.kit.team.name) ||
					b.id - a.id
			);
	});

	function clearFilters() {
		search = '';
		selectedCountries = [];
	}

	const caption = (j: CollectionJersey) => `${j.kit.season} · ${kitTypeLabels[j.kit.kitType]}`;

	let selectedId = $state<number | null>(null);
	const selected = $derived(data.jerseys.find((j) => j.id === selectedId) ?? null);
	let anchor = $state<HTMLElement | null>(null);
	let open = $state(false);
	const pictures = kitPictures(() => selected?.kit.id ?? null);

	// Owner: "Edit" turns the Jersey Popup into the JerseyForm. "Delete" asks first.
	let editing = $state(false);

	function select(jersey: CollectionJersey, el: HTMLElement) {
		editing = false;
		selectedId = jersey.id;
		anchor = el;
		open = true;
	}
</script>

<svelte:head><title>Jerseys | Collection</title></svelte:head>

<StickyBar
	current="collection"
	searchActive={query !== ''}
	filtersActive={selectedCountries.length > 0}
>
	{#snippet chips()}
		<Chip tone="highlight" label="jerseys" value={String(data.jerseys.length)} />
		<Chip tone="success" label="spent" value={formatCents(totalSpentCents)} />
	{/snippet}
	{#snippet login()}
		<LoginAction isOwner={data.isOwner} />
	{/snippet}
	{#snippet action()}
		{#if data.form}
			{@const lists = data.form}
			<AddAction title="Add a jersey">
				{#snippet form(close)}
					<JerseyForm {...lists} onDone={close} />
				{/snippet}
			</AddAction>
		{/if}
	{/snippet}
	{#snippet searchBox()}
		<SearchField
			bind:value={search}
			label="Search team or print"
			placeholder="Search team or print"
		/>
	{/snippet}
	{#snippet controls()}
		<CountryFilter bind:value={selectedCountries} groups={countryGroups} />
		<Select bind:value={sort} label="Sort by" options={sorts} />
		<SortDirection bind:value={direction} />
	{/snippet}
</StickyBar>

<main>
	<div
		class="ps-[max(1rem,env(safe-area-inset-left))] pe-[max(1rem,env(safe-area-inset-right))] pb-4"
	>
		<CoverageMap countries={data.coverage} jerseys={data.jerseys} />
	</div>
	{#if data.jerseys.length === 0}
		<EmptyState message="No jerseys yet" />
	{:else if jerseys.length === 0}
		<EmptyState message="No match">
			{#snippet action()}
				{#if isFiltering}
					<Button onclick={clearFilters}>Clear filters</Button>
				{/if}
			{/snippet}
		</EmptyState>
	{:else}
		<TileGrid>
			{#each jerseys as jersey (jersey.id)}
				<li class="min-w-0">
					<Tile
						team={jersey.kit.team.name}
						season={jersey.kit.season}
						kitType={kitTypeLabels[jersey.kit.kitType]}
						mainPictureUrl={mainPictureUrl(jersey.kit)}
						onSelect={(el) => select(jersey, el)}
					/>
				</li>
			{/each}
		</TileGrid>
	{/if}
</main>

{#snippet row(label: string, value: string | null | undefined)}
	{#if value}
		<dt class="text-muted-foreground">{label}</dt>
		<dd>{value}</dd>
	{/if}
{/snippet}

{#snippet editAction()}
	<Button onclick={() => (editing = true)}>Edit</Button>
	{#if selected}
		{@const jersey = selected}
		<DeleteAction
			what={`${jersey.kit.team.name} ${caption(jersey)}`}
			text="This deletes the jersey from the collection. Its Kit stays."
			onDelete={() => deleteRow('?/deleteJersey', jersey.id, () => (open = false))}
		/>
		<AddPictures kitId={jersey.kit.id} onAdded={pictures.reload} />
	{/if}
{/snippet}

{#snippet pictureAction(index: number)}
	<DeleteAction
		what="this picture"
		text="Every Jersey and the Wishlist Item of this Kit lose it."
		onDelete={() => pictures.delete(index)}
	/>
{/snippet}

{#if selected}
	<Popup
		bind:open
		{anchor}
		title={editing ? 'Edit jersey' : selected.kit.team.name}
		subtitle={caption(selected)}
		mainPictureUrl={mainPictureUrl(selected.kit)}
		pictureUrls={pictures.urls}
		wide={editing}
		actions={data.form && !editing ? editAction : undefined}
		pictureAction={data.form && !editing ? pictureAction : undefined}
		findPicturesUrl={data.form && !editing
			? kitArchiveUrl(selected.kit.team.name, selected.kit.season, selected.kit.kitType)
			: null}
	>
		{#snippet details()}
			{@const a = selected.acquisition}
			{#if editing && data.form}
				<JerseyForm jersey={selected} {...data.form} onDone={() => (editing = false)} />
			{:else}
				<dl
					class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-md [&_dd]:font-bold [&_dd]:[overflow-wrap:anywhere]"
				>
					{@render row('Version', versionLabels[selected.version])}
					{@render row('Print', selected.print)}
					{@render row('Size', selected.size)}
					{@render row('Fit', selected.fit && fitLabels[selected.fit])}
					{#if a.kind === 'purchase'}
						{@render row('Store', a.store?.name)}
						{@render row('Price', a.priceCents === null ? null : formatCents(a.priceCents))}
						{@render row('Bought', formatDate(a.bought))}
						{@render row('Sent', a.sent && formatDate(a.sent))}
						{@render row('Received', a.received && formatDate(a.received))}
					{:else}
						{@render row('Acquired', 'Gift')}
						{@render row('Date', formatDate(a.date))}
						{@render row('From', a.giver)}
					{/if}
				</dl>
			{/if}
		{/snippet}
	</Popup>
{/if}
