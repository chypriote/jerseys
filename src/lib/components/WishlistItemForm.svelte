<script lang="ts">
	import { mainPictureUpload, postAction, teamProblem } from '#lib/forms';
	import { labelOptions, versionLabels } from '#lib/labels';
	import { newTeamName, unknownTeamMessage } from '#lib/team-name';
	import type {
		AddWishlistItemInput,
		Country,
		KitKey,
		KitType,
		KitView,
		TeamChoice,
		TeamView,
		Version
	} from '#lib/server/catalog/types';
	import Button from './Button.svelte';
	import KitFields from './KitFields.svelte';
	import ToggleGroup from './ToggleGroup.svelte';

	let {
		teams,
		countries,
		pictured,
		kits,
		onDone
	}: {
		teams: TeamView[];
		countries: Country[];
		pictured: KitKey[];
		kits: KitView[];
		/** Save succeeded, or Cancel. */
		onDone: () => void;
	} = $props();

	let team = $state<TeamChoice | null>(null);
	let season = $state('');
	let kitType = $state<KitType>('home');
	let comment = $state('');
	// "any" is the ToggleGroup value of no Version.
	let version = $state<Version | 'any'>('any');
	let mainPicture = $state<File | null>(null);
	let mainPictureUrl = $state('');
	let error = $state<string | null>(null);
	let teamError = $state<string | null>(null);
	let alreadyOwned = $state(false);
	let busy = $state(false);
	let addingAnyway = $state(false);
	/** The new Team name already checked on TheSportsDB: a second Save adds it anyway. */
	let warned = '';

	const versionOptions = [{ value: 'any' as const, label: 'Any' }, ...labelOptions(versionLabels)];

	async function save(addAnyway: boolean) {
		teamError = teamProblem(team);
		if (!team || teamError) return;
		const newName = newTeamName(team);
		if (newName && newName !== warned) {
			warned = newName;
			const message = await unknownTeamMessage(newName);
			if (message) {
				error = message;
				return;
			}
		}
		const input: AddWishlistItemInput = {
			team,
			season,
			kitType,
			comment: comment.trim() || undefined,
			mainPictureUrl: mainPictureUrl.trim() || undefined,
			version: version === 'any' ? null : version,
			addAnyway
		};
		busy = true;
		addingAnyway = addAnyway;
		const upload = await mainPictureUpload(mainPicture);
		const outcome =
			typeof upload === 'string'
				? ({ ok: false, error: upload } as const)
				: await postAction('?/addWishlistItem', input, upload);
		busy = false;
		if (!outcome.ok) error = outcome.error;
		else if (outcome.alreadyOwned) alreadyOwned = true;
		else onDone();
	}

	function submit(event: SubmitEvent) {
		event.preventDefault();
		error = null;
		alreadyOwned = false;
		void save(false);
	}
</script>

<!-- Two columns from `sm` (Popup `wide`). -->
<form class="grid grid-cols-1 gap-4 sm:grid-cols-2" onsubmit={submit}>
	<KitFields
		bind:team
		bind:season
		bind:kitType
		bind:comment
		bind:mainPicture
		bind:mainPictureUrl
		{teams}
		{countries}
		{pictured}
		{kits}
		{teamError}
	/>
	<ToggleGroup label="Version" bind:value={version} options={versionOptions} />
	{#if alreadyOwned}
		<div class="flex flex-col gap-2 rounded-xl bg-muted p-3 sm:col-span-2" role="status">
			<p class="text-sm font-bold">Already owned</p>
			<div>
				<Button disabled={busy} loading={busy && addingAnyway} onclick={() => save(true)}>
					Add anyway
				</Button>
			</div>
		</div>
	{/if}
	{#if error}
		<p class="text-sm font-bold text-destructive sm:col-span-2" role="alert">! {error}</p>
	{/if}
	<div class="flex flex-wrap justify-end gap-2 sm:col-span-2">
		<Button onclick={onDone}>Cancel</Button>
		<Button
			intent="success"
			type="submit"
			disabled={busy && addingAnyway}
			loading={busy && !addingAnyway}
		>
			Save
		</Button>
	</div>
</form>
