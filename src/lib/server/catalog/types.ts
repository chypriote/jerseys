/**
 * Public interface of the Catalog module: the one test seam.
 * Types only. Domain names follow GLOSSARY.md.
 */

import type { KIT_TYPES, VERSIONS } from '../db/schema';

export interface JerseyCounts {
	countries: Record<number, number>;
	teams: Record<number, number>;
	stores: Record<number, number>;
}

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

export type KitType = (typeof KIT_TYPES)[number];

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

// --- Collection --------------------------------------------------------------

export type Version = (typeof VERSIONS)[number];
export type Size = 'S' | 'M' | 'L';
export type Fit = 'too-small' | 'good' | 'too-big';
export type TeamKind = 'club' | 'national';

/** Dates are as stored: `YYYY` or `YYYY-MM-DD`. A null price or Store is unknown. */
export type Acquisition =
	| {
			kind: 'purchase';
			store: Store | null;
			priceCents: number | null;
			bought: string;
			sent: string | null;
			received: string | null;
	  }
	| { kind: 'gift'; date: string; giver: string | null };

/** A Kit with its Team and the Team's Country (a Club's League is its Country's League). */
export interface KitView {
	id: number;
	/** Formatted: "2023-24" (Split) or "2024" (Calendar). */
	season: string;
	kitType: KitType;
	mainPictureKey: string | null;
	mainPictureVersion: number;
	team: {
		id: number;
		name: string;
		kind: TeamKind;
		country: { id: number; name: string; continent: Continent };
	};
}

export interface CollectionJersey {
	id: number;
	version: Version;
	size: Size | null;
	fit: Fit | null;
	print: string | null;
	kit: KitView;
	acquisition: Acquisition;
}

// --- Wishlist ----------------------------------------------------------------

export interface WishlistItem {
	id: number;
	/** Null: any Version. */
	version: Version | null;
	kit: KitView;
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

// --- Coverage ----------------------------------------------------------------

export interface CoverageCountry {
	id: number;
	name: string;
	covered: boolean;
}

// --- Jersey form ---------------------------------------------------------------

/** A Team as the TeamLookup lists it. */
export interface TeamView {
	id: number;
	name: string;
	kind: TeamKind;
	/** Calendar for a National Team, else its League's Season Format. */
	seasonFormat: SeasonFormat;
	country: { id: number; name: string; continent: Continent };
}

/** A known Team, or a new Team the save creates. */
export type TeamChoice = { teamId: number } | { name: string; kind: TeamKind; countryId: number };

/** Dates are `YYYY` or `YYYY-MM-DD`. Prices are euro cents. */
export type AcquisitionInput =
	| {
			kind: 'purchase';
			storeId: number;
			priceCents: number;
			bought: string;
			sent?: string | null;
			received?: string | null;
	  }
	| { kind: 'gift'; date: string; giver?: string | null };

/** Finds the Kit by Team + Season + Kit Type, or creates it. */
export interface KitInput {
	team: TeamChoice;
	/** "2023-24" for a Split Season, "2024" for a Calendar Season. */
	season: string;
	kitType: KitType;
	/**
	 * The form's "Main picture" (same rules as `uploadMainPicture`): stored as the Owner-chosen
	 * Main Picture of the Kit. A new Kit sent with one skips the TheSportsDB lookup.
	 */
	mainPicture?: MainPictureFile | null;
	/** An image address to fetch as the Main Picture, when no file is sent. Same rules. */
	mainPictureUrl?: string | null;
}

/** A Kit by Team, formatted Season and Kit Type: what the forms compare their fields to. */
export interface KitKey {
	teamId: number;
	season: string;
	kitType: KitType;
}

export interface MainPictureFile {
	body: ArrayBuffer;
	contentType: string;
}

export interface JerseyInput extends KitInput {
	version: Version;
	size: Size | null;
	fit: Fit | null;
	print?: string | null;
	acquisition: AcquisitionInput;
}

// --- Wishlist Item form ------------------------------------------------------

export interface AddWishlistItemInput extends KitInput {
	/** null = any Version. */
	version: Version | null;
	/** Set to true after the "Already owned" notice. */
	addAnyway?: boolean;
}

export type AddWishlistItemResult =
	{ status: 'added'; item: WishlistItem } | { status: 'already-owned' };

// --- Got it ------------------------------------------------------------------

export interface GotItInput {
	wishlistItemId: number;
	/** The Jersey of the Wishlist Item's Kit. */
	jersey: Pick<JerseyInput, 'version' | 'size' | 'fit' | 'print' | 'acquisition'>;
}

// --- Import (once) ------------------------------------------------------------

/** A Team named by name; a new Team is created in the named Country. */
export interface ImportTeam {
	name: string;
	kind: TeamKind;
	country: string;
}

/** A Country with its League. An existing Country (same name, any case) is kept as it is. */
export interface ImportCountryRow {
	name: string;
	continent: Continent;
	league: string;
	seasonFormat: SeasonFormat;
}

export interface ImportKitRow {
	team: ImportTeam;
	/** "2023-24" for a Split Season, "2024" for a Calendar Season. */
	season: string;
	kitType: KitType;
}

// --- Teams and Kits admin -----------------------------------------------------

export interface TeamEditInput {
	teamId: number;
	name: string;
	kind: TeamKind;
	countryId: number;
}

export interface KitEditInput {
	kitId: number;
	/** "2023-24" for a Split Season, "2024" for a Calendar Season. */
	season: string;
	kitType: KitType;
	/** A new Main Picture: a file, or an address to fetch when no file is sent. Same rules as `KitInput`. */
	mainPicture?: MainPictureFile | null;
	mainPictureUrl?: string | null;
}

/** Dates are `YYYY` or `YYYY-MM-DD`. A Store is named; a null Store or price is unknown. */
export type ImportAcquisition =
	| {
			kind: 'purchase';
			store: string | null;
			priceCents: number | null;
			bought: string;
			sent?: string | null;
			received?: string | null;
	  }
	| { kind: 'gift'; date: string; giver?: string | null };

export interface ImportJerseyRow extends ImportKitRow {
	version: Version;
	size: Size | null;
	fit: Fit | null;
	print?: string | null;
	acquisition: ImportAcquisition;
}

export interface ImportWishlistRow extends ImportKitRow {
	/** null = any Version. */
	version: Version | null;
}

/** The cleaned sheet rows (import/rows.json). */
export interface ImportRows {
	countries: ImportCountryRow[];
	jerseys: ImportJerseyRow[];
	wishlist: ImportWishlistRow[];
}

/** How many rows the import created. */
export interface ImportRowsResult {
	countries: number;
	stores: number;
	teams: number;
	kits: number;
	jerseys: number;
	wishlistItems: number;
}

// --- Owner login -------------------------------------------------------------

export type LoginResult = { ok: true; token: string } | { ok: false; error: 'wrong-password' };

// --- Kit Pictures --------------------------------------------------------------------

/** An extra Picture of a Kit, beyond its Main Picture. */
export interface Picture {
	id: number;
	kitId: number;
	/** 1 for the first Picture added to the Kit, then the next number. */
	position: number;
}

export interface AddPictureInput {
	kitId: number;
	body: ArrayBuffer;
	contentType: string;
}

/**
 * Every rule and every D1 and R2 access lives behind this interface.
 * Write operations take the Owner token and fail with `UnauthorizedError` if it is invalid.
 */
export interface Catalog {
	// Reads (Viewer and Owner)
	listStores(): Promise<Store[]>;
	listCountries(): Promise<Country[]>;
	/** How many Jerseys each Country, Team and Store has, by id. An id with none is absent. */
	jerseyCounts(): Promise<JerseyCounts>;
	/** Every Jersey with its Kit, Team, Country and Acquisition, newest Acquisition first. */
	listCollection(): Promise<CollectionJersey[]>;
	/** Every Country by name, covered when Nico owns a Jersey of its National Team or of a Club in its League. */
	listCoverage(): Promise<CoverageCountry[]>;
	/** Every Wishlist Item with its Kit, Team and Country, most wanted first. */
	listWishlist(): Promise<WishlistItem[]>;
	/** Kits that have a Main Picture: the forms hide their "Main picture" input for these. */
	listPicturedKits(): Promise<KitKey[]>;
	/** The Main Picture image of a Kit, or null when it has none. */
	getMainPicture(kitId: number): Promise<MainPictureImage | null>;

	// Countries (Owner). A Country and its League are written together.
	// A name another Country has (any case) is refused.
	addCountry(token: string, input: CountryInput): Promise<Country>;
	editCountry(token: string, input: CountryInput & { id: number }): Promise<Country>;

	// Stores (Owner). A name another Store has (any case) is refused.
	addStore(token: string, name: string): Promise<Store>;
	renameStore(token: string, id: number, name: string): Promise<Store>;

	// Teams and Kits admin (Owner). The forms and the import create them; these fix them.
	/** Every Kit with its Team and Country, by Team, then Season, then Kit Type. */
	listKits(): Promise<KitView[]>;
	/** Renames a Team or changes its kind or Country. Its Kits keep their Seasons. */
	editTeam(token: string, input: TeamEditInput): Promise<TeamView>;
	/** Changes a Kit's Season (in its Team's Season Format) or Kit Type. Its Jerseys and Wishlist Item follow. */
	editKit(token: string, input: KitEditInput): Promise<KitView>;

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

	// Jerseys (Owner). The Kit is found by Team + Season + Kit Type, or created.
	/** Every Team by name. */
	listTeams(): Promise<TeamView[]>;
	addJersey(token: string, input: JerseyInput): Promise<CollectionJersey>;
	/** Changing the Team, Season or Kit Type moves the Jersey to that Kit. */
	editJersey(token: string, input: JerseyInput & { id: number }): Promise<CollectionJersey>;

	// Wishlist (Owner). The Kit is found or created as for a Jersey. One Wishlist Item per Kit.
	/** Without `addAnyway`, saves nothing and answers `already-owned` when Nico owns a Jersey of the Kit. */
	addWishlistItem(token: string, input: AddWishlistItemInput): Promise<AddWishlistItemResult>;
	/** Removes the Wishlist Item and adds the Jersey of its Kit, together. An invalid Jersey changes nothing. */
	gotIt(token: string, input: GotItInput): Promise<CollectionJersey>;
	/** Removes the Wishlist Item. The Kit stays. */
	drop(token: string, wishlistItemId: number): Promise<void>;

	// Import (Owner, once)
	/**
	 * Checks every row, then writes them all in one D1 batch: missing Countries, Stores and Teams
	 * are created, existing ones matched by name; Kits are found or created. Refused when a Jersey
	 * or a Wishlist Item exists. An invalid row throws an error naming it, and nothing is saved.
	 */
	importRows(token: string, rows: ImportRows): Promise<ImportRowsResult>;
	// Kit Pictures. Same image rules as the Main Picture.
	/** The extra Pictures of a Kit, in the order they were added. */
	listPictures(kitId: number): Promise<Picture[]>;
	/** The Picture image, or null when there is none. */
	getPicture(pictureId: number): Promise<MainPictureImage | null>;
	/** Owner: adds an uploaded JPEG, PNG or WebP image (under 2 MB) as the Kit's next Picture. A Kit without a Main Picture takes it as its Main Picture instead (answers null). */
	addPicture(token: string, input: AddPictureInput): Promise<Picture | null>;
	/** Owner: the image at an http(s) address (under 2 MB), for the browser to clean and add. */
	fetchPicture(token: string, url: string): Promise<MainPictureFile>;

	// Delete (Owner), to fix a mistake. A row that other rows still use is refused, never cascaded.
	/** The Kit stays, even without Jerseys. */
	deleteJersey(token: string, jerseyId: number): Promise<void>;
	/** Refused while a Purchase uses it. The Official Store is never deleted. */
	deleteStore(token: string, storeId: number): Promise<void>;
	/** Deletes the Country and its League. Refused while a Team uses it. */
	deleteCountry(token: string, countryId: number): Promise<void>;
	/** Refused while the Team has a Kit. */
	deleteTeam(token: string, teamId: number): Promise<void>;
	/** Deletes the Kit, its Pictures and their images and its Main Picture in R2. Refused while a Jersey or its Wishlist Item uses it. */
	deleteKit(token: string, kitId: number): Promise<void>;
	/** Deletes the Picture and its image in R2. */
	deletePicture(token: string, pictureId: number): Promise<void>;

	// Owner login
	login(password: string): Promise<LoginResult>;
	verifyToken(token: string): Promise<boolean>;
}

/** Thrown by every Owner-only operation when the token is missing or invalid. */
export interface UnauthorizedError extends Error {
	name: 'UnauthorizedError';
}
