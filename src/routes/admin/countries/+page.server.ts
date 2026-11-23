import { catalogFromPlatform } from '#lib/server/catalog';
import { ownerActions } from '#lib/server/owner-actions';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const catalog = catalogFromPlatform();
	return {
		countries: await catalog.listCountries(),
		counts: (await catalog.jerseyCounts()).countries
	};
};

export const actions: Actions = {
	addCountry: ownerActions.addCountry,
	editCountry: ownerActions.editCountry,
	deleteCountry: ownerActions.deleteCountry
};
