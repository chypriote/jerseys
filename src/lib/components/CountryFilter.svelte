<script lang="ts">
	let {
		value = $bindable([]),
		groups
	}: {
		/** Country ids. Empty = all. */
		value?: string[];
		groups: { continent: string; countries: { id: string; name: string }[] }[];
	} = $props();

	const total = $derived(groups.reduce((n, g) => n + g.countries.length, 0));
</script>

<details class="relative">
	<summary
		class="flex min-h-11 cursor-pointer list-none items-center rounded-control bg-card px-4 text-sm font-bold text-foreground shadow-(--shadow-raised) outline-ring focus-visible:outline-3 focus-visible:outline-solid [&::-webkit-details-marker]:hidden"
	>
		{value.length ? `Countries (${value.length})` : `All countries (${total})`}
	</summary>
	<div
		class="absolute start-0 top-full z-(--layer-sticky) mt-2 grid max-h-[60vh] w-[min(320px,calc(100vw-2rem))] gap-3 overflow-y-auto rounded-md bg-card px-4 py-3 shadow-(--shadow-raised)"
	>
		{#each groups as group (group.continent)}
			<fieldset>
				<legend
					class="mb-1 font-display text-sm leading-[1.1] font-bold tracking-[0.03em] text-muted-foreground uppercase"
				>
					{group.continent}
				</legend>
				{#each group.countries as country (country.id)}
					<label class="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
						<input
							type="checkbox"
							value={country.id}
							bind:group={value}
							class="size-5 accent-icon-accent"
						/>
						{country.name}
					</label>
				{/each}
			</fieldset>
		{/each}
	</div>
</details>
