import type { SourceTeam, TeamChoice } from '#lib/server/catalog/types';

const plain = (text: string) =>
	text
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();

/** TheSportsDB names often add a word ("Aalborg BK"), so one name inside the other counts. */
export function matchesSourceTeam(typed: string, found: SourceTeam[]) {
	const wanted = plain(typed);
	return found.some((team) => {
		const name = plain(team.name);
		return name === wanted || name.includes(wanted) || wanted.includes(name);
	});
}

/** The name of a Team the Owner is adding, or null for an existing Team. */
export function newTeamName(team: TeamChoice | null) {
	return team && !('teamId' in team) ? team.name.trim() || null : null;
}

/** A warning when TheSportsDB has no Team of that name. Null when it has one or cannot be asked. */
export async function unknownTeamMessage(name: string): Promise<string | null> {
	try {
		const response = await fetch(`/api/teams/search?q=${encodeURIComponent(name)}`);
		if (!response.ok) return null;
		const { teams } = (await response.json()) as { teams: SourceTeam[] };
		return matchesSourceTeam(name, teams)
			? null
			: `“${name}” is not on TheSportsDB. Save again to add it anyway.`;
	} catch {
		return null;
	}
}
