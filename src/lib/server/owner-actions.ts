import { fail, type Cookies, type RequestEvent } from '@sveltejs/kit';
import { catalogFromPlatform, UnauthorizedError } from '#lib/server/catalog';
import type {
	AddWishlistItemInput,
	Catalog,
	CountryInput,
	GotItInput,
	JerseyInput,
	KitEditInput,
	KitInput,
	MainPictureFile,
	TeamEditInput,
	TeamInput
} from '#lib/server/catalog';
import { ownerToken } from '#lib/server/owner';

/**
 * Thin form actions over the Catalog. The forms send one JSON `payload` field, and the Kit forms
 * may add a `mainPicture` file, passed on as `payload.mainPicture`.
 * Each action passes the Owner cookie token, so a write without login is refused by the Catalog.
 */
async function run<T>(
	event: RequestEvent,
	work: (catalog: Catalog, token: string, payload: T) => Promise<Record<string, unknown> | void>
) {
	let payload: T;
	try {
		const form = await event.request.formData();
		payload = JSON.parse(String(form.get('payload') ?? ''));
		const file = form.get('mainPicture');
		if (file instanceof File) {
			const mainPicture: MainPictureFile = {
				body: await file.arrayBuffer(),
				contentType: file.type
			};
			payload = { ...payload, mainPicture };
		}
	} catch {
		return fail(400, { error: 'Unreadable form' });
	}
	try {
		const extra = await work(catalogFromPlatform(), ownerToken(event.cookies), payload);
		return { ok: true, ...extra };
	} catch (error) {
		if (error instanceof UnauthorizedError) return fail(401, { error: 'Please log in again' });
		if (error instanceof Error) return fail(400, { error: error.message });
		throw error;
	}
}

export const ownerActions = {
	addStore: (event: RequestEvent) =>
		run<{ name: string }>(event, async (catalog, token, { name }) => {
			await catalog.addStore(token, String(name ?? ''));
		}),
	renameStore: (event: RequestEvent) =>
		run<{ id: number; name: string }>(event, async (catalog, token, { id, name }) => {
			await catalog.renameStore(token, Number(id), String(name ?? ''));
		}),
	addCountry: (event: RequestEvent) =>
		run<CountryInput>(event, async (catalog, token, input) => {
			await catalog.addCountry(token, input);
		}),
	editCountry: (event: RequestEvent) =>
		run<CountryInput & { id: number }>(event, async (catalog, token, input) => {
			await catalog.editCountry(token, { ...input, id: Number(input.id) });
		}),
	addTeam: (event: RequestEvent) =>
		run<TeamInput>(event, async (catalog, token, input) => {
			await catalog.addTeam(token, input);
		}),
	editTeam: (event: RequestEvent) =>
		run<TeamEditInput>(event, async (catalog, token, input) => {
			await catalog.editTeam(token, input);
		}),
	addKit: (event: RequestEvent) =>
		run<KitInput>(event, async (catalog, token, input) => {
			await catalog.addKit(token, input);
		}),
	editKit: (event: RequestEvent) =>
		run<KitEditInput>(event, async (catalog, token, input) => {
			await catalog.editKit(token, input);
		}),
	addJersey: (event: RequestEvent) =>
		run<JerseyInput>(event, async (catalog, token, input) => {
			await catalog.addJersey(token, input);
		}),
	editJersey: (event: RequestEvent) =>
		run<JerseyInput & { id: number }>(event, async (catalog, token, input) => {
			await catalog.editJersey(token, { ...input, id: Number(input.id) });
		}),
	addWishlistItem: (event: RequestEvent) =>
		run<AddWishlistItemInput>(event, async (catalog, token, input) => {
			const result = await catalog.addWishlistItem(token, input);
			return { alreadyOwned: result.status === 'already-owned' };
		}),
	gotIt: (event: RequestEvent) =>
		run<GotItInput>(event, async (catalog, token, input) => {
			await catalog.gotIt(token, input);
		}),
	drop: (event: RequestEvent) =>
		run<{ id: number }>(event, async (catalog, token, { id }) => {
			await catalog.drop(token, Number(id));
		}),
	deleteJersey: deleteAction('deleteJersey'),
	deleteKit: deleteAction('deleteKit'),
	deleteTeam: deleteAction('deleteTeam'),
	deleteCountry: deleteAction('deleteCountry'),
	deleteStore: deleteAction('deleteStore')
};

/** A form action that deletes the row with the payload `id`. */
function deleteAction(
	method: 'deleteJersey' | 'deleteKit' | 'deleteTeam' | 'deleteCountry' | 'deleteStore'
) {
	return (event: RequestEvent) =>
		run<{ id: number }>(event, async (catalog, token, { id }) => {
			await catalog[method](token, Number(id));
		});
}

/**
 * Runs an Owner endpoint (for bodies a form action cannot carry, like an image) with the Catalog
 * and the Owner cookie token, and answers its errors as JSON.
 */
export async function ownerEndpoint(
	cookies: Cookies,
	work: (catalog: Catalog, token: string) => Promise<Response>
): Promise<Response> {
	try {
		return await work(catalogFromPlatform(), ownerToken(cookies));
	} catch (error) {
		return endpointError(error);
	}
}

function endpointError(error: unknown): Response {
	if (error instanceof UnauthorizedError)
		return Response.json({ error: 'Please log in again' }, { status: 401 });
	if (error instanceof Error) return Response.json({ error: error.message }, { status: 400 });
	throw error;
}
