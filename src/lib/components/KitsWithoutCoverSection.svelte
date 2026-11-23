<script lang="ts">
	import type { KitSummary } from '#lib/server/catalog/types';
	import Button from './Button.svelte';
	import CoverPicker from './CoverPicker.svelte';
	import Popup from './Popup.svelte';

	let { kits }: { kits: KitSummary[] } = $props();

	let open = $state(false);
	/** The Kit whose Cover the picker sets. */
	let editing = $state<KitSummary | null>(null);

	const label = (kit: KitSummary) =>
		`${kit.season} · ${kit.kitType[0].toUpperCase()}${kit.kitType.slice(1)}`;

	function show(kit: KitSummary) {
		editing = kit;
		open = true;
	}
</script>

<section aria-labelledby="kits-without-cover-heading" class="flex min-w-0 flex-col gap-3">
	<h2 id="kits-without-cover-heading" class="font-display text-xl font-extrabold uppercase italic">
		Kits without a cover
	</h2>
	{#if kits.length === 0}
		<p class="text-sm text-muted-foreground">Every kit has a cover.</p>
	{:else}
		<ul class="flex flex-col gap-2">
			{#each kits as kit (kit.id)}
				<li class="flex items-center justify-between gap-3 rounded-xl bg-card px-4 py-2">
					<span class="min-w-0">
						<span class="block font-medium">{kit.teamName}</span>
						<span class="block text-sm text-muted-foreground">{label(kit)}</span>
					</span>
					<Button size="sm" onclick={() => show(kit)}>
						Set cover<span class="sr-only"> of {kit.teamName} {label(kit)}</span>
					</Button>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<Popup bind:open title={editing ? `${editing.teamName} ${label(editing)}` : 'Set cover'}>
	{#snippet details()}
		{#if editing}
			{#key editing}
				<CoverPicker kitId={editing.id} onDone={() => (open = false)} />
			{/key}
		{/if}
	{/snippet}
</Popup>
