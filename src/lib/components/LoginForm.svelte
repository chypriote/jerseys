<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from './Button.svelte';
	import Field from './Field.svelte';

	let { onSuccess }: { onSuccess: () => void } = $props();

	let password = $state('');
	let error = $state<string | null>(null);
	let busy = $state(false);
</script>

<form
	method="POST"
	action="/login"
	class="flex flex-col gap-4"
	use:enhance={({ formData }) => {
		// Field has no `name`: the bound value is what is sent.
		formData.set('password', password);
		busy = true;
		return async ({ result, update }) => {
			busy = false;
			if (result.type === 'success') {
				error = null;
				password = '';
				await update({ reset: false }); // reloads the load functions: isOwner flips
				onSuccess();
			} else {
				error = 'Wrong password';
			}
		};
	}}
>
	<Field label="Password" type="password" required bind:value={password} {error} />
	<Button intent="success" type="submit" loading={busy}>Log in</Button>
</form>
