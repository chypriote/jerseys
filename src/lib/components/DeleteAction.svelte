<script lang="ts">
	import XIcon from '@lucide/svelte/icons/x';
	import Button from './Button.svelte';
	import ConfirmDialog from './ConfirmDialog.svelte';

	let {
		what,
		text,
		label = 'Delete',
		icon = false,
		onDelete
	}: {
		/** Names the row: "Delete {what}?" and the Button's hidden label. */
		what: string;
		/** The confirm text: what goes with the row. */
		text: string;
		label?: string;
		/** A small round X, to sit on the top right corner of what it deletes (the parent is `relative`). */
		icon?: boolean;
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
{#if icon}
	<button
		type="button"
		class="absolute -top-2 -right-2 z-10 flex size-5 cursor-pointer items-center justify-center rounded-full bg-card text-foreground shadow-(--shadow-raised) outline-ring after:absolute after:-inset-1.5 focus-visible:outline-3 focus-visible:outline-solid"
		onclick={() => (confirming = true)}
	>
		<XIcon class="size-3" aria-hidden="true" />
		<span class="sr-only">{label} {what}</span>
	</button>
{:else}
	<Button intent="danger" onclick={() => (confirming = true)}>
		{label}<span class="sr-only"> {what}</span>
	</Button>
{/if}
<ConfirmDialog
	bind:open={confirming}
	title={`Delete ${what}?`}
	{text}
	actionLabel="Delete"
	onConfirm={confirm}
/>
{#if error}
	{#if icon}
		<p
			class="absolute top-full right-0 z-10 w-36 rounded-md bg-card p-1 text-xs font-bold text-destructive"
			role="alert"
		>
			! {error}
		</p>
	{:else}
		<!-- A full row, last, in the flex-wrap actions of a Popup or form. -->
		<p class="order-last basis-full text-sm font-bold text-destructive" role="alert">! {error}</p>
	{/if}
{/if}
