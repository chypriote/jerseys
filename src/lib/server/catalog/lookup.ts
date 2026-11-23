import { eq, sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { countries, kits, leagues, teams } from '../db/schema';
import { checkImage } from './images';
import { matchTeam, sameSeason } from './matching';
import { fetchKitPicture, listKitPictures, searchTeams, type SportsDbConfig } from './thesportsdb';

/** What the Main Picture lookup reads and writes. */
export interface LookupContext {
	db: DrizzleD1Database;
	covers: R2Bucket;
	sportsDb: SportsDbConfig;
}

/** Writes the image as the Main Picture of the Kit and changes its URL. */
export async function putMainPicture(
	{ db, covers }: LookupContext,
	kitId: number,
	image: { body: ArrayBuffer; contentType: string; chosen: boolean }
) {
	const mainPictureKey = `main-pictures/${kitId}`;
	await covers.put(mainPictureKey, image.body, {
		httpMetadata: { contentType: image.contentType }
	});
	await db
		.update(kits)
		.set({
			mainPictureKey,
			mainPictureChosen: image.chosen,
			mainPictureVersion: sql`${kits.mainPictureVersion} + 1`
		})
		.where(eq(kits.id, kitId));
}

/** A Kit with its Team, Country and League, or a readable error. */
export async function kitWithTeam({ db }: LookupContext, kitId: number) {
	const found = (
		await db
			.select({ kit: kits, team: teams, country: countries.name, league: leagues.name })
			.from(kits)
			.innerJoin(teams, eq(kits.teamId, teams.id))
			.innerJoin(countries, eq(teams.countryId, countries.id))
			.innerJoin(leagues, eq(countries.leagueId, leagues.id))
			.where(eq(kits.id, kitId))
	)[0];
	if (!found) throw new Error('Kit not found');
	return found;
}

/** The stored TheSportsDB Team of a Team, or the one the Team match finds (then stored). */
export async function sourceTeamOf(
	{ db, sportsDb }: LookupContext,
	found: Awaited<ReturnType<typeof kitWithTeam>>
) {
	if (found.team.sourceTeamId) return found.team.sourceTeamId;
	const hit = matchTeam(
		{
			name: found.team.name,
			national: found.team.kind === 'national',
			country: found.country,
			league: found.league
		},
		await searchTeams(sportsDb, found.team.name)
	);
	if (!hit) return null;
	await db.update(teams).set({ sourceTeamId: hit.id }).where(eq(teams.id, found.team.id));
	return hit.id;
}

/**
 * Looks up the Main Picture of one Kit: the TheSportsDB picture of its Team with the same Season
 * and Kit Type, stored as a Main Picture the Owner did not choose. No Team or no match keeps the
 * current Main Picture. An Owner-chosen Main Picture is never replaced. Marks the Kit looked up.
 * Throws on a TheSportsDB error (the Kit stays not looked up); Kit create catches and logs it.
 */
export async function lookUpMainPicture(ctx: LookupContext, kitId: number) {
	const found = await kitWithTeam(ctx, kitId);
	const markLookedUp = () =>
		ctx.db.update(kits).set({ mainPictureLookedUp: true }).where(eq(kits.id, kitId));
	const isChosen = async () =>
		(
			await ctx.db.select({ chosen: kits.mainPictureChosen }).from(kits).where(eq(kits.id, kitId))
		)[0].chosen;
	if (found.kit.mainPictureChosen) return markLookedUp();
	const sourceTeamId = await sourceTeamOf(ctx, found);
	const season = { start: found.kit.seasonStartYear, end: found.kit.seasonEndYear };
	const match = sourceTeamId
		? (await listKitPictures(ctx.sportsDb, sourceTeamId)).find(
				(p) => p.kitType === found.kit.kitType && sameSeason(season, p.season)
			)
		: undefined;
	if (match) {
		const image = await fetchKitPicture(ctx.sportsDb, match.imageUrl);
		checkImage(image.body, image.contentType);
		// The Owner may have chosen a Main Picture while the lookup was running.
		if (!(await isChosen())) await putMainPicture(ctx, kitId, { ...image, chosen: false });
	}
	await markLookedUp();
}
