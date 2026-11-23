import { catalogFromPlatform } from '#lib/server/catalog';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const catalog = catalogFromPlatform();
	const [jerseys, coverage] = await Promise.all([catalog.listCollection(), catalog.listCoverage()]);
	return { jerseys, coverage };
};
