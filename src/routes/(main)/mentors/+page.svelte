<script lang="ts">
	import MentorCard from '$lib/components/MentorCard.svelte';
	import { Input } from '$lib/components/ui/input/index.js';

	import { onMount } from 'svelte';
	import { UserController } from '$lib/controllers/userController';
	import type { UserData } from '$lib/types/database';

	interface MentorCardData {
		user_id: string;
		name: string;
		department: string;
		skills: string[];
		rating: number;
		students: number;
		avatar: string;

		bio: string;
		teachingStyle: string;
		sessionTypes: string[];
	}

	let mentors: MentorCardData[] = [];
	let isLoading = true;
	let error: string | null = null;

	async function loadMentors() {
		try {
			isLoading = true;
			error = null;

			// Get all mentors using the controller
			const mentorUsers = await UserController.getMentors();

			// Transform data to match MentorCard component expectations
			mentors = await Promise.all(mentorUsers.map(async (user: UserData): Promise<MentorCardData> => {
				// Get user stats including total completed sessions
				const stats = await UserController.getUserStats(user.user_id!);

				// Parse JSON strings if they're stored as strings
				const skills = typeof user.skills === 'string' ? JSON.parse(user.skills) : (user.skills || []);
				const interests = typeof user.interests === 'string' ? JSON.parse(user.interests) : (user.interests || []);
				const sessionTypes = typeof user.session_types === 'string' ? JSON.parse(user.session_types) : (user.session_types || []);

				return {
					user_id: user.user_id!,
					name: user.name || 'Anonymous',
					department: user.department || 'Not specified',
					skills: skills,
					rating: stats.averageRating,
					students: stats.completedSessions,
					avatar: '', // Will use first letter of name,
					bio: interests?.[0] || 'No bio provided',
					teachingStyle: user.teaching_style || '',
					sessionTypes: sessionTypes
				};
			}));

		} catch (err) {
			console.error('Error loading mentors:', err);
			error = err instanceof Error ? err.message : 'An unknown error occurred';
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		loadMentors();
	});



	let searchQuery = '';
	let filteredMentors = mentors;

	// Filter mentors based on search query
	async function searchMentors(query: string) {
		try {
			isLoading = true;
			error = null;

			if (query.trim() === '') {
				filteredMentors = mentors;
			} else {
				const searchResults = await UserController.searchMentors(query);
				
				// Transform search results to match MentorCard format
				filteredMentors = await Promise.all(searchResults.map(async (user: UserData): Promise<MentorCardData> => {
					// Get user stats including total completed sessions
					const stats = await UserController.getUserStats(user.user_id!);

					// Parse JSON strings if they're stored as strings
					const skills = typeof user.skills === 'string' ? JSON.parse(user.skills) : (user.skills || []);
					const interests = typeof user.interests === 'string' ? JSON.parse(user.interests) : (user.interests || []);
					const sessionTypes = typeof user.session_types === 'string' ? JSON.parse(user.session_types) : (user.session_types || []);

					return {
						user_id: user.user_id!,
						name: user.name || 'Anonymous',
						department: user.department || 'Not specified',
						skills: skills,
						rating: stats.averageRating,
						students: stats.completedSessions,
						avatar: '', // Will use first letter of name,
						bio: interests?.[0] || 'No bio provided',
						teachingStyle: user.teaching_style || '',
						sessionTypes: sessionTypes
					};
				}));
			}
		} catch (err) {
			console.error('Error searching mentors:', err);
			error = err instanceof Error ? err.message : 'An unknown error occurred';
		} finally {
			isLoading = false;
		}
	}

	// Watch searchQuery changes
	$: {
		if (searchQuery.trim() === '') {
			filteredMentors = mentors;
		} else {
			searchMentors(searchQuery);
		}
	}

	function clearSearch() {
		searchQuery = '';
	}
</script>

<div class="container mx-auto px-4 py-8">
	<!-- Header -->
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900 mb-2">Find Your Mentor</h1>
		<p class="text-gray-600">Connect with experienced mentors who can help you excel in your studies</p>
	</div>

	<!-- Search Section -->
	<div class="mb-8">
		<div class="flex gap-4 items-center">
			<div class="flex-1">
				<Input
					type="text"
					placeholder="Search by skills, name, or department (e.g., web development, JavaScript, Computer Science)"
					bind:value={searchQuery}
					class="w-full"
				/>
			</div>
			{#if searchQuery}
				<button 
					class="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
					on:click={() => clearSearch()}
				>
					Clear
				</button>
			{/if}
		</div>
		
		<!-- Search Results Info -->
		{#if !isLoading && !error}
			<div class="mt-4 text-sm text-gray-600">
				{#if searchQuery}
					Showing {filteredMentors.length} of {mentors.length} mentors
					{#if filteredMentors.length === 0}
						<span class="text-red-600"> - No mentors found for "{searchQuery}"</span>
					{/if}
				{:else}
					Showing all {mentors.length} mentors
				{/if}
			</div>
		{/if}
	</div>

	<!-- Loading State -->
	{#if isLoading}
		<div class="text-center py-12">
			<div class="animate-spin text-4xl mb-4">⚙️</div>
			<h3 class="text-xl font-semibold text-gray-900 mb-2">Loading mentors...</h3>
			<p class="text-gray-600">Please wait while we fetch the available mentors</p>
		</div>
	<!-- Error State -->
	{:else if error}
		<div class="text-center py-12">
			<div class="text-4xl mb-4">⚠️</div>
			<h3 class="text-xl font-semibold text-gray-900 mb-2">Error loading mentors</h3>
			<p class="text-gray-600 mb-4">{error}</p>
			<button 
				class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
				on:click={loadMentors}
			>
				Try Again
			</button>
		</div>
	<!-- Mentors Grid -->
	{:else if filteredMentors.length > 0}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each filteredMentors as mentor}
				<MentorCard {mentor} />
			{/each}
		</div>
	<!-- No Results -->
	{:else}
		<div class="text-center py-12">
			<div class="text-6xl mb-4">🔍</div>
			<h3 class="text-xl font-semibold text-gray-900 mb-2">No mentors found</h3>
			<p class="text-gray-600 mb-4">
				Try searching for different skills or browse all mentors
			</p>
			<button 
				class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
				on:click={() => clearSearch()}
			>
				View All Mentors
			</button>
		</div>
	{/if}
</div>
