import { describe, expect, it } from 'vitest';
import { matchesSourceTeam, newTeamName } from './team-name';

const found = (name: string) => [{ id: '1', name, country: 'Denmark', league: 'Superliga' }];

describe('matchesSourceTeam', () => {
	it('ignores case, accents and punctuation', () => {
		expect(matchesSourceTeam('olympique lyonnais', found('Olympique Lyonnais'))).toBe(true);
		expect(matchesSourceTeam('Atlético Madrid', found('Atletico Madrid'))).toBe(true);
	});

	it('accepts one name inside the other', () => {
		expect(matchesSourceTeam('Aalborg', found('Aalborg BK'))).toBe(true);
		expect(matchesSourceTeam('Aalborg BK', found('Aalborg'))).toBe(true);
	});

	it('refuses a name TheSportsDB does not have', () => {
		expect(matchesSourceTeam('Aalbork', found('Aalborg BK'))).toBe(false);
		expect(matchesSourceTeam('Aalborg', [])).toBe(false);
	});
});

describe('newTeamName', () => {
	it('answers the trimmed name of a new Team only', () => {
		expect(newTeamName({ name: ' Odense ', kind: 'club', countryId: 1 })).toBe('Odense');
		expect(newTeamName({ teamId: 3 })).toBeNull();
		expect(newTeamName(null)).toBeNull();
	});
});
