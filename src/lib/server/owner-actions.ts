import { fail, type RequestEvent } from '@sveltejs/kit';
import { catalogFromPlatform, UnauthorizedError } from '#lib/server/catalog';
import type { Catalog, CountryInput } from '#lib/server/catalog';
import { ownerToken } from '#lib/server/owner';

/**
 * Thin form actions over the Catalog. The forms send one JSON `payload` field.
 * Each action passes the Owner cookie token, so a write without login is refused by the Catalog.
 */
async function run<T>(
	event: RequestEvent,
	work: (catalog: Catalog, token: string, payload: T) => Promise<Record<string, unknown> | void>
) {
	let payload: T;
	try {
		payload = JSON.parse(String((await event.request.formData()).get('payload') ?? ''));
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
		})
};

/** The JSON error answer of an Owner endpoint (for bodies a form action cannot carry, like an image). */
export function endpointError(error: unknown): Response {
	if (error instanceof UnauthorizedError)
		return Response.json({ error: 'Please log in again' }, { status: 401 });
	if (error instanceof Error) return Response.json({ error: error.message }, { status: 400 });
	throw error;
}
