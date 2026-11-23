import { catalogFromPlatform } from '#lib/server/catalog';
import { ownerActions } from '#lib/server/owner-actions';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const catalog = catalogFromPlatform();
	return {
		kits: await catalog.listKits(),
		teams: await catalog.listTeams(),
		countries: await catalog.listCountries(),
		pictured: await catalog.listPicturedKits()
	};
};

export const actions: Actions = {
	addKit: ownerActions.addKit,
	editKit: ownerActions.editKit,
	deleteKit: ownerActions.deleteKit
};
