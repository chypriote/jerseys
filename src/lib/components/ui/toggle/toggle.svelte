<script lang="ts" module>
	import { type VariantProps, tv } from 'tailwind-variants';

	export const toggleVariants = tv({
		base: 'relative inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 rounded-control bg-card px-4 text-sm font-bold text-foreground shadow-(--shadow-raised) outline-ring before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-current before:opacity-0 hover:before:opacity-[.08] focus-visible:outline-3 focus-visible:outline-solid disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0',
		variants: {
			variant: {
				default: '',
				outline: ''
			},
			size: {
				default: '',
				sm: '',
				lg: ''
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'default'
		}
	});

	export type ToggleVariant = VariantProps<typeof toggleVariants>['variant'];
	export type ToggleSize = VariantProps<typeof toggleVariants>['size'];
	export type ToggleVariants = VariantProps<typeof toggleVariants>;
</script>

<script lang="ts">
	import { Toggle as TogglePrimitive } from 'bits-ui';
	import { cn } from '#lib/utils.js';

	let {
		ref = $bindable(null),
		pressed = $bindable(false),
		class: className,
		size = 'default',
		variant = 'default',
		...restProps
	}: TogglePrimitive.RootProps & {
		variant?: ToggleVariant;
		size?: ToggleSize;
	} = $props();
</script>

<TogglePrimitive.Root
	bind:ref
	bind:pressed
	data-slot="toggle"
	class={cn(toggleVariants({ variant, size }), className)}
	{...restProps}
/>
