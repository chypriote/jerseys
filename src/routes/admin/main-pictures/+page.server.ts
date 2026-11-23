import { catalogFromPlatform } from '#lib/server/catalog';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { token } = await parent();
	return { kitsWithoutMainPicture: await catalogFromPlatform().listKitsWithoutMainPicture(token) };
};
