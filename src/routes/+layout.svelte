<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	import { initializeAuth } from '$lib/stores/auth';
	import { supabase } from '$lib/supabaseClient';

	let { children } = $props();

	import { browser } from '$app/environment';
	import { onDestroy } from 'svelte';
	let checkInterval: number;

	// Initialize authentication immediately
	initializeAuth().then(() => {
		console.log('Auth initialized in root layout');
		
		// Start periodic session check only in browser
		if (browser) {
			checkInterval = window.setInterval(async () => {
				try {
					// Just check the session without reinitializing everything
					const { data: { session }, error } = await supabase.auth.getSession();
					if (error || !session) {
						console.log('Session expired, redirecting to login...');
						window.location.replace('/auth/signin');
					}
				} catch (error) {
					console.error('Session check failed:', error);
				}
			}, 60000); // Check every minute
		}
	}).catch(error => {
		console.error('Failed to initialize auth:', error);
	});

	onDestroy(() => {
		if (browser && checkInterval) {
			clearInterval(checkInterval);
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children?.()}