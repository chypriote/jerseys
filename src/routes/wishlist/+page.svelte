<script lang="ts">
	import type { PageProps } from './$types';
	import type { Desire, WishlistItem } from '#lib/server/catalog/types';
	import { continents } from '#lib/countries';
	import { kitTypeLabels, versionLabels } from '#lib/labels';
	import { mainPictureUrl } from '#lib/pictures';
	import { postAction } from '#lib/forms';
	import AddAction from '#lib/components/AddAction.svelte';
	import Button from '#lib/components/Button.svelte';
	import Chip from '#lib/components/Chip.svelte';
	import CountryFilter from '#lib/components/CountryFilter.svelte';
	import DesireDots from '#lib/components/DesireDots.svelte';
	import DesireSelect from '#lib/components/DesireSelect.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import GotItForm from '#lib/components/GotItForm.svelte';
	import LoginAction from '#lib/components/LoginAction.svelte';
	import Popup from '#lib/components/Popup.svelte';
	import SearchField from '#lib/components/SearchField.svelte';
	import Select from '#lib/components/Select.svelte';
	import SortDirection from '#lib/components/SortDirection.svelte';
	import StickyBar from '#lib/components/StickyBar.svelte';
	import Tile from '#lib/components/Tile.svelte';
	import TileGrid from '#lib/components/TileGrid.svelte';
	import WishlistItemForm from '#lib/components/WishlistItemForm.svelte';

	let { data }: PageProps = $props();

	const sorts = [
		{ value: 'desire', label: 'Sort: desire' },
		{ value: 'team', label: 'Sort: team' },
		{ value: 'season', label: 'Sort: season' }
	];

	// The usual direction of each sort: the most wanted and the latest first.
	const usualDirection: Record<string, string> = { desire: 'desc', team: 'asc', season: 'desc' };

	// Filters are page state, not in the URL. They run here, over the loaded list.
	let search = $state('');
	let selectedCountries = $state<string[]>([]);
	let desire = $state<Desire | null>(null);
	let sort = $state('desire');
	let direction = $derived(usualDirection[sort]);

	const compareText = (a: string, b: string) =>
		a.localeCompare(b, undefined, { sensitivity: 'base' });
	const sortKeys: Record<string, (a: WishlistItem, b: WishlistItem) => number> = {
		desire: (a, b) => a.desire - b.desire,
		team: (a, b) => compareText(a.kit.team.name, b.kit.team.name),
		season: (a, b) => parseInt(a.kit.season) - parseInt(b.kit.season)
	};

	// Only Countries with a Wishlist Item, under their Continent.
	const countryGroups = $derived.by(() => {
		const present = new Map(data.items.map((i) => [i.kit.team.country.id, i.kit.team.country]));
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

	// A Wishlist Item has no Print: search covers the Team name.
	const query = $derived(search.trim().toLocaleLowerCase());
	const isFiltering = $derived(query !== '' || selectedCountries.length > 0 || desire !== null);
	const items = $derived.by(() => {
		const order = direction === 'asc' ? 1 : -1;
		return data.items
			.filter(
				(i) =>
					(!query || i.kit.team.name.toLocaleLowerCase().includes(query)) &&
					(selectedCountries.length === 0 ||
						selectedCountries.includes(String(i.kit.team.country.id))) &&
					(desire === null || i.desire === desire)
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
		desire = null;
	}

	const caption = (i: WishlistItem) => `${i.kit.season} · ${kitTypeLabels[i.kit.kitType]}`;

	let selectedId = $state<number | null>(null);
	const selected = $derived(data.items.find((i) => i.id === selectedId) ?? null);
	let anchor = $state<HTMLElement | null>(null);
	let open = $state(false);

	// Owner: "Got it" turns the Popup into the GotItForm; "Drop" removes the Wishlist Item at once.
	let gettingIt = $state(false);
	let dropping = $state(false);
	let actionError = $state<string | null>(null);

	async function drop(item: WishlistItem) {
		dropping = true;
		const outcome = await postAction('?/drop', { id: item.id });
		dropping = false;
		if (outcome.ok) open = false;
		else actionError = outcome.error;
	}

	function select(item: WishlistItem, el: HTMLElement) {
		gettingIt = false;
		actionError = null;
		selectedId = item.id;
		anchor = el;
		open = true;
	}
</script>

<svelte:head><title>Jerseys | Wishlist</title></svelte:head>

<StickyBar
	current="wishlist"
	searchActive={query !== ''}
	filtersActive={selectedCountries.length > 0 || desire !== null}
>
	{#snippet chips()}
		<Chip tone="info" label="wanted" value={String(data.items.length)} />
	{/snippet}
	{#snippet login()}
		<LoginAction isOwner={data.isOwner} />
	{/snippet}
	{#snippet action()}
		{#if data.form}
			{@const lists = data.form}
			<AddAction title="Add a wishlist item">
				{#snippet form(close)}
					<WishlistItemForm teams={lists.teams} countries={lists.countries} onDone={close} />
				{/snippet}
			</AddAction>
		{/if}
	{/snippet}
	{#snippet searchBox()}
		<SearchField bind:value={search} label="Search team" placeholder="Search team" />
	{/snippet}
	{#snippet controls()}
		<CountryFilter bind:value={selectedCountries} groups={countryGroups} />
		<DesireSelect
			label="Filter by desire"
			placeholder="Any desire"
			value={desire}
			onPick={(level) => (desire = level)}
		/>
		<Select bind:value={sort} label="Sort by" options={sorts} />
		<SortDirection bind:value={direction} />
	{/snippet}
</StickyBar>

<main>
	{#if data.items.length === 0}
		<EmptyState message="Nothing on the wishlist" />
	{:else if items.length === 0}
		<EmptyState message="No match">
			{#snippet action()}
				{#if isFiltering}
					<Button onclick={clearFilters}>Clear filters</Button>
				{/if}
			{/snippet}
		</EmptyState>
	{:else}
		<TileGrid>
			{#each items as item (item.id)}
				<li class="min-w-0">
					<Tile
						team={item.kit.team.name}
						season={item.kit.season}
						kitType={kitTypeLabels[item.kit.kitType]}
						mainPictureUrl={mainPictureUrl(item.kit)}
						desire={item.desire}
						onSelect={(el) => select(item, el)}
					/>
				</li>
			{/each}
		</TileGrid>
	{/if}
</main>

{#snippet itemActions()}
	{#if selected}
		{@const item = selected}
		<Button intent="success" onclick={() => (gettingIt = true)}>Got it</Button>
		<Button loading={dropping} onclick={() => drop(item)}>Drop</Button>
	{/if}
{/snippet}

{#if selected}
	<Popup
		bind:open
		{anchor}
		title={gettingIt ? 'Got it' : selected.kit.team.name}
		subtitle={caption(selected)}
		mainPictureUrl={mainPictureUrl(selected.kit)}
		wide={gettingIt}
		actions={data.form && !gettingIt ? itemActions : undefined}
	>
		{#snippet details()}
			{#if gettingIt && data.form}
				<GotItForm
					wishlistItemId={selected.id}
					version={selected.version}
					stores={data.form.stores}
					onDone={() => (open = false)}
					onCancel={() => (gettingIt = false)}
				/>
			{:else}
				<dl
					class="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 text-[15px] [&_dd]:font-bold [&_dd]:[overflow-wrap:anywhere]"
				>
					<dt class="text-muted-foreground">Version</dt>
					<dd>{selected.version ? versionLabels[selected.version] : 'Any version'}</dd>
					<dt class="text-muted-foreground">Desire</dt>
					<dd><DesireDots value={selected.desire} /></dd>
				</dl>
				{#if actionError}
					<p class="text-sm font-bold text-destructive" role="alert">! {actionError}</p>
				{/if}
			{/if}
		{/snippet}
	</Popup>
{/if}
