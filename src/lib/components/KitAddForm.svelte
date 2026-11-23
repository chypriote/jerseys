<script lang="ts">
	import { mainPictureUpload, postAction, teamProblem } from '#lib/forms';
	import { newTeamName, unknownTeamMessage } from '#lib/team-name';
	import type { Country, KitKey, KitType, TeamChoice, TeamView } from '#lib/server/catalog/types';
	import FormActions from './FormActions.svelte';
	import KitFields from './KitFields.svelte';

	let {
		teams,
		countries,
		pictured,
		onSuccess
	}: { teams: TeamView[]; countries: Country[]; pictured: KitKey[]; onSuccess: () => void } =
		$props();

	let team = $state<TeamChoice | null>(null);
	let season = $state('');
	let kitType = $state<KitType>('home');
	let comment = $state('');
	let mainPicture = $state<File | null>(null);
	let mainPictureUrl = $state('');
	let error = $state<string | null>(null);
	let teamError = $state<string | null>(null);
	let busy = $state(false);
	/** The new Team name already checked on TheSportsDB: a second Save adds it anyway. */
	let warned = '';

	async function save(event: SubmitEvent) {
		event.preventDefault();
		teamError = teamProblem(team);
		if (!team || teamError) return;
		error = null;
		const newName = newTeamName(team);
		if (newName && newName !== warned) {
			warned = newName;
			const message = await unknownTeamMessage(newName);
			if (message) {
				error = message;
				return;
			}
		}
		busy = true;
		const upload = await mainPictureUpload(mainPicture);
		if (typeof upload === 'string') {
			busy = false;
			error = upload;
			return;
		}
		const outcome = await postAction(
			'?/addKit',
			{
				team,
				season,
				kitType,
				comment: comment.trim() || undefined,
				mainPictureUrl: mainPictureUrl.trim() || undefined
			},
			upload
		);
		busy = false;
		if (outcome.ok) onSuccess();
		else error = outcome.error;
	}
</script>

<!-- Two columns from `sm` (Popup `wide`). -->
<form class="grid grid-cols-1 gap-4 sm:grid-cols-2" onsubmit={save}>
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
		{teamError}
	/>
	{#if error}
		<p class="text-sm font-bold text-destructive sm:col-span-2" role="alert">! {error}</p>
	{/if}
	<div class="sm:col-span-2"><FormActions {busy} /></div>
</form>
