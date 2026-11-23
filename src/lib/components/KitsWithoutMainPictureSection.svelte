<script lang="ts">
	import { kitArchiveUrl } from '#lib/kit-archive';
	import type { KitSummary } from '#lib/server/catalog/types';
	import { matchesSearch } from '#lib/search';
	import Button from './Button.svelte';
	import MainPictureLookup from './MainPictureLookup.svelte';
	import PicturePicker from './PicturePicker.svelte';
	import Popup from './Popup.svelte';
	import SearchField from './SearchField.svelte';

	let { kits }: { kits: KitSummary[] } = $props();

	let search = $state('');
	const shown = $derived(kits.filter((k) => matchesSearch(search, k.teamName, k.season)));

	let open = $state(false);
	/** The Kit whose Main Picture the picker sets. */
	let editing = $state<KitSummary | null>(null);

	const label = (kit: KitSummary) =>
		`${kit.season} · ${kit.kitType[0].toUpperCase()}${kit.kitType.slice(1)}`;

	function show(kit: KitSummary) {
		editing = kit;
		open = true;
	}
</script>

<section aria-labelledby="kits-without-main-picture-heading" class="flex min-w-0 flex-col gap-3">
	<h2
		id="kits-without-main-picture-heading"
		class="font-display text-xl font-extrabold uppercase italic"
	>
		Kits without a main picture
	</h2>
	<MainPictureLookup />
	<!-- SearchField sizes itself for a row (basis-48), so a row wrapper keeps it one line tall. -->
	<div class="flex">
		<SearchField bind:value={search} label="Search kits" placeholder="Search kits" />
	</div>
	{#if kits.length === 0}
		<p class="text-sm text-muted-foreground">Every kit has a main picture.</p>
	{:else}
		<ul class="flex flex-col gap-2">
			{#each shown as kit (kit.id)}
				<li class="flex items-center justify-between gap-3 rounded-xl bg-card px-4 py-2">
					<span class="min-w-0">
						<span class="block font-medium">{kit.teamName}</span>
						<span class="block text-sm text-muted-foreground">{label(kit)}</span>
					</span>
					<Button size="sm" onclick={() => show(kit)}>
						Set main picture<span class="sr-only"> of {kit.teamName} {label(kit)}</span>
					</Button>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<Popup bind:open title={editing ? `${editing.teamName} ${label(editing)}` : 'Set main picture'}>
	{#snippet details()}
		{#if editing}
			{#key editing}
				<PicturePicker
					kitId={editing.id}
					onDone={() => (open = false)}
					findUrl={kitArchiveUrl(editing.teamName, editing.season, editing.kitType)}
				/>
			{/key}
		{/if}
	{/snippet}
</Popup>
