<script lang="ts">
	import * as NavigationMenu from '$lib/components/ui/navigation-menu';
	import { Switch } from '$lib/components/ui/switch';
	import { isMentorMode, toggleRole, isToggleEnabled } from '$lib/stores/roleToggle';
	import { userStore } from '$lib/stores/user';
	import AuthGuard from '$lib/components/AuthGuard.svelte';

	let { children } = $props();
</script>

<!-- Navigation Menu -->
<nav class="w-full bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-b border-blue-100/50 px-4 py-4 backdrop-blur-sm">
	<div class="max-w-4xl mx-auto flex items-center justify-between">
		<!-- Left spacer for centering -->
		<div class="flex-1"></div>
		
		<!-- Navigation Links - Centered -->
		<NavigationMenu.Root>
			<NavigationMenu.List class="flex justify-center">
				<NavigationMenu.Item>
					<NavigationMenu.Link href="/" class="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-white/50 rounded-lg transition-all duration-200">
						Home
					</NavigationMenu.Link>
				</NavigationMenu.Item>
				<NavigationMenu.Item>
					<NavigationMenu.Link href="/mentors" class="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-white/50 rounded-lg transition-all duration-200">
						Mentors
					</NavigationMenu.Link>
				</NavigationMenu.Item>
				<NavigationMenu.Item>
					<NavigationMenu.Link href="/requests" class="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-white/50 rounded-lg transition-all duration-200">
						Requests
					</NavigationMenu.Link>
				</NavigationMenu.Item>
				<NavigationMenu.Item>
					<NavigationMenu.Link href="/myspace" class="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-white/50 rounded-lg transition-all duration-200">
						MySpace
					</NavigationMenu.Link>
				</NavigationMenu.Item>
			</NavigationMenu.List>
		</NavigationMenu.Root>

		<!-- Right side - Role Toggle Switch -->
		<div class="flex-1 flex justify-end">
			<div class="flex items-center space-x-3 bg-white/60 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/50">
				<!-- Current Role Display -->
				<div class="text-center">
					<span class="text-xs text-gray-500 block">Current Role</span>
					<span class="text-sm font-medium text-gray-700">
						{$isMentorMode ? 'Mentor' : 'Mentee'}
					</span>
				</div>
				
				<!-- Role Toggle Switch -->
				<div class="relative group">
					<Switch 
						checked={$isMentorMode} 
						onCheckedChange={toggleRole}
						disabled={!$isToggleEnabled}
						class="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-600 data-[state=checked]:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
					/>
					{#if !$isToggleEnabled}
						<div class="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
							Mentor privileges required
							<div class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
						</div>
					{/if}
				</div>
				
				<!-- Mentor Privilege Status -->
				<div class="text-center">
					<span class="text-xs text-gray-500 block">Mentor Status</span>
					<span class="text-sm font-medium {!$userStore.profile?.is_mentor ? 'text-red-600' : 'text-green-600'}">
						{$userStore.profile?.is_mentor ? 'Approved' : 'Not Approved'}
					</span>
				</div>
			</div>
		</div>
	</div>
</nav>

<!-- Main Content -->
<main class="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
	<AuthGuard>
		{@render children?.()}
	</AuthGuard>
</main>
