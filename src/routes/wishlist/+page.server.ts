import { catalogFromPlatform } from '#lib/server/catalog';
import { ownerActions } from '#lib/server/owner-actions';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const catalog = catalogFromPlatform();
	const { isOwner } = await parent();
	// The WishlistItemForm lists: Owner only.
	const [items, form] = await Promise.all([
		catalog.listWishlist(),
		isOwner
			? Promise.all([catalog.listTeams(), catalog.listCountries(), catalog.listPicturedKits()])
			: null
	]);
	return { items, form: form && { teams: form[0], countries: form[1], pictured: form[2] } };
};

export const actions: Actions = {
	addWishlistItem: ownerActions.addWishlistItem
};
