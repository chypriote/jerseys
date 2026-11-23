<script lang="ts" module>
	import { type VariantProps, tv } from 'tailwind-variants';
	import { cn, type WithElementRef } from '#lib/utils.js';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

	export const buttonVariants = tv({
		base: 'relative inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-control px-5 text-sm font-extrabold whitespace-nowrap shadow-(--shadow-raised) outline-ring before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-current before:opacity-0 hover:before:opacity-[.08] focus-visible:outline-3 focus-visible:outline-solid active:translate-y-[3px] active:shadow-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none aria-busy:disabled:opacity-100 motion-safe:transition-[transform,box-shadow] motion-safe:duration-80 motion-safe:ease-out [&_svg]:pointer-events-none [&_svg]:shrink-0',
		variants: {
			variant: {
				default: 'bg-primary text-primary-foreground',
				success: 'bg-success text-success-foreground',
				neutral: 'bg-card text-foreground'
			},
			size: {
				default: 'min-h-11',
				sm: 'min-h-8 px-3',
				icon: 'size-11 min-h-11 px-0'
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'default'
		}
	});

	export type ButtonVariant = VariantProps<typeof buttonVariants>['variant'];
	export type ButtonSize = VariantProps<typeof buttonVariants>['size'];

	export type ButtonProps = WithElementRef<HTMLButtonAttributes> &
		WithElementRef<HTMLAnchorAttributes> & {
			variant?: ButtonVariant;
			size?: ButtonSize;
			loading?: boolean;
		};
</script>

<script lang="ts">
	let {
		class: className,
		variant = 'default',
		size = 'default',
		ref = $bindable(null),
		href = undefined,
		type = 'button',
		disabled,
		loading = false,
		children,
		...restProps
	}: ButtonProps = $props();

	const off = $derived(disabled || loading);
</script>

{#snippet content()}
	<!-- The label stays in the layout (hidden) so the button keeps its size. -->
	<span class={loading ? 'invisible contents' : 'contents'}>{@render children?.()}</span>
	{#if loading}
		<svg
			aria-hidden="true"
			viewBox="0 0 24 24"
			class="absolute size-4 motion-safe:animate-spin"
			fill="none"
			stroke="currentColor"
			stroke-width="3"
			stroke-linecap="round"
		>
			<path d="M12 3a9 9 0 1 0 9 9" />
		</svg>
	{/if}
{/snippet}

{#if href}
	<a
		bind:this={ref}
		data-slot="button"
		class={cn(buttonVariants({ variant, size }), className)}
		href={off ? undefined : href}
		aria-disabled={off}
		aria-busy={loading || undefined}
		role={off ? 'link' : undefined}
		tabindex={off ? -1 : undefined}
		{...restProps}
	>
		{@render content()}
	</a>
{:else}
	<button
		bind:this={ref}
		data-slot="button"
		class={cn(buttonVariants({ variant, size }), className)}
		{type}
		disabled={off}
		aria-busy={loading || undefined}
		{...restProps}
	>
		{@render content()}
	</button>
{/if}
