<script lang="ts">
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import { cn } from '#lib/utils.js';
	import type { HTMLSelectAttributes } from 'svelte/elements';

	type NativeSelectProps = Omit<HTMLSelectAttributes, 'size'> & {
		ref?: HTMLSelectElement | null;
	} & {
		size?: 'sm' | 'default';
	};

	let {
		ref = $bindable(null),
		value = $bindable(),
		class: className,
		size = 'default',
		children,
		...restProps
	}: NativeSelectProps = $props();
</script>

<div
	class={cn('group/native-select relative w-fit has-[select:disabled]:opacity-50', className)}
	data-slot="native-select-wrapper"
	data-size={size}
>
	<select
		bind:value
		bind:this={ref}
		data-slot="native-select"
		data-size={size}
		class="min-h-11 w-full min-w-0 cursor-pointer appearance-none rounded-control border-2 border-field-border bg-field py-0 ps-4 pe-10 text-sm font-medium text-foreground shadow-(--shadow-raised) outline-ring focus-visible:outline-3 focus-visible:outline-solid disabled:cursor-not-allowed disabled:opacity-50"
		{...restProps}
	>
		{@render children?.()}
	</select>
	<ChevronDownIcon
		class="text-muted-foreground top-1/2 end-4 size-4 -translate-y-1/2 pointer-events-none absolute select-none"
		aria-hidden
		data-slot="native-select-icon"
	/>
</div>
