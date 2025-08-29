<script lang="ts">
	import * as NavigationMenu from '$lib/components/ui/navigation-menu/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { isMentorMode, toggleRole } from '$lib/stores/roleToggle.js';

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

		<!-- Right spacer for centering -->
		<div class="flex-1 flex justify-end">
			<!-- Role Toggle Switch -->
			<div class="flex items-center space-x-3 bg-white/60 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/50">
				<span class="text-sm font-medium text-gray-700">Mentee</span>
				<Switch 
					checked={$isMentorMode} 
					onCheckedChange={toggleRole}
					disabled={false}
					class="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-600 data-[state=checked]:to-indigo-600"
				/>
				<span class="text-sm font-medium text-gray-700">Mentor</span>
			</div>
		</div>
	</div>
</nav>

<!-- Main Content -->
<main class="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
	{@render children?.()}
</main>
