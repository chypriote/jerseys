<script lang="ts">
	let { url }: { url: string } = $props();
</script>

<!-- An external address: resolve() is for the app's own paths. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<a
	href={url}
	target="_blank"
	rel="noreferrer"
	class="text-sm font-bold text-primary underline outline-ring focus-visible:outline-3 focus-visible:outline-solid"
>
	Find pictures on Football Kit Archive
</a>
<!-- eslint-enable svelte/no-navigation-without-resolve -->
