import type { KitType } from './types';
import { MAX_UPLOAD_BYTES, readBody } from './images';

/**
 * TheSportsDB v1 client. The only module that knows TheSportsDB URLs and field names.
 * Every request, images included, waits for the shared slot.
 */

const API = 'https://www.thesportsdb.com/api/v1/json';
const IMAGE_HOST = 'r2.thesportsdb.com';
const USER_AGENT = 'jerseys/0.1';

/** Primary leagues of national teams on TheSportsDB. */
const INTERNATIONAL_LEAGUE =
	/world cup|international|friendlies|nations league|european championship|copa am[eé]rica|asian cup|nations cup|africa cup|gold cup/i;

const KIT_TYPES: Record<string, KitType> = {
	'1st': 'home',
	'2nd': 'away',
	'3rd': 'third',
	'4th': 'fourth'
};

export interface SportsDbConfig {
	key: string;
	/** Minimum gap between two TheSportsDB requests. */
	intervalMs: number;
}

export interface FoundTeam {
	id: string;
	name: string;
	alternateNames: string[];
	soccer: boolean;
	national: boolean;
	country: string;
	league: string;
}

export interface FoundSeason {
	start: number;
	/** Null for a one-year Season. */
	end: number | null;
}

export interface FoundKitPicture {
	imageUrl: string;
	/** Null when TheSportsDB gives no readable Season. */
	season: FoundSeason | null;
	/** Null for types with no Kit Type (goalkeeper, training…). */
	kitType: KitType | null;
}

/** Next time (ms since epoch) a TheSportsDB request may start. Shared by every Catalog in the isolate. */
let nextSlot = 0;

async function waitForSlot(intervalMs: number) {
	const slot = Math.max(Date.now(), nextSlot);
	nextSlot = slot + intervalMs;
	const wait = slot - Date.now();
	if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
}

async function request(config: SportsDbConfig, url: URL | string) {
	await waitForSlot(config.intervalMs);
	const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
	if (!response.ok) throw new Error(`TheSportsDB answered ${response.status}`);
	return response;
}

async function api<T>(config: SportsDbConfig, file: string, params: Record<string, string>) {
	if (!config.key) throw new Error('THESPORTSDB_KEY is not set');
	const url = new URL(`${API}/${encodeURIComponent(config.key)}/${file}`);
	for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
	return (await (await request(config, url)).json()) as T;
}

/** "2023-2024" or "2023-24" → 2023 to 2024, "2024" → 2024. */
function parseSeason(value: string | null | undefined): FoundSeason | null {
	const match = /^(\d{4})(?:-(\d{2}|\d{4}))?$/.exec(value?.trim() ?? '');
	if (!match) return null;
	const start = Number(match[1]);
	if (!match[2]) return { start, end: null };
	const end =
		match[2].length === 2 ? Math.floor(start / 100) * 100 + Number(match[2]) : Number(match[2]);
	return { start, end: end < start ? end + 100 : end };
}

/** Teams whose name or alternate name looks like `name`. Empty text finds nothing. */
export async function searchTeams(config: SportsDbConfig, name: string): Promise<FoundTeam[]> {
	if (!name.trim()) return [];
	const data = await api<{
		teams?:
			| {
					idTeam: string;
					strTeam: string;
					strTeamAlternate?: string | null;
					strSport?: string | null;
					strLeague?: string | null;
					strCountry?: string | null;
			  }[]
			| null;
	}>(config, 'searchteams.php', { t: name.trim() });
	return (data.teams ?? []).map((hit) => ({
		id: hit.idTeam,
		name: hit.strTeam,
		alternateNames: (hit.strTeamAlternate ?? '')
			.split(',')
			.map((n) => n.trim())
			.filter(Boolean),
		soccer: hit.strSport === 'Soccer',
		national: INTERNATIONAL_LEAGUE.test(hit.strLeague ?? ''),
		country: hit.strCountry ?? '',
		league: hit.strLeague ?? ''
	}));
}

/** The kit pictures ("equipment") of a TheSportsDB Team, in TheSportsDB order. */
export async function listKitPictures(
	config: SportsDbConfig,
	teamId: string
): Promise<FoundKitPicture[]> {
	const data = await api<{
		equipment?:
			{ strSeason?: string | null; strType?: string | null; strEquipment?: string | null }[] | null;
	}>(config, 'lookupequipment.php', { id: teamId });
	return (data.equipment ?? []).flatMap((item) =>
		item.strEquipment && isKitPictureUrl(item.strEquipment)
			? [
					{
						imageUrl: item.strEquipment,
						season: parseSeason(item.strSeason),
						kitType: KIT_TYPES[item.strType?.trim() ?? ''] ?? null
					}
				]
			: []
	);
}

/** True for an https image address on the TheSportsDB image host. */
export function isKitPictureUrl(address: string) {
	try {
		const url = new URL(address);
		return url.protocol === 'https:' && url.host === IMAGE_HOST;
	} catch {
		return false;
	}
}

/** Fetches a kit picture. The caller checks its type and size as an upload. */
export async function fetchKitPicture(config: SportsDbConfig, address: string) {
	if (!isKitPictureUrl(address)) throw new Error('Unknown candidate');
	const response = await request(config, address);
	const body = await readBody(response, MAX_UPLOAD_BYTES);
	if (!body) throw new Error('The image must be under 2 MB');
	const contentType = (response.headers.get('content-type') ?? '').split(';')[0].trim();
	return { body: body.buffer as ArrayBuffer, contentType };
}
