import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

describe('test setup', () => {
	it('runs in workerd with a real D1', async () => {
		const row = await env.DB.prepare('SELECT 1 AS answer').first<{ answer: number }>();
		expect(row).toEqual({ answer: 1 });
	});

	it('keeps the Main Picture columns on the kit table', async () => {
		const { results } = await env.DB.prepare("SELECT name FROM pragma_table_info('kit')").all<{
			name: string;
		}>();
		const names = results.map((c) => c.name);
		expect(names).toEqual(expect.arrayContaining(['main_picture_key', 'main_picture_version']));
		expect(names.some((n) => n.startsWith('cover'))).toBe(false);
	});

	it('has a real R2 bucket', async () => {
		await env.COVERS.put('probe', 'x');
		const obj = await env.COVERS.get('probe');
		expect(await obj?.text()).toBe('x');
	});
});
