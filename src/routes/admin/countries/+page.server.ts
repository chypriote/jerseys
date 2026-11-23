import { catalogFromPlatform } from '#lib/server/catalog';
import { ownerActions } from '#lib/server/owner-actions';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({
	countries: await catalogFromPlatform().listCountries()
});

export const actions: Actions = {
	addCountry: ownerActions.addCountry,
	editCountry: ownerActions.editCountry,
	deleteCountry: ownerActions.deleteCountry
};
