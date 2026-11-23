<script lang="ts">
	import { onMount } from 'svelte';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import type { CollectionJersey, CoverageCountry } from '#lib/server/catalog/types';
	import { kitLabel } from '#lib/labels';
	import { mapCountries, mapCountryNamed, mapViewBox } from '#lib/map';

	let { countries, jerseys }: { countries: CoverageCountry[]; jerseys: CollectionJersey[] } =
		$props();

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
	// The Jerseys of each Country of the app, by map shape name.
	const kitsByShape = $derived.by(() => {
		const byShape: Record<string, string[]> = {};
		for (const j of jerseys) {
			const { team, season, kitType } = j.kit;
			const shape = mapCountryNamed(team.country.name);
			if (shape) (byShape[shape.name] ??= []).push(kitLabel(team.name, season, kitType));
		}
		return byShape;
	});
	const appShapes = $derived(new Set(drawn.filter((c) => c.inApp).map((c) => c.name)));

	// Hover only: a touch screen scrolls the map, so a tap shows nothing.
	let innerWidth = $state(0);
	let innerHeight = $state(0);
	let tip = $state<{ name: string; x: number; y: number } | null>(null);
	function showTip(e: PointerEvent) {
		const name = (e.target as Element).getAttribute('data-shape');
		if (e.pointerType === 'touch' || !name || !appShapes.has(name)) {
			tip = null;
			return;
		}
		tip = { name, x: e.clientX, y: e.clientY };
	}

	const coveredNames = $derived(countries.filter((c) => c.covered).map((c) => c.name));

	let scroller = $state<HTMLElement>();
	// Before the first measure (server render), assume the narrowest drawing.
	let drawnWidth = $state(900);
	const pxPerUnit = $derived(drawnWidth / width);
	const dots = $derived(drawn.filter((c) => c.inApp && c.size * pxPerUnit < DOT_BELOW_PX));

	const headingId = $props.id();

	const STORAGE_KEY = 'coverage-map-open';
	let open = $state(true);
	const panelId = `${headingId}-panel`;

	// The saved choice applies after mount, so the server render and first paint match.
	onMount(() => {
		try {
			open = localStorage.getItem(STORAGE_KEY) !== 'false';
		} catch {
			// Storage blocked: the map stays open.
		}
	});

	function toggle() {
		open = !open;
		try {
			localStorage.setItem(STORAGE_KEY, String(open));
		} catch {
			// Storage blocked: the choice lasts until reload.
		}
	}

	// Opens centred on Europe when the map is wider than the card; runs each time the map is shown.
	$effect(() => {
		if (open && scroller)
			scroller.scrollLeft = scroller.scrollWidth * EUROPE - scroller.clientWidth / 2;
	});
</script>

<section class="rounded-md bg-card pt-3 pb-2 shadow-(--shadow-raised)" aria-labelledby={headingId}>
	<h2 id={headingId} class="text-base font-normal">
		<button
			type="button"
			onclick={toggle}
			aria-expanded={open}
			aria-controls={panelId}
			class="flex w-full cursor-pointer items-center justify-between gap-2 px-4 pb-2 text-start"
		>
			<span>
				<b class="font-extrabold tabular-nums">{coveredNames.length}</b> of
				<span class="tabular-nums">{countries.length}</span> countries
			</span>
			<ChevronDownIcon
				aria-hidden="true"
				class="size-5 shrink-0 transition-transform {open ? 'rotate-180' : ''}"
			/>
		</button>
	</h2>
	<div id={panelId} hidden={!open}>
		<div bind:this={scroller} class="overflow-x-auto overscroll-x-contain">
			<div class="min-w-(--map-width-min)" bind:clientWidth={drawnWidth}>
				<svg
					viewBox="{x} {y} {width} {height}"
					role="img"
					aria-label="Countries covered: {coveredNames.join(', ')}"
					onpointermove={showTip}
					onpointerleave={() => (tip = null)}
					class="block h-auto w-full [&_path]:stroke-(--map-country-border) [&_path]:stroke-(length:--map-country-border-width) [&_path]:[stroke-linejoin:round] [&_path]:[vector-effect:non-scaling-stroke]"
				>
					{#each drawn as country (country.name)}
						<path
							d={country.d}
							data-shape={country.name}
							class={country.covered
								? 'fill-(--map-country-covered)'
								: 'fill-(--map-country-empty)'}
						/>
					{/each}
					{#each dots as country (country.name)}
						<circle
							cx={country.centre[0]}
							cy={country.centre[1]}
							data-shape={country.name}
							r={DOT_RADIUS_PX / pxPerUnit}
							class="stroke-(--map-country-border) stroke-1 [vector-effect:non-scaling-stroke] {country.covered
								? 'fill-(--map-country-covered)'
								: 'fill-(--map-country-empty)'}"
						/>
					{/each}
				</svg>
			</div>
		</div>
	</div>

	{#if tip}
		{@const kits = kitsByShape[tip.name] ?? []}
		<div
			role="tooltip"
			class="pointer-events-none fixed z-(--layer-sticky) max-w-64 rounded-md bg-card px-3 py-2 text-sm shadow-(--shadow-raised) ring-1 ring-border"
			style:left="{tip.x}px"
			style:top="{tip.y}px"
			style:transform="translate({tip.x > innerWidth / 2 ? 'calc(-100% - 12px)' : '12px'}, {tip.y >
			innerHeight / 2
				? 'calc(-100% - 12px)'
				: '12px'})"
		>
			<p class="font-extrabold">{tip.name}</p>
			{#if kits.length === 0}
				<p class="text-muted-foreground">No jersey yet</p>
			{:else}
				<ul>
					{#each kits as kit, i (i)}
						<li>{kit}</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</section>

<svelte:window bind:innerWidth bind:innerHeight />
