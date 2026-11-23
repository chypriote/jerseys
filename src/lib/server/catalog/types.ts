/**
 * Public interface of the Catalog module: the one test seam.
 * Types only. Domain names follow GLOSSARY.md.
 */

export interface Store {
	id: number;
	name: string;
}

export interface Catalog {
	// Reads (Viewer and Owner)
	listStores(): Promise<Store[]>;
}
