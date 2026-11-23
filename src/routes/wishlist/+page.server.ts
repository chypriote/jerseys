import { catalogFromPlatform } from '#lib/server/catalog';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return { items: await catalogFromPlatform().listWishlist() };
};
