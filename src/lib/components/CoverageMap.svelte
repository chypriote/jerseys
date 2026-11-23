<script lang="ts">
	import { onMount } from 'svelte';
	import type { CoverageCountry } from '#lib/server/catalog/types';
	import { mapCountries, mapCountryNamed, mapLand, mapViewBox } from '#lib/map';

	let { countries }: { countries: CoverageCountry[] } = $props();

	const [x, y, width, height] = mapViewBox;
	// Where Europe sits across the map, from 0 (west) to 1 (east).
	const EUROPE = 0.52;
	const DOT_BELOW_PX = 8;
	const DOT_RADIUS_PX = 4;

	// Every map shape is drawn; only a Country of the app can be covered or get a dot.
	const drawn = $derived.by(() => {
		const states = new Map(countries.map((c) => [mapCountryNamed(c.name), c.covered]));
		return mapCountries.map((shape) => ({
			...shape,
			inApp: states.has(shape),
			covered: states.get(shape) === true
		}));
	});
	const coveredNames = $derived(countries.filter((c) => c.covered).map((c) => c.name));

	let scroller = $state<HTMLElement>();
	// Before the first measure (server render), assume the narrowest drawing.
	let drawnWidth = $state(900);
	const pxPerUnit = $derived(drawnWidth / width);
	const dots = $derived(drawn.filter((c) => c.inApp && c.size * pxPerUnit < DOT_BELOW_PX));

	const headingId = $props.id();

	// Opens centred on Europe when the map is wider than the card.
	onMount(() => {
		if (scroller) scroller.scrollLeft = scroller.scrollWidth * EUROPE - scroller.clientWidth / 2;
	});
</script>

<section class="rounded-md bg-card pt-3 pb-2 shadow-(--shadow-raised)" aria-labelledby={headingId}>
	<p id={headingId} class="mx-4 mb-2">
		<b class="font-extrabold tabular-nums">{coveredNames.length}</b> of
		<span class="tabular-nums">{countries.length}</span> countries
	</p>
	<div bind:this={scroller} class="overflow-x-auto overscroll-x-contain">
		<div class="min-w-(--map-width-min)" bind:clientWidth={drawnWidth}>
			<svg
				viewBox="{x} {y} {width} {height}"
				role="img"
				aria-label="Countries covered: {coveredNames.join(', ')}"
				class="block h-auto w-full [&_path]:stroke-(--map-country-border) [&_path]:stroke-[0.5px] [&_path]:[stroke-linejoin:round] [&_path]:[vector-effect:non-scaling-stroke]"
			>
				<path d={mapLand} class="fill-(--map-country-empty)" />
				{#each drawn as country (country.name)}
					<path
						d={country.d}
						class={country.covered ? 'fill-(--map-country-covered)' : 'fill-(--map-country-empty)'}
					/>
				{/each}
				{#each dots as country (country.name)}
					<circle
						cx={country.centre[0]}
						cy={country.centre[1]}
						r={DOT_RADIUS_PX / pxPerUnit}
						class="stroke-(--map-country-border) stroke-1 [vector-effect:non-scaling-stroke] {country.covered
							? 'fill-(--map-country-covered)'
							: 'fill-(--map-country-empty)'}"
					/>
				{/each}
			</svg>
		</div>
	</div>
</section>
