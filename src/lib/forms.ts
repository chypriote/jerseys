import { deserialize } from '$app/forms';
import { invalidateAll } from '$app/navigation';

export type Outcome = { ok: true } | { ok: false; error: string };

/** Posts one JSON payload to a form action of the current page and reloads the page data on success. */
export async function postAction(action: string, payload: unknown): Promise<Outcome> {
	const body = new FormData();
	body.set('payload', JSON.stringify(payload));
	try {
		const response = await fetch(action, {
			method: 'POST',
			body,
			headers: { 'x-sveltekit-action': 'true' }
		});
		const result = deserialize(await response.text());
		if (result.type === 'success') {
			await invalidateAll();
			return { ok: true };
		}
		const message = result.type === 'failure' ? result.data?.error : undefined;
		return { ok: false, error: typeof message === 'string' ? message : 'Something went wrong' };
	} catch {
		return { ok: false, error: 'Network error' };
	}
}
