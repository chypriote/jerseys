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
		pictureUrls = [],
		wide = false,
		onDismiss,
		details,
		actions,
		pictureAction
	}: {
		open?: boolean;
		/** The Tile that opened the Popup. Focus goes back to it on close. */
		anchor?: HTMLElement | null;
		title: string;
		/** "{season} · {kitType}". Set it for a Tile Popup: the Main Picture shows next to the details. */
		subtitle?: string;
		mainPictureUrl?: string | null;
		/** The Kit's extra Pictures: thumbnails under the Main Picture, a tap shows one in its place. */
		pictureUrls?: string[];
		/** Form Popup: wider, no Main Picture. The form lays out its two columns from `sm`. */
		wide?: boolean;
		/** X button, Esc, tap on the backdrop. */
		onDismiss?: () => void;
		details?: Snippet;
		/** Owner only. */
		actions?: Snippet;
		/** Owner only: under the thumbnails while a Picture is shown, with its index in `pictureUrls`. */
		pictureAction?: Snippet<[number]>;
	} = $props();

	/** The thumbnail shown in place of the Main Picture: 0 is the Main Picture. */
	let shown = $state(0);
	const thumbnails = $derived([mainPictureUrl, ...pictureUrls]);
	$effect(() => {
		void mainPictureUrl;
		void open;
		void pictureUrls.length;
		shown = 0;
	});

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
				<div class="flex min-w-0 flex-col gap-2">
					<span
						class="flex aspect-square items-center justify-center overflow-hidden rounded-md bg-background"
					>
						<MainPicture url={thumbnails[shown] ?? mainPictureUrl} />
					</span>
					{#if pictureUrls.length}
						<div class="flex flex-wrap gap-1" role="group" aria-label="Pictures">
							{#each thumbnails as url, index (index)}
								<button
									type="button"
									class="flex size-(--control-size-min) items-center justify-center overflow-hidden rounded-md bg-background outline-ring focus-visible:outline-3 focus-visible:outline-solid aria-pressed:outline-3 aria-pressed:outline-solid"
									aria-label={index === 0 ? 'Main picture' : `Picture ${index + 1}`}
									aria-pressed={shown === index}
									onclick={() => (shown = index)}
								>
									<MainPicture {url} />
								</button>
							{/each}
						</div>
						{#if pictureAction && shown > 0}
							{@render pictureAction(shown - 1)}
						{/if}
					{/if}
				</div>
				<div class="min-w-0">
					<Dialog.Title class="[overflow-wrap:anywhere]">{title}</Dialog.Title>
					<p class="mt-1 mb-3 text-md text-muted-foreground">{subtitle}</p>
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
