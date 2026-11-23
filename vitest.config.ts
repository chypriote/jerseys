import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

// Separate from vite.config.ts: tests run in the Workers runtime (workerd) with a real D1
// (migrations from ./drizzle applied in test/apply-migrations.ts) and a real R2 bucket.
export default defineConfig(async () => {
	const migrations = await readD1Migrations('./drizzle');
	return {
		plugins: [
			cloudflareTest({
				miniflare: {
					compatibilityDate: '2026-08-01',
					compatibilityFlags: ['nodejs_compat'],
					d1Databases: ['DB'],
					r2Buckets: ['COVERS'],
					bindings: {
						TEST_MIGRATIONS: migrations,
						OWNER_PASSWORD: 'test-password',
						JWT_SECRET: 'test-jwt-secret'
					}
				}
			})
		],
		test: {
			include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
			setupFiles: ['./test/apply-migrations.ts']
		}
	};
});
