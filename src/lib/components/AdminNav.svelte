<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { cn } from '#lib/utils';

	const links = [
		{ href: '/admin/countries', label: 'Countries' },
		{ href: '/admin/stores', label: 'Stores' },
		{ href: '/admin/teams', label: 'Teams' },
		{ href: '/admin/kits', label: 'Kits' },
		{ href: '/admin/main-pictures', label: 'Main pictures' }
	] as const;
</script>

<nav aria-label="Admin sections" class="flex flex-wrap gap-2">
	{#each links as link (link.href)}
		{@const current = page.url.pathname === link.href}
		<a
			href={resolve(link.href)}
			aria-current={current ? 'page' : undefined}
			class={cn(
				'inline-flex min-h-11 items-center rounded-control px-5 font-display text-sm leading-tight font-bold tracking-label uppercase shadow-(--shadow-raised) outline-ring focus-visible:outline-3 focus-visible:outline-solid',
				current ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground'
			)}
		>
			{link.label}
		</a>
	{/each}
</nav>
