import { redirect } from '@sveltejs/kit';
import { catalogFromPlatform } from '#lib/server/catalog';
import { ownerActions } from '#lib/server/owner-actions';
import { ownerToken } from '#lib/server/owner';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	const catalog = catalogFromPlatform();
	const token = ownerToken(cookies);
	if (token === '' || !(await catalog.verifyToken(token))) redirect(303, '/');
	return {
		stores: await catalog.listStores(),
		countries: await catalog.listCountries(),
		kitsWithoutMainPicture: await catalog.listKitsWithoutMainPicture(token)
	};
};

export const actions: Actions = {
	addStore: ownerActions.addStore,
	renameStore: ownerActions.renameStore,
	addCountry: ownerActions.addCountry,
	editCountry: ownerActions.editCountry
};
