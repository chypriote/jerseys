import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

describe('test setup', () => {
	it('runs in workerd with a real D1', async () => {
		const row = await env.DB.prepare('SELECT 1 AS answer').first<{ answer: number }>();
		expect(row).toEqual({ answer: 1 });
	});

	it('has a real R2 bucket', async () => {
		await env.COVERS.put('probe', 'x');
		const obj = await env.COVERS.get('probe');
		expect(await obj?.text()).toBe('x');
	});
});
