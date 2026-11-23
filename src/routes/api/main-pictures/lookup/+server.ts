import { json } from '@sveltejs/kit';
import type { LookupBatchInput } from '#lib/server/catalog';
import { ownerEndpoint } from '#lib/server/owner-actions';
import type { RequestHandler } from './$types';

/** Small batches: the subrequest limit and one TheSportsDB request every 2 seconds (up to 3 per Kit). */
const BATCH_SIZE = 5;

/**
 * One Main Picture lookup batch per request. The caller repeats it until `done` reaches `total`.
 * Optional JSON body: `rerun` and `after` (the `after` of the previous rerun batch).
 */
export const POST: RequestHandler = ({ request, cookies }) =>
	ownerEndpoint(cookies, async (catalog, token) => {
		const body = (await request.json().catch(() => ({}))) as Partial<LookupBatchInput>;
		return json(
			await catalog.lookupNext(token, {
				size: BATCH_SIZE,
				rerun: body.rerun === true,
				after: typeof body.after === 'number' ? body.after : undefined
			})
		);
	});
