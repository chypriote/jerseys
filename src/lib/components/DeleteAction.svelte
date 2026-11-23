<script lang="ts">
	import Button from './Button.svelte';
	import ConfirmDialog from './ConfirmDialog.svelte';

	let {
		what,
		text,
		label = 'Delete',
		onDelete
	}: {
		/** Names the row: "Delete {what}?" and the Button's hidden label. */
		what: string;
		/** What the delete removes. */
		text: string;
		label?: string;
		/** Runs after the confirmation. Answers the error to show, or null. */
		onDelete: () => Promise<string | null>;
	} = $props();

	let confirming = $state(false);
	let error = $state<string | null>(null);

	async function confirm() {
		error = await onDelete();
	}
</script>

<!-- Not disabled while it runs: the closing ConfirmDialog gives the focus back to it. -->
<Button onclick={() => (confirming = true)}>
	{label}<span class="sr-only"> {what}</span>
</Button>
<ConfirmDialog
	bind:open={confirming}
	title={`Delete ${what}?`}
	{text}
	actionLabel="Delete"
	onConfirm={confirm}
/>
{#if error}
	<!-- A full row in the flex-wrap actions of a Popup. -->
	<p class="basis-full text-sm font-bold text-destructive" role="alert">! {error}</p>
{/if}
