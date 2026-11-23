<script lang="ts">
	/** `onOpen` runs on a click, besides opening the page in a new tab. */
	let { url, onOpen }: { url: string; onOpen?: () => void } = $props();
</script>

<!-- An external address: resolve() is for the app's own paths. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<a
	href={url}
	target="_blank"
	rel="noreferrer"
	onclick={onOpen}
	class="text-sm font-bold text-primary underline outline-ring focus-visible:outline-3 focus-visible:outline-solid"
>
	Find pictures on Football Kit Archive
</a>
<!-- eslint-enable svelte/no-navigation-without-resolve -->
