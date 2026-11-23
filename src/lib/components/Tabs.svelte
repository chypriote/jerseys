<script lang="ts">
	import { resolve } from '$app/paths';
	import { cn } from '#lib/utils';

	let { current }: { current: 'collection' | 'wishlist' } = $props();

	// `resolve` only takes existing routes: /wishlist arrives with #39.
	const links = [
		{ key: 'collection', href: '/', label: 'Collection' },
		{ key: 'wishlist', href: '/wishlist', label: 'Wishlist' }
	] as const;
</script>

<nav aria-label="Lists" class="flex gap-2">
	{#each links as link (link.key)}
		<a
			href={resolve(link.href as '/')}
			aria-current={current === link.key ? 'page' : undefined}
			class={cn(
				'inline-flex min-h-11 items-center rounded-control px-5 font-display text-sm leading-[1.1] font-bold tracking-[0.03em] uppercase shadow-(--shadow-raised) outline-ring focus-visible:outline-3 focus-visible:outline-solid',
				current === link.key ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground'
			)}
		>
			{link.label}
		</a>
	{/each}
</nav>
