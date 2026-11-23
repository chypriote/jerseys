<script lang="ts">
	import { untrack } from 'svelte';
	import type { TeamChoice, TeamKind, TeamView } from '#lib/server/catalog/types';
	import ToggleGroup from './ToggleGroup.svelte';
	import { Input } from './ui/input/index.js';
	import { Label } from './ui/label/index.js';
	import { NativeSelect } from './ui/native-select/index.js';

	let {
		value = $bindable(null),
		teams,
		countries,
		error = null
	}: {
		/** A known Team or a new one. Null until a pick. */
		value?: TeamChoice | null;
		teams: TeamView[];
		/** For the new Team's Country, as CountryFilter groups. */
		countries: { continent: string; countries: { id: string; name: string }[] }[];
		error?: string | null;
	} = $props();

	const MAX_OPTIONS = 8;
	const id = $props.id();
	const listId = `${id}-list`;

	const start = untrack(() => value);
	let text = $state(
		start && 'teamId' in start
			? (untrack(() => teams).find((t) => t.id === start.teamId)?.name ?? '')
			: (start?.name ?? '')
	);
	let open = $state(false);
	let active = $state(-1);
	let newKind = $state<TeamKind>(start && 'kind' in start ? start.kind : 'club');
	let newCountry = $state(start && 'countryId' in start ? String(start.countryId) : '');

	const query = $derived(text.trim().toLocaleLowerCase());
	const matches = $derived(
		teams.filter((t) => t.name.toLocaleLowerCase().includes(query)).slice(0, MAX_OPTIONS)
	);
	const exact = $derived(teams.some((t) => t.name.toLocaleLowerCase() === query));
	type Option = { key: string; team: TeamView | null };
	const options = $derived<Option[]>([
		...matches.map((team) => ({ key: String(team.id), team })),
		...(query && !exact ? [{ key: 'new', team: null }] : [])
	]);
	const isNew = $derived(value !== null && !('teamId' in value));
	const expanded = $derived(open && options.length > 0);

	function pick(option: Option) {
		if (option.team) {
			text = option.team.name;
			value = { teamId: option.team.id };
		} else {
			text = text.trim();
			value = { name: text, kind: newKind, countryId: Number(newCountry) };
		}
		open = false;
		active = -1;
	}

	function updateNew() {
		if (value && !('teamId' in value))
			value = { name: value.name, kind: newKind, countryId: Number(newCountry) };
	}

	function onInput() {
		// Typing again after a pick drops the pick (and closes the new Team block).
		value = null;
		open = true;
		active = -1;
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			if (!open) open = true;
			else active = Math.min(active + 1, options.length - 1);
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			active = Math.max(active - 1, 0);
		} else if (event.key === 'Enter' && expanded && active >= 0) {
			event.preventDefault();
			pick(options[active]);
		} else if (event.key === 'Escape' && expanded) {
			// Closes the list, not the Popup.
			event.preventDefault();
			event.stopPropagation();
			open = false;
			active = -1;
		}
	}
</script>

<div class="flex flex-col gap-1.5">
	<Label for={id}>Team</Label>
	<div class="relative">
		<Input
			{id}
			bind:value={text}
			role="combobox"
			autocomplete="off"
			aria-autocomplete="list"
			aria-expanded={expanded}
			aria-controls={listId}
			aria-activedescendant={expanded && active >= 0 ? `${id}-${options[active].key}` : undefined}
			aria-invalid={error ? true : undefined}
			aria-describedby={error ? `${id}-error` : undefined}
			oninput={onInput}
			onkeydown={onKeydown}
			onfocus={() => (open = true)}
			onblur={() => (open = false)}
		/>
		<ul
			id={listId}
			role="listbox"
			aria-label="Teams"
			class="absolute inset-x-0 top-full z-10 mt-1 flex-col gap-1 rounded-md bg-card p-1.5 shadow-(--shadow-raised) {expanded
				? 'flex'
				: 'hidden'}"
		>
			{#each options as option, i (option.key)}
				<!-- The input keeps the focus (aria-activedescendant) and handles the keys; mousedown would blur it. -->
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<li
					id="{id}-{option.key}"
					role="option"
					aria-selected={i === active}
					class="flex min-h-11 cursor-pointer items-center gap-2 rounded-control px-4 text-sm font-medium {i ===
					active
						? 'bg-background'
						: ''}"
					onmousedown={(e) => e.preventDefault()}
					onclick={() => pick(option)}
				>
					{#if option.team}
						<span class="min-w-0 truncate">{option.team.name}</span>
						<span class="ms-auto shrink-0 text-muted-foreground">{option.team.country.name}</span>
					{:else}
						<span class="min-w-0 truncate font-bold text-icon-accent">
							Add “{text.trim()}” as a new team
						</span>
					{/if}
				</li>
			{/each}
		</ul>
	</div>
	{#if error}
		<p id="{id}-error" class="text-sm font-bold text-destructive">! {error}</p>
	{/if}
</div>

{#if isNew}
	<div class="flex flex-col gap-4 rounded-md bg-background p-3">
		<ToggleGroup
			label="Kind"
			bind:value={() => newKind, (kind) => ((newKind = kind), updateNew())}
			options={[
				{ value: 'club', label: 'Club' },
				{ value: 'national', label: 'National Team' }
			]}
		/>
		<div class="flex flex-col gap-1.5">
			<label class="text-sm font-bold" for="{id}-country">Country</label>
			<NativeSelect
				id="{id}-country"
				required
				bind:value={() => newCountry, (country) => ((newCountry = country), updateNew())}
			>
				<option value="">Choose a country</option>
				{#each countries as group (group.continent)}
					<optgroup label={group.continent}>
						{#each group.countries as country (country.id)}
							<option value={country.id}>{country.name}</option>
						{/each}
					</optgroup>
				{/each}
			</NativeSelect>
			<p class="text-sm text-muted-foreground">The League follows the Country.</p>
		</div>
	</div>
{/if}
