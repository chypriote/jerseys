<script lang="ts">
	import { AlertDialog as AlertDialogPrimitive } from 'bits-ui';
	import { cn, type WithoutChild, type WithoutChildrenOrChild } from '#lib/utils.js';
	import AlertDialogOverlay from './alert-dialog-overlay.svelte';
	import AlertDialogPortal from './alert-dialog-portal.svelte';
	import type { ComponentProps } from 'svelte';

	let {
		ref = $bindable(null),
		class: className,
		portalProps,
		...restProps
	}: WithoutChild<AlertDialogPrimitive.ContentProps> & {
		portalProps?: WithoutChildrenOrChild<ComponentProps<typeof AlertDialogPortal>>;
	} = $props();
</script>

<AlertDialogPortal {...portalProps}>
	<AlertDialogOverlay />
	<AlertDialogPrimitive.Content
		bind:ref
		data-slot="alert-dialog-content"
		class={cn(
			'fixed top-1/2 left-1/2 z-(--layer-popup) grid max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-(--popup-width-max) -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-xl bg-card p-[18px] text-foreground outline-none data-[state=closed]:opacity-0 motion-safe:transition-opacity motion-safe:duration-150',
			className
		)}
		{...restProps}
	/>
</AlertDialogPortal>
