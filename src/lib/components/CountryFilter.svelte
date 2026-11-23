<script lang="ts">
	import { Button } from './ui/button/index.js';

	let {
		value = $bindable([]),
		groups
	}: {
		/** Country ids. Empty = all. */
		value?: string[];
		groups: { continent: string; countries: { id: string; name: string }[] }[];
	} = $props();

	const selected = (ids: string[]) => ids.filter((id) => value.includes(id)).length;

	function toggleContinent(ids: string[], on: boolean) {
		value = on ? [...new Set([...value, ...ids])] : value.filter((id) => !ids.includes(id));
	}

	const total = $derived(groups.reduce((n, g) => n + g.countries.length, 0));
</script>

<details class="relative">
	<summary
		class="flex min-h-11 cursor-pointer list-none items-center rounded-control bg-card px-4 text-sm font-bold text-foreground shadow-(--shadow-raised) outline-ring focus-visible:outline-3 focus-visible:outline-solid [&::-webkit-details-marker]:hidden"
	>
		{value.length ? `Countries (${value.length})` : `All countries (${total})`}
	</summary>
	<div
		class="absolute start-0 top-full z-(--layer-sticky) mt-2 max-h-[60vh] w-[min(320px,calc(100vw-2rem))] overflow-y-auto rounded-md bg-card shadow-(--shadow-raised)"
	>
		<div class="sticky top-0 z-10 bg-card px-4 py-2">
			<Button
				variant="neutral"
				class="w-full"
				disabled={value.length === 0}
				onclick={() => (value = [])}
			>
				Clear filter
			</Button>
		</div>
		<div class="grid gap-3 px-4 pb-3">
			{#each groups as group (group.continent)}
				{@const ids = group.countries.map((c) => c.id)}
				{@const count = selected(ids)}
				<fieldset>
					<legend
						class="mb-1 w-full font-display text-sm leading-tight font-bold tracking-label text-muted-foreground uppercase"
					>
						<label class="flex min-h-11 cursor-pointer items-center gap-2">
							<input
								type="checkbox"
								checked={count === ids.length}
								indeterminate={count > 0 && count < ids.length}
								onchange={(e) => toggleContinent(ids, e.currentTarget.checked)}
								class="size-5 accent-icon-accent"
							/>
							{group.continent}
						</label>
					</legend>
					{#each group.countries as country (country.id)}
						<label class="flex min-h-11 cursor-pointer items-center gap-2 ps-7 text-sm">
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
	</div>
</details>
