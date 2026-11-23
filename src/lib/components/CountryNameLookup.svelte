<script lang="ts">
	import { mapCountries } from '#lib/map';
	import { Input } from './ui/input/index.js';
	import { Label } from './ui/label/index.js';

	let { value = $bindable(''), error = null }: { value?: string; error?: string | null } = $props();

	const MAX_OPTIONS = 8;
	const id = $props.id();
	const listId = `${id}-list`;
	const names = mapCountries.map((c) => c.name).sort((a, b) => a.localeCompare(b));

	let open = $state(false);
	let active = $state(-1);

	const query = $derived(value.trim().toLocaleLowerCase());
	const options = $derived(
		names.filter((n) => n.toLocaleLowerCase().includes(query)).slice(0, MAX_OPTIONS)
	);
	const expanded = $derived(open && options.length > 0);

	function pick(name: string) {
		value = name;
		open = false;
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
	<Label for={id}>Name</Label>
	<div class="relative">
		<Input
			{id}
			bind:value
			required
			role="combobox"
			autocomplete="off"
			aria-autocomplete="list"
			aria-expanded={expanded}
			aria-controls={listId}
			aria-activedescendant={expanded && active >= 0 ? `${id}-${active}` : undefined}
			aria-invalid={error ? true : undefined}
			aria-describedby={error ? `${id}-error` : undefined}
			oninput={() => ((open = true), (active = -1))}
			onkeydown={onKeydown}
			onclick={() => (open = true)}
			onblur={() => (open = false)}
		/>
		<ul
			id={listId}
			role="listbox"
			aria-label="Countries"
			class="absolute inset-x-0 top-full z-10 mt-1 flex-col gap-1 rounded-md bg-card p-1.5 shadow-(--shadow-raised) {expanded
				? 'flex'
				: 'hidden'}"
		>
			{#each options as name, i (name)}
				<!-- The input keeps the focus (aria-activedescendant) and handles the keys; mousedown would blur it. -->
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<li
					id="{id}-{i}"
					role="option"
					aria-selected={i === active}
					class="flex min-h-11 cursor-pointer items-center rounded-control px-4 text-sm font-medium {i ===
					active
						? 'bg-background'
						: ''}"
					onmousedown={(e) => e.preventDefault()}
					onclick={() => pick(name)}
				>
					<span class="min-w-0 truncate">{name}</span>
				</li>
			{/each}
		</ul>
	</div>
	{#if error}
		<p id="{id}-error" class="text-sm font-bold text-destructive">! {error}</p>
	{/if}
</div>
