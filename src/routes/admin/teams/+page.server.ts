import { catalogFromPlatform } from '#lib/server/catalog';
import { ownerActions } from '#lib/server/owner-actions';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const catalog = catalogFromPlatform();
	return { teams: await catalog.listTeams(), countries: await catalog.listCountries() };
};

export const actions: Actions = {
	editTeam: ownerActions.editTeam,
	deleteTeam: ownerActions.deleteTeam
};
