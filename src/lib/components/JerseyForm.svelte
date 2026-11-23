<script lang="ts">
	import { untrack } from 'svelte';
	import {
		acquisitionState,
		addStore,
		emptyAcquisition,
		mainPictureUpload,
		postAction,
		teamProblem,
		toAcquisitionInput
	} from '#lib/forms';
	import { fitLabels, labelOptions, versionLabels } from '#lib/labels';
	import type {
		CollectionJersey,
		Country,
		KitKey,
		Fit,
		KitType,
		Size,
		Store,
		TeamChoice,
		TeamView,
		Version
	} from '#lib/server/catalog/types';
	import AcquisitionFields from './AcquisitionFields.svelte';
	import Button from './Button.svelte';
	import Field from './Field.svelte';
	import KitFields from './KitFields.svelte';
	import ToggleGroup from './ToggleGroup.svelte';

	let {
		jersey = null,
		teams,
		countries,
		pictured,
		stores,
		onDone
	}: {
		/** Set to edit this Jersey: the form starts from it. */
		jersey?: CollectionJersey | null;
		teams: TeamView[];
		countries: Country[];
		pictured: KitKey[];
		stores: Store[];
		/** Save succeeded, or Cancel. */
		onDone: () => void;
	} = $props();

	// The form is mounted per opening, so the starting values are read once.
	const start = untrack(() => jersey);
	let team = $state<TeamChoice | null>(start ? { teamId: start.kit.team.id } : null);
	let season = $state(start?.kit.season ?? '');
	let kitType = $state<KitType>(start?.kit.kitType ?? 'home');
	let version = $state<Version>(start?.version ?? 'fan');
	// Imported Jerseys may have no Size or Fit: the form then asks for one.
	let size = $state<Size>(start?.size ?? 'M');
	let fit = $state<Fit>(start?.fit ?? 'good');
	let print = $state(start?.print ?? '');
	let acquisition = $state(start ? acquisitionState(start.acquisition) : emptyAcquisition());
	let mainPicture = $state<File | null>(null);
	let mainPictureUrl = $state('');
	let error = $state<string | null>(null);
	let teamError = $state<string | null>(null);
	let busy = $state(false);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		teamError = teamProblem(team);
		if (!team || teamError) return;
		const acquisitionInput = toAcquisitionInput(acquisition);
		if (typeof acquisitionInput === 'string') {
			error = acquisitionInput;
			return;
		}
		busy = true;
		const upload = await mainPictureUpload(mainPicture);
		if (typeof upload === 'string') {
			busy = false;
			error = upload;
			return;
		}
		const input = {
			team,
			season,
			kitType,
			mainPictureUrl: mainPictureUrl.trim() || undefined,
			version,
			size,
			fit,
			print: print.trim() || null,
			acquisition: acquisitionInput
		};
		const outcome = jersey
			? await postAction('?/editJersey', { ...input, id: jersey.id }, upload)
			: await postAction('?/addJersey', input, upload);
		busy = false;
		if (outcome.ok) onDone();
		else error = outcome.error;
	}
</script>

<!-- Two columns from `sm` (Popup `wide`). -->
<form class="grid grid-cols-1 gap-4 sm:grid-cols-2" onsubmit={submit}>
	<KitFields
		bind:team
		bind:season
		bind:kitType
		bind:mainPicture
		bind:mainPictureUrl
		{teams}
		{countries}
		{pictured}
		{teamError}
	/>
	<ToggleGroup label="Version" bind:value={version} options={labelOptions(versionLabels)} />
	<ToggleGroup
		label="Size"
		bind:value={size}
		options={(['S', 'M', 'L'] as const).map((s) => ({ value: s, label: s }))}
	/>
	<ToggleGroup label="Fit" bind:value={fit} options={labelOptions(fitLabels)} />
	<Field label="Print" bind:value={print} />
	<AcquisitionFields bind:acquisition {stores} onAddStore={addStore} />
	{#if error}
		<p class="text-sm font-bold text-destructive sm:col-span-2" role="alert">! {error}</p>
	{/if}
	<div class="flex flex-wrap justify-end gap-2 sm:col-span-2">
		<Button onclick={onDone}>Cancel</Button>
		<Button intent="success" type="submit" loading={busy}>Save</Button>
	</div>
</form>
