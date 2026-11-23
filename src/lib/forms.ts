import { deserialize } from '$app/forms';
import { invalidateAll } from '$app/navigation';
import type { Acquisition, AcquisitionInput, Store } from '#lib/server/catalog/types';
import { centsToEuros, eurosToCents } from '#lib/money';

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

/** Adds a Store at once and returns it. */
export async function addStore(name: string): Promise<Store> {
	const response = await fetch('/api/stores', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ name })
	});
	const answer = (await response.json()) as Store & { error?: string };
	if (!response.ok) throw new Error(answer.error ?? 'Could not add the store');
	await invalidateAll();
	return { id: answer.id, name: answer.name };
}

export interface AcquisitionState {
	kind: 'purchase' | 'gift';
	/** Bought date (Purchase) or Gift date. */
	date: string;
	sent: string;
	received: string;
	storeId: string;
	/** The number input may give a number. */
	price: string;
	giver: string;
}

export function emptyAcquisition(): AcquisitionState {
	return {
		kind: 'purchase',
		date: new Date().toISOString().slice(0, 10),
		sent: '',
		received: '',
		storeId: '',
		price: '',
		giver: ''
	};
}

/** The form state of a stored Acquisition, to edit it. */
export function acquisitionState(a: Acquisition): AcquisitionState {
	if (a.kind === 'gift')
		return { ...emptyAcquisition(), kind: 'gift', date: a.date, giver: a.giver ?? '' };
	return {
		kind: 'purchase',
		date: a.bought,
		sent: a.sent ?? '',
		received: a.received ?? '',
		storeId: a.store ? String(a.store.id) : '',
		price: a.priceCents === null ? '' : centsToEuros(a.priceCents),
		giver: ''
	};
}

const YEAR_OR_DATE = /^\d{4}(-\d{2}-\d{2})?$/;

/** The form state as Catalog input, or an error message to show. The Catalog checks it again. */
export function toAcquisitionInput(a: AcquisitionState): AcquisitionInput | string {
	const dates =
		a.kind === 'gift' ? { Date: a.date } : { Bought: a.date, Sent: a.sent, Received: a.received };
	for (const [label, value] of Object.entries(dates)) {
		const text = value.trim();
		if (!text && (label === 'Date' || label === 'Bought')) return `${label} is required`;
		if (text && !YEAR_OR_DATE.test(text)) return `${label}: write 2024 or 2024-05-12`;
	}
	if (a.kind === 'gift')
		return { kind: 'gift', date: a.date.trim(), giver: a.giver.trim() || null };
	const storeId = Number(a.storeId);
	if (!a.storeId || !Number.isInteger(storeId)) return 'Pick a store';
	const priceCents = eurosToCents(String(a.price));
	if (priceCents === null) return 'Price must be an amount in euros';
	return {
		kind: 'purchase',
		storeId,
		priceCents,
		bought: a.date.trim(),
		sent: a.sent.trim() || null,
		received: a.received.trim() || null
	};
}
