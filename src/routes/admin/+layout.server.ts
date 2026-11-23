import { redirect } from '@sveltejs/kit';
import { catalogFromPlatform } from '#lib/server/catalog';
import { ownerToken } from '#lib/server/owner';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies }) => {
	const token = ownerToken(cookies);
	if (token === '' || !(await catalogFromPlatform().verifyToken(token))) redirect(303, '/');
	return { token };
};
