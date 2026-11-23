/**
 * Public interface of the Catalog module: the one test seam.
 * Types only. Domain names follow GLOSSARY.md.
 */

export interface Store {
	id: number;
	name: string;
}

export type Continent = 'europe' | 'asia-oceania' | 'americas' | 'africa';
export type SeasonFormat = 'split' | 'calendar';

export interface League {
	id: number;
	name: string;
	seasonFormat: SeasonFormat;
}

/** A Country with its one League. */
export interface Country {
	id: number;
	name: string;
	continent: Continent;
	league: League;
}

/** What the Owner types for a Country and its League. */
export interface CountryInput {
	name: string;
	continent: Continent;
	leagueName: string;
	seasonFormat: SeasonFormat;
}

// --- Kit Main Pictures ---------------------------------------------------------------

export type KitType = 'home' | 'away' | 'third' | 'fourth' | 'cup' | 'special';

/** A Kit as the admin lists it. */
export interface KitSummary {
	id: number;
	teamName: string;
	/** Formatted: "2023-24" (Split) or "2024" (Calendar). */
	season: string;
	kitType: KitType;
}

export interface MainPictureImage {
	body: ReadableStream;
	contentType: string;
}

export interface UploadMainPictureInput {
	kitId: number;
	body: ArrayBuffer;
	contentType: string;
}

/** A TheSportsDB kit picture the Owner can pick as the Main Picture. */
export interface PictureCandidate {
	/** What `pickMainPicture` takes. */
	id: string;
	imageUrl: string;
	/** Formatted as a Kit Season ("2023-24" or "2024"); null when TheSportsDB gives none. */
	season: string | null;
	/** Null for a TheSportsDB type with no Kit Type. */
	kitType: KitType | null;
}

export interface PictureCandidates {
	/** The Kit's Team, for `setTeamSource`. */
	teamId: number;
	/** The TheSportsDB Team of the Team, null when none matches. */
	sourceTeamId: string | null;
	/** The Kit Season first, then the other Seasons from the newest. */
	candidates: PictureCandidate[];
}

/** A Soccer Team found on TheSportsDB. */
export interface SourceTeam {
	id: string;
	name: string;
	country: string;
	league: string;
}

export interface LookupBatchInput {
	/** Kits to look up in this request. Keep small: subrequest limit and one TheSportsDB request every 2 s. */
	size: number;
	/** Look up again every Kit whose Main Picture the Owner did not choose. */
	rerun?: boolean;
	/** Rerun only: continue after this Kit id (the `after` of the previous batch). */
	after?: number;
}

export interface LookupProgress {
	total: number;
	done: number;
	/** Rerun only: the last Kit id looked up. Pass it back as `after` for the next batch. */
	after?: number;
	/** True when TheSportsDB answered 429: the batch stopped early. Try again later. */
	rateLimited?: boolean;
}

// --- Owner login -------------------------------------------------------------

export type LoginResult = { ok: true; token: string } | { ok: false; error: 'wrong-password' };

/**
 * Every rule and every D1 and R2 access lives behind this interface.
 * Write operations take the Owner token and fail with `UnauthorizedError` if it is invalid.
 */
export interface Catalog {
	// Reads (Viewer and Owner)
	listStores(): Promise<Store[]>;
	listCountries(): Promise<Country[]>;
	/** The Main Picture image of a Kit, or null when it has none. */
	getMainPicture(kitId: number): Promise<MainPictureImage | null>;

	// Countries (Owner). A Country and its League are written together.
	// A name another Country has (any case) is refused.
	addCountry(token: string, input: CountryInput): Promise<Country>;
	editCountry(token: string, input: CountryInput & { id: number }): Promise<Country>;

	// Stores (Owner). A name another Store has (any case) is refused.
	addStore(token: string, name: string): Promise<Store>;
	renameStore(token: string, id: number, name: string): Promise<Store>;

	// Kit Main Pictures (Owner). A Main Picture set here is marked Owner-chosen and gets a new version.
	/** Kits with no Main Picture, by Team, then Season, then Kit Type. */
	listKitsWithoutMainPicture(token: string): Promise<KitSummary[]>;
	/** Uses an uploaded JPEG, PNG or WebP image (under 2 MB) as the Main Picture of the Kit. */
	uploadMainPicture(token: string, input: UploadMainPictureInput): Promise<void>;
	/** Fetches an image from an http(s) address (same checks as an upload) and uses it as the Main Picture. */
	uploadMainPictureFromUrl(token: string, input: { kitId: number; url: string }): Promise<void>;
	/** TheSportsDB pictures of the Kit's Team. Finds and stores the TheSportsDB Team when it has none. */
	listPictureCandidates(token: string, kitId: number): Promise<PictureCandidates>;
	/** Soccer Teams on TheSportsDB for typed text. Empty text finds nothing. */
	searchTeams(token: string, query: string): Promise<SourceTeam[]>;
	/** Replaces the TheSportsDB Team of a Team. */
	setTeamSource(token: string, input: { teamId: number; sourceTeamId: string }): Promise<void>;
	/** Copies a candidate image (same checks as an upload) into R2 as the Main Picture. */
	pickMainPicture(token: string, input: { kitId: number; candidateId: string }): Promise<void>;
	/**
	 * Looks up the Main Pictures of the next `size` Kits not looked up yet (with `rerun`: every Kit
	 * whose Main Picture the Owner did not choose). Repeat until `done` reaches `total`.
	 */
	lookupNext(token: string, input: LookupBatchInput): Promise<LookupProgress>;

	// Owner login
	login(password: string): Promise<LoginResult>;
	verifyToken(token: string): Promise<boolean>;
}

/** Thrown by every Owner-only operation when the token is missing or invalid. */
export interface UnauthorizedError extends Error {
	name: 'UnauthorizedError';
}
