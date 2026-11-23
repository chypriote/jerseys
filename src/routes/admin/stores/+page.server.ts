import { catalogFromPlatform } from '#lib/server/catalog';
import { ownerActions } from '#lib/server/owner-actions';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({
	stores: await catalogFromPlatform().listStores()
});

export const actions: Actions = {
	addStore: ownerActions.addStore,
	renameStore: ownerActions.renameStore,
	deleteStore: ownerActions.deleteStore
};
