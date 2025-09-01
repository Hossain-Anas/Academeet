<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  import { isAuthenticated, isLoading, auth } from '$lib/stores/auth';
  import { browser } from '$app/environment';

  let { children, redirectTo = '/auth/signin' } = $props();


  // Function to force redirect to sign in
  function forceSignOut() {
    if (browser) {
      console.log('Forcing sign out...');
      
      // Clear all storage
      localStorage.clear();
      sessionStorage.clear();

      // Prevent any navigation
      window.onpopstate = () => {
        window.location.replace(redirectTo);
        return false;
      };

      // Force reload to sign in page
      window.location.replace(redirectTo);
    }
  }

  // Function to check session validity
  async function checkSession() {
    if (!browser) return false;

    try {
      // First check local storage for token
      const hasToken = localStorage.getItem('supabase.auth.token');
      if (!hasToken) {
        console.log('No auth token found, forcing sign out...');
        forceSignOut();
        return false;
      }

      // Then verify with Supabase
      const { session, error } = await auth.getSession();
      if (!session || error) {
        console.log('Invalid session detected, forcing sign out...');
        forceSignOut();
        return false;
      }

      // Finally verify the store state
      if (!$isAuthenticated) {
        console.log('Store shows not authenticated, forcing sign out...');
        forceSignOut();
        return false;
      }

      return true;
    } catch (error) {
      console.error('Session check failed:', error);
      forceSignOut();
      return false;
    }
  }

  // Function to handle storage events (for cross-tab communication)
  function handleStorageChange(event: StorageEvent) {
    console.log('Storage changed:', event.key);
    // Check on any storage change as it might affect auth
    checkSession();
  }

  // Function to handle history changes
  function handlePopState() {
    console.log('History changed, checking session...');
    checkSession();
  }



  onMount(() => {
    if (browser) {
      // Block back button
      history.pushState(null, '', location.href);
      window.addEventListener('popstate', handlePopState);

      // Listen for storage events (cross-tab communication)
      window.addEventListener('storage', handleStorageChange);

      // Check session on focus
      window.addEventListener('focus', checkSession);

      // Check session on visibility change
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          checkSession();
        }
      });

      // Initial session check
      checkSession();
    }
  });

  onDestroy(() => {
    if (browser) {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', checkSession);
      document.removeEventListener('visibilitychange', () => {});
    }
  });

  // Watch authentication state and redirect if not authenticated
  $effect(() => {
    if (!$isLoading && !$isAuthenticated) {
      console.log('Store shows not authenticated, forcing sign out...');
      forceSignOut();
    }
  });
</script>

{#if $isLoading}
  <!-- Show loading state while checking authentication -->
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p class="text-gray-600">Checking authentication...</p>
    </div>
  </div>
{:else if $isAuthenticated}
  <!-- Show children only if authenticated -->
  {@render children?.()}
{:else}
  <!-- Redirect to sign in if not authenticated -->
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
      <p class="text-red-600">Redirecting to sign in...</p>
    </div>
  </div>
{/if}
