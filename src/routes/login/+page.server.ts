import { fail, redirect } from '@sveltejs/kit';
import { catalogFromPlatform } from '#lib/server/catalog';
import { setOwnerToken } from '#lib/server/owner';
import type { Actions, PageServerLoad } from './$types';

// Only the form action lives here; the lock Button opens a Popup on the home page.
export const load: PageServerLoad = () => redirect(303, '/');

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const password = String((await request.formData()).get('password') ?? '');
		const result = await catalogFromPlatform().login(password);
		if (!result.ok) return fail(400, { error: 'Wrong password' });
		setOwnerToken(cookies, result.token, url.protocol === 'https:');
		return { success: true };
	}
};
