<script lang="ts">
	import { cn, type WithElementRef } from '#lib/utils.js';
	import type { HTMLInputAttributes, HTMLInputTypeAttribute } from 'svelte/elements';

	type InputType = Exclude<HTMLInputTypeAttribute, 'file'>;

	type Props = WithElementRef<
		Omit<HTMLInputAttributes, 'type'> &
			({ type: 'file'; files?: FileList | null } | { type?: InputType; files?: undefined })
	>;

	let {
		ref = $bindable(null),
		value = $bindable(),
		type,
		files = $bindable(),
		class: className,
		'data-slot': dataSlot = 'input',
		...restProps
	}: Props = $props();
</script>

{#if type === 'file'}
	<input
		bind:this={ref}
		data-slot={dataSlot}
		class={cn(
			'flex min-h-11 w-full min-w-0 rounded-control bg-card px-4 text-sm font-medium text-foreground shadow-(--shadow-raised) outline-ring placeholder:text-muted-foreground focus-visible:outline-3 focus-visible:outline-solid disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:outline-3 aria-invalid:outline-destructive file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
			className
		)}
		type="file"
		bind:files
		bind:value
		{...restProps}
	/>
{:else}
	<input
		bind:this={ref}
		data-slot={dataSlot}
		class={cn(
			'flex min-h-11 w-full min-w-0 rounded-control bg-card px-4 text-sm font-medium text-foreground shadow-(--shadow-raised) outline-ring placeholder:text-muted-foreground focus-visible:outline-3 focus-visible:outline-solid disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:outline-3 aria-invalid:outline-destructive file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
			className
		)}
		{type}
		bind:value
		{...restProps}
	/>
{/if}
