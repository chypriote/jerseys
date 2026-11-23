import { catalogFromPlatform } from '#lib/server/catalog';
import { ownerActions } from '#lib/server/owner-actions';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const catalog = catalogFromPlatform();
	return { kits: await catalog.listKits(), teams: await catalog.listTeams() };
};

export const actions: Actions = {
	editKit: ownerActions.editKit,
	deleteKit: ownerActions.deleteKit
};
