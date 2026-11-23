import { goto } from '$app/navigation';
import { page } from '$app/state';
import { untrack } from 'svelte';

/**
 * Keeps `?search=` in the address equal to the search field: a text sets it, an empty field removes
 * it, and no history entry is added. Call it while a component initialises.
 */
export function syncSearchParam(search: () => string) {
	$effect(() => {
		const text = search().trim() ? search() : '';
		// Only the field triggers this: a changed address is the effect's own doing.
		untrack(() => {
			if ((page.url.searchParams.get('search') ?? '') === text) return;
			// A throwaway copy to edit, not state.
			// eslint-disable-next-line svelte/prefer-svelte-reactivity
			const url = new URL(page.url.href);
			if (text) url.searchParams.set('search', text);
			else url.searchParams.delete('search');
			// The same page with another query: no route to resolve.
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			void goto(url, { replace: true, shallow: true, state: page.state });
		});
	});
}
