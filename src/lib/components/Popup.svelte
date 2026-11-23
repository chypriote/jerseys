<script lang="ts">
	import type { Snippet } from 'svelte';
	import MainPicture from './MainPicture.svelte';
	import * as Dialog from './ui/dialog/index.js';

	let {
		open = $bindable(false),
		anchor = null,
		title,
		subtitle = '',
		mainPictureUrl = null,
		wide = false,
		onDismiss,
		details,
		actions
	}: {
		open?: boolean;
		/** The Tile that opened the Popup. Focus goes back to it on close. */
		anchor?: HTMLElement | null;
		title: string;
		/** "{season} · {kitType}". Set it for a Tile Popup: the Main Picture shows next to the details. */
		subtitle?: string;
		mainPictureUrl?: string | null;
		/** Form Popup: wider, no Main Picture. The form lays out its two columns from `sm`. */
		wide?: boolean;
		/** X button, Esc, tap on the backdrop. */
		onDismiss?: () => void;
		details?: Snippet;
		/** Owner only. */
		actions?: Snippet;
	} = $props();

	function onOpenChange(next: boolean) {
		if (!next) onDismiss?.();
	}
</script>

<Dialog.Root bind:open {onOpenChange}>
	<Dialog.Content
		class={wide ? 'max-w-(--popup-width-wide)' : undefined}
		onCloseAutoFocus={(e: Event) => {
			if (anchor?.isConnected) {
				e.preventDefault();
				anchor.focus();
			}
		}}
	>
		{#if subtitle && !wide}
			<div class="grid grid-cols-[minmax(0,var(--popup-picture-size))_minmax(0,1fr)] gap-4">
				<span
					class="flex aspect-square items-center justify-center overflow-hidden rounded-md bg-background"
				>
					<MainPicture url={mainPictureUrl} />
				</span>
				<div class="min-w-0">
					<Dialog.Title class="[overflow-wrap:anywhere]">{title}</Dialog.Title>
					<p class="mt-1 mb-3 text-[15px] text-muted-foreground">{subtitle}</p>
					{@render details?.()}
				</div>
			</div>
		{:else}
			<Dialog.Title>{title}</Dialog.Title>
			{@render details?.()}
		{/if}
		{#if actions}
			<div class="flex flex-wrap gap-2">{@render actions()}</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>
