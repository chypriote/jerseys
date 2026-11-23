import { catalogFromPlatform } from '#lib/server/catalog';
import { ownerActions } from '#lib/server/owner-actions';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const catalog = catalogFromPlatform();
	const { isOwner } = await parent();
	// The JerseyForm lists: Owner only.
	const [jerseys, coverage, form] = await Promise.all([
		catalog.listCollection(),
		catalog.listCoverage(),
		isOwner
			? Promise.all([catalog.listTeams(), catalog.listCountries(), catalog.listStores()])
			: null
	]);
	return {
		jerseys,
		coverage,
		form: form && { teams: form[0], countries: form[1], stores: form[2] }
	};
};

export const actions: Actions = {
	addJersey: ownerActions.addJersey,
	editJersey: ownerActions.editJersey
};
