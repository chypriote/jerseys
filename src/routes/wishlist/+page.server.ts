import { catalogFromPlatform } from '#lib/server/catalog';
import { ownerActions } from '#lib/server/owner-actions';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const catalog = catalogFromPlatform();
	const { isOwner } = await parent();
	// The WishlistItemForm and GotItForm lists: Owner only.
	const [items, form] = await Promise.all([
		catalog.listWishlist(),
		isOwner
			? Promise.all([
					catalog.listTeams(),
					catalog.listCountries(),
					catalog.listStores(),
					catalog.listPicturedKits(),
					catalog.listKits()
				])
			: null
	]);
	return {
		items,
		form: form && {
			teams: form[0],
			countries: form[1],
			stores: form[2],
			pictured: form[3],
			kits: form[4]
		}
	};
};

export const actions: Actions = {
	addWishlistItem: ownerActions.addWishlistItem,
	gotIt: ownerActions.gotIt,
	drop: ownerActions.drop
};
