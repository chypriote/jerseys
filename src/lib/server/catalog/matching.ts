import type { FoundKitPicture, FoundSeason, FoundTeam } from './thesportsdb';

/** Lower case, no accents, single inner spaces, no outer spaces. */
export function normalizeName(value: string) {
	return value.normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

export interface TeamToMatch {
	name: string;
	national: boolean;
	country: string;
	league: string;
}

/**
 * The TheSportsDB Team of a Team, or null. Keeps Soccer hits of the same kind (national or not)
 * whose name or an alternate name is the Team name. Among them, a hit whose Country or League is
 * the Team's wins; with none, a single named hit wins; several named hits with none agreeing is no match.
 */
export function matchTeam(team: TeamToMatch, hits: FoundTeam[]): FoundTeam | null {
	const wanted = normalizeName(team.name);
	const named = hits.filter(
		(hit) =>
			hit.soccer &&
			hit.national === team.national &&
			[hit.name, ...hit.alternateNames].some((n) => normalizeName(n) === wanted)
	);
	const agreeing = named.find(
		(hit) =>
			normalizeName(hit.country) === normalizeName(team.country) ||
			normalizeName(hit.league) === normalizeName(team.league)
	);
	return agreeing ?? (named.length === 1 ? named[0] : null);
}

/** A Split Season 2023-24 is TheSportsDB 2023-2024; a Calendar Season 2024 is 2024. */
export function sameSeason(kit: FoundSeason, found: FoundSeason | null) {
	return !!found && found.start === kit.start && found.end === kit.end;
}

/** The Kit Season's pictures first, then the other Seasons from the newest. Ties keep their order. */
export function kitSeasonFirst<T extends FoundKitPicture>(pictures: T[], kit: FoundSeason): T[] {
	const rank = (p: T) => (sameSeason(kit, p.season) ? 1 : 0);
	return [...pictures].sort(
		(a, b) =>
			rank(b) - rank(a) ||
			(b.season?.start ?? -1) - (a.season?.start ?? -1) ||
			(b.season?.end ?? -1) - (a.season?.end ?? -1)
	);
}
