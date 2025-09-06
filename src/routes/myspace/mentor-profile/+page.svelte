<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { profile, userLoading, userError, userStore } from '$lib/stores/user';
	import { auth, user } from '$lib/stores/auth';
	import { supabase } from '$lib/supabaseClient.js';
	import { onMount } from 'svelte';
	import { HelpOfferController } from '$lib/controllers/helpOfferController';
	import { toast } from '$lib/stores/toast';

	interface MentorProfile {
		name: string;
		email: string;
		department: string;
		expertise: string[];
		bio: string;
		teachingStyle: string;
		sessionTypes: string[];
		rating: number;
		totalSessions: number;
		profilePicture: string;
	}

	// Basic mentor profile data - will be populated from userStore
	let mentorProfile: MentorProfile = {
		name: 'User',
		email: 'user@example.com',
		department: '',
		expertise: [] as string[],
		bio: '',
		teachingStyle: '',
		sessionTypes: [] as string[],
		rating: 0,
		totalSessions: 0,
		profilePicture: ''
	};
	
		// Track if component is mounted to prevent hydration mismatch
	let isMounted = false;
	
	// Sessions data - initially empty
	let sessions: any[] = [];
	
	// Mentor's sent offers
	let mentorOffers: any[] = [];
	let isLoadingOffers = false;
	let selectedOffer: any = null;
	let showOfferDialog = false;
	
	// Show loading until component is mounted
	$: showContent = isMounted;

	let searchQuery = '';
	let sortBy = 'date';
	let statusSortOrder = 0; // 0: ongoing first, 1: upcoming first, 2: completed first
	let editProfileData = { ...mentorProfile };
	let newExpertise = '';
	let newSessionType = '';
	let showStatusDialog = false;
	let selectedSession: any = null;
	let showSessionDialog = false;

	// Convert UTC to Bangladesh time
	function utcToBD(utcDateTime: string): string {
		if (!utcDateTime || utcDateTime === 'null' || utcDateTime === 'undefined') {
			return 'Not specified';
		}
		
		try {
			const date = new Date(utcDateTime);
			if (isNaN(date.getTime())) {
				return 'Invalid date';
			}
			
			const formatter = new Intl.DateTimeFormat('en-US', {
				timeZone: 'Asia/Dhaka',
				year: 'numeric',
				month: 'numeric',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
				hour12: true
			});
			
			return formatter.format(date)
				.replace(' AM', ' AM BDT')
				.replace(' PM', ' PM BDT');
		} catch (error) {
			return 'Invalid date';
		}
	}

	// Load mentor's sent offers
	async function loadMentorOffers() {
		if (!$user?.id) return;
		
		try {
			isLoadingOffers = true;
			const offers = await HelpOfferController.getHelpOffersByMentor($user.id);
			
			// Fetch request details for each offer
			const offersWithRequests = await Promise.all(
				offers.map(async (offer) => {
					try {
						const { data: requestData, error } = await supabase
							.from('help_requests')
							.select(`
								*,
								mentee:users!help_requests_mentee_id_fkey(*)
							`)
							.eq('request_id', offer.request_id)
							.single();
						
						if (error) {
							console.error('Error fetching request for offer:', offer.offer_id, error);
							return { ...offer, request: null };
						}
						
						return { ...offer, request: requestData };
					} catch (error) {
						console.error('Error fetching request details:', error);
						return { ...offer, request: null };
					}
				})
			);
			
			mentorOffers = offersWithRequests;
		} catch (error) {
			console.error('Error loading mentor offers:', error);
			toast.show('Failed to load offers', 'error');
		} finally {
			isLoadingOffers = false;
		}
	}

	// Mentor application variables
	let showMentorDialog = false;
	let isSubmitting = false;
	let applicationSubmitted = false;
	let mentorApplication = {
		areasOfExpertise: '',
		bio: '',
		availability: '',
		teachingMode: 'both'
	};

	// Removed handleAcademeetClick function - using proper Svelte link instead

	async function handleSaveProfile() {
		try {
			// Update local state
			mentorProfile = { ...editProfileData };
			
			// Here you would typically save to backend via userStore
			// For now, we'll just update the local state
			console.log('Profile updated:', mentorProfile);
			
			// Update profile in Supabase
			if (!$user) throw new Error('User not authenticated');

			const { error: updateError } = await supabase
				.from('users')
				.update({
					department: editProfileData.department,
					skills: editProfileData.expertise,
					interests: editProfileData.bio ? [editProfileData.bio] : [],
					teaching_style: editProfileData.teachingStyle,
					session_types: editProfileData.sessionTypes
				})
				.eq('user_id', $user.id);

			if (updateError) throw updateError;

			// Refresh profile data to get the latest changes
			await refreshProfile();
		} catch (error) {
			console.error('Failed to save profile:', error);
		}
	}

	function addExpertise() {
		if (newExpertise.trim() && !editProfileData.expertise.includes(newExpertise.trim())) {
			editProfileData.expertise = [...editProfileData.expertise, newExpertise.trim()];
			newExpertise = '';
		}
	}

	function removeExpertise(index: number) {
		editProfileData.expertise = editProfileData.expertise.filter((_, i) => i !== index);
	}

	function addSessionType() {
		if (newSessionType.trim() && !editProfileData.sessionTypes?.includes(newSessionType.trim())) {
			editProfileData.sessionTypes = [...(editProfileData.sessionTypes || []), newSessionType.trim()];
			newSessionType = '';
		}
	}

	function removeSessionType(index: number) {
		editProfileData.sessionTypes = editProfileData.sessionTypes?.filter((_, i) => i !== index) || [];
	}

	function handleStatusSort() {
		statusSortOrder = (statusSortOrder + 1) % 3; // Cycle through 0, 1, 2
		sortBy = 'status';
	}

	function showSessionDetails(session: any) {
		selectedSession = session;
		showSessionDialog = true;
	}

	// Mentor application functions
	async function submitMentorApplication() {
		isSubmitting = true;
		
		try {
			if (!$user) {
				throw new Error('User not authenticated');
			}

			// Update user profile with mentor status and details
			const { error } = await supabase
				.from('users')
				.update({ 
					is_mentor: true,
					skills: mentorApplication.areasOfExpertise.split(',').map(s => s.trim()),
					interests: [mentorApplication.bio]
				})
				.eq('user_id', $user.id);

			if (error) throw error;
			
			applicationSubmitted = true;
			showMentorDialog = false;
			
			// Refresh profile data
			await refreshProfile();
			
		} catch (error) {
			console.error('Failed to submit application:', error);
		} finally {
			isSubmitting = false;
		}
	}

	// Initialize profile data from userStore
	onMount(() => {
		console.log('Mentor profile page mounted');
		
		// Mark component as mounted
		isMounted = true;
		
		// Load mentor offers
		loadMentorOffers();
		
		// Return cleanup function
		return () => {
			console.log('Mentor profile page unmounting');
		};
	});

	// Track previous state to prevent unnecessary updates
	let prevState = {
		isMounted: false,
		profileId: null as string | null,
		userId: null as string | null,
		loading: false
	};

	// Use reactive statement to handle profile updates
	$: {
		const currentState = {
			isMounted,
			profileId: $profile?.user_id || null,
			userId: $user?.id || null,
			loading: $userLoading
		};

		// Only log state changes if something relevant has changed
		if (
			prevState.isMounted !== currentState.isMounted ||
			prevState.profileId !== currentState.profileId ||
			prevState.userId !== currentState.userId ||
			prevState.loading !== currentState.loading
		) {
			console.log('Profile state changed:', {
				isMounted,
				profile: $profile,
				userLoading: $userLoading,
				user: $user
			});

			if (isMounted) {
				if ($profile) {
					console.log('Using profile data:', $profile);
					mentorProfile = {
						name: $profile.name || ($user?.user_metadata?.name || 'User'),
						email: $profile.email || ($user?.email || 'user@example.com'),
						department: $profile.department || '',
						expertise: $profile.skills || [],
						bio: $profile.interests?.join(', ') || '',
						teachingStyle: $profile.teaching_style || '',
						sessionTypes: $profile.session_types || [],
						rating: 0, // Will be calculated from reviews
						totalSessions: 0, // Will be calculated from bookings
						profilePicture: ''
					} as MentorProfile;
					editProfileData = { ...mentorProfile };
				} else if (!$userLoading && $user) {
					console.log('Using auth user data:', $user);
					mentorProfile = {
						name: $user.user_metadata?.name || 'User',
						email: $user.email || 'user@example.com',
						department: $user.user_metadata?.department || '',
						expertise: $user.user_metadata?.skills || [],
						bio: $user.user_metadata?.interests?.join(', ') || '',
						teachingStyle: $user.user_metadata?.teaching_style || '',
						sessionTypes: $user.user_metadata?.session_types || [],
						rating: 0,
						totalSessions: 0,
						profilePicture: ''
					} as MentorProfile;
					editProfileData = { ...mentorProfile };
				} else if (!$userLoading) {
					console.log('No profile or user data available, using defaults');
					mentorProfile = {
						name: 'User',
						email: 'user@example.com',
						department: '',
						expertise: [],
						bio: '',
						teachingStyle: '',
						sessionTypes: [],
						rating: 0,
						totalSessions: 0,
						profilePicture: ''
					} as MentorProfile;
					editProfileData = { ...mentorProfile };
				}
			}

			// Update previous state
			prevState = currentState;
		}
	}

	// Function to refresh profile data
	async function refreshProfile() {
		try {
			if (!$user) return;

			const { data, error } = await supabase
				.from('users')
				.select('*')
				.eq('user_id', $user.id)
				.single();

			if (error) throw error;

			// Update the profile store
			userStore.update(state => ({
				...state,
				profile: data,
				isLoading: false,
				error: null
			}));
		} catch (error) {
			console.error('Error refreshing profile:', error);
		}
	}

	// Function to handle sign out
	async function handleSignOut() {
		try {
			const { error } = await auth.signOut();
			if (error) {
				console.error('Sign out error:', error);
			} else {
				// Redirect to sign in page
				window.location.href = '/auth/signin';
			}
		} catch (error) {
			console.error('Sign out failed:', error);
		}
	}

	// Reactive statements for userStore state with fallbacks
	$: isLoading = $userLoading || false;
	$: error = $userError || null;
	
	// Debug: Log current user state and show success message
	$: if ($profile) {
		console.log('Current user profile:', $profile);
		// Profile successfully loaded
	}
	
	// Fallback for when profile store is not ready
	$: if (!$profile && !isLoading && !error) {
		console.log('Profile store not ready yet, using default values');
	}
	
	// Update mentorProfile when profile store changes (for reactive updates)
	$: if (isMounted && $profile && ($profile.name !== mentorProfile.name || $profile.email !== mentorProfile.email)) {
		mentorProfile = {
			name: $profile.name || 'User',
			email: $profile.email || 'user@example.com',
			department: $profile.department || '',
			expertise: $profile.skills || [],
			bio: $profile.interests?.join(', ') || '',
			teachingStyle: $profile.teaching_style || '',
			sessionTypes: $profile.session_types || [],
			rating: 0,
			totalSessions: 0,
			profilePicture: ''
		} as MentorProfile;
		editProfileData = { ...mentorProfile };
	}

	// Get status statistics
	$: statusStats = {
		ongoing: sessions.filter(s => s.status === 'ongoing').length,
		upcoming: sessions.filter(s => s.status === 'upcoming').length,
		completed: sessions.filter(s => s.status === 'completed').length
	};

	// Filter and sort sessions
	$: filteredSessions = sessions
		.filter(session => 
			session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
			session.student.toLowerCase().includes(searchQuery.toLowerCase()) ||
			session.subject.toLowerCase().includes(searchQuery.toLowerCase())
		)
		.sort((a, b) => {
			// Sort by selected criteria
			switch (sortBy) {
				case 'status':
					// Define status order based on current statusSortOrder
					let statusOrder: Record<string, number>;
					switch (statusSortOrder) {
						case 0: // ongoing first
							statusOrder = { ongoing: 0, upcoming: 1, completed: 2 };
							break;
						case 1: // upcoming first
							statusOrder = { upcoming: 0, ongoing: 1, completed: 2 };
							break;
						case 2: // completed first
							statusOrder = { completed: 0, ongoing: 1, upcoming: 2 };
							break;
						default:
							statusOrder = { ongoing: 0, upcoming: 1, completed: 2 };
					}
					return statusOrder[a.status] - statusOrder[b.status];
				case 'date':
					return new Date(b.date).getTime() - new Date(a.date).getTime();
				case 'title':
					return a.title.localeCompare(b.title);
				case 'student':
					return a.student.localeCompare(b.student);
				default:
					return 0;
			}
		});
</script>

{#if showContent}
	<!-- Custom MySpace Navigation -->
	<nav class="w-full bg-white border-b border-gray-200 px-4 py-3">
		<div class="max-w-4xl mx-auto flex items-center justify-between">
			<!-- Back to Home Link -->
			<a
				href="/"
				class="text-lg font-medium text-blue-600 hover:text-blue-700 transition-colors"
			>
				Back to Home
			</a>
			
			<!-- Navigation Links - Centered -->
			<div class="flex items-center space-x-8">
				<a href="/myspace" class="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">
					MySpace
				</a>
				<a href="/myspace/mentor-profile" class="px-3 py-2 text-sm font-medium text-blue-600 border-b-2 border-blue-600">
					Mentor Profile
				</a>
				<a href="/myspace/mentee-profile" class="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">
					Mentee Profile
				</a>
			</div>

			<!-- Sign Out Button -->
			<button
				onclick={handleSignOut}
				class="text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg transition-all duration-200 border border-red-200 hover:border-red-300"
			>
				Sign Out
			</button>
		</div>
	</nav>
{/if}

{#if showContent}
<div class="container mx-auto px-4 py-8 max-w-6xl">
	<div class="flex justify-between items-center mb-8">
		<h1 class="text-3xl font-bold text-gray-900">Mentor Profile Page</h1>
		
		<!-- Join as Mentor Button -->
		<Button 
			onclick={() => showMentorDialog = true}
			class="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300 font-medium"
		>
			👨‍🏫 Join as Mentor
		</Button>
	</div>

	<!-- Loading State -->
	{#if isLoading}
		<div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
			<div class="flex items-center justify-between">
				<div class="flex items-center">
					<span class="text-blue-600 mr-2">⏳</span>
					<p class="text-blue-800 text-sm">Loading your profile...</p>
				</div>
				<Button 
					variant="outline" 
					size="sm" 
					onclick={refreshProfile}
					class="text-xs"
				>
					🔄 Refresh
				</Button>
			</div>
		</div>
	{/if}

	<!-- Error State -->
	{#if error}
		<div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
			<div class="flex items-center justify-between">
				<div class="flex items-center">
					<span class="text-red-600 mr-2">⚠️</span>
					<p class="text-red-800 text-sm">Error loading profile: {error}</p>
				</div>
				<Button 
					variant="outline" 
					size="sm" 
					onclick={refreshProfile}
					class="text-xs"
				>
					🔄 Retry
				</Button>
			</div>
		</div>
	{/if}

	<!-- Welcome Message -->
	{#if !isLoading && !error && !mentorProfile.department && mentorProfile.expertise.length === 0 && !mentorProfile.bio}
		<div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
			<div class="flex items-center">
				<span class="text-blue-600 mr-2">💡</span>
				<p class="text-blue-800 text-sm">
					<strong>Welcome!</strong> Your basic info is set up. Click "Edit Profile" to add your expertise and bio to complete your mentor profile.
				</p>
			</div>
		</div>
	{/if}
	<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
		<!-- Profile Picture Card -->
		<div class="bg-white rounded-lg shadow-md p-6 flex flex-col items-center">
			<div class="w-32 h-32 rounded-full bg-gray-200 mb-4 flex items-center justify-center">
				<span class="text-4xl text-gray-500">👤</span>
			</div>
			<h2 class="text-xl font-semibold text-gray-900 mb-2">
				{mentorProfile.name}
			</h2>
			<p class="text-sm text-gray-600 mb-4">
				{mentorProfile.department || 'Your Department'}
			</p>
			{#if mentorProfile.department}
				<div class="flex items-center mb-2">
					<span class="text-yellow-500">★</span>
					<span class="text-sm text-gray-700 ml-1">
						{mentorProfile.rating > 0 ? mentorProfile.rating : 'No rating yet'}
					</span>
				</div>
				<p class="text-sm text-gray-600">
					{mentorProfile.totalSessions > 0 ? `${mentorProfile.totalSessions} sessions completed` : 'No sessions yet'}
				</p>
			{:else}
				<p class="text-sm text-gray-500 italic">Complete your profile to get started</p>
			{/if}
		</div>

		<!-- Profile Info Card -->
		<div class="bg-white rounded-lg shadow-md p-6 md:col-span-2">
			<div class="flex justify-between items-start mb-4">
				<h2 class="text-xl font-semibold text-gray-900">Profile Information</h2>
				<Dialog.Root>
					<Dialog.Trigger>
						<Button variant="outline" size="sm">Edit Profile</Button>
					</Dialog.Trigger>
					<Dialog.Content class="max-w-2xl w-full">
						<Dialog.Header>
							<Dialog.Title>Edit Profile</Dialog.Title>
							<Dialog.Description>
								Update your mentor profile information. Your name and email are managed through your account settings.
							</Dialog.Description>
						</Dialog.Header>
						<div class="space-y-4">
							<div>
								<label for="department" class="block text-sm font-medium text-gray-700 mb-1">Department</label>
								<Input 
									id="department" 
									value={editProfileData.department} 
									disabled 
									class="bg-gray-100 cursor-not-allowed"
								/>
								<p class="text-xs text-gray-500 mt-1">Department cannot be changed</p>
							</div>
							<div>
								<label for="bio" class="block text-sm font-medium text-gray-700 mb-1">Bio</label>
								<textarea 
									id="bio" 
									bind:value={editProfileData.bio}
									class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									rows="3"
									placeholder="Introduce yourself and describe your background..."
								></textarea>
							</div>

							<div>
								<label for="newExpertise" class="block text-sm font-medium text-gray-700 mb-1">Expertise</label>
								<div class="space-y-3">
									<div class="flex gap-2">
										<input 
											id="newExpertise"
											type="text"
											placeholder="Add new expertise..." 
											bind:value={newExpertise}
											onkeydown={(e) => e.key === 'Enter' && addExpertise()}
											class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										/>
										<button 
											class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
											onclick={addExpertise}
										>
											Add
										</button>
									</div>
									<div class="flex flex-wrap gap-2">
										{#each editProfileData.expertise as skill, index}
											<div class="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
												<span>{skill}</span>
												<button 
													class="text-blue-600 hover:text-blue-800"
													onclick={() => removeExpertise(index)}
												>
													×
												</button>
											</div>
										{/each}
									</div>
								</div>
							</div>

							<div>
								<label for="teachingStyle" class="block text-sm font-medium text-gray-700 mb-1">Teaching Style</label>
								<textarea 
									id="teachingStyle" 
									bind:value={editProfileData.teachingStyle}
									class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									rows="3"
									placeholder="Describe your teaching approach, methods, and what makes your sessions unique..."
								></textarea>
							</div>

							<div>
								<label for="newSessionType" class="block text-sm font-medium text-gray-700 mb-1">Session Types</label>
								<div class="space-y-3">
									<div class="flex gap-2">
										<input 
											id="newSessionType"
											type="text"
											placeholder="Add session type..." 
											bind:value={newSessionType}
											onkeydown={(e) => e.key === 'Enter' && addSessionType()}
											class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										/>
										<button 
											class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
											onclick={addSessionType}
										>
											Add
										</button>
									</div>
									<div class="flex flex-wrap gap-2">
										{#each editProfileData.sessionTypes as type, index}
											<div class="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
												<span>{type}</span>
												<button 
													class="text-green-600 hover:text-green-800"
													onclick={() => removeSessionType(index)}
												>
													×
												</button>
											</div>
										{/each}
									</div>
									<p class="text-xs text-gray-500">Examples: One-on-one tutoring, Project-based learning, Code review, Career guidance</p>
								</div>
							</div>
						</div>
						<div class="flex justify-end space-x-2 mt-6">
							<Dialog.Close>
								<Button variant="outline">Cancel</Button>
							</Dialog.Close>
							<Dialog.Close>
								<button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700" onclick={handleSaveProfile}>Save Changes</button>
							</Dialog.Close>
						</div>
					</Dialog.Content>
				</Dialog.Root>
			</div>
			
			<div class="space-y-3">
				<div>
					<span class="text-sm font-medium text-gray-700">Name:</span>
					<p class="text-sm text-gray-900 font-medium">{mentorProfile.name}</p>
				</div>
				<div>
					<span class="text-sm font-medium text-gray-700">Email:</span>
					<p class="text-sm text-gray-900">{mentorProfile.email}</p>
				</div>
				<div>
					<span class="text-sm font-medium text-gray-700">Expertise:</span>
					<div class="flex flex-wrap gap-2 mt-1">
						{#if mentorProfile.expertise.length > 0}
							{#each mentorProfile.expertise as skill}
								<span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">{skill}</span>
							{/each}
						{:else}
							<p class="text-sm text-gray-500 italic">No expertise added yet</p>
						{/if}
					</div>
				</div>
				<div>
					<span class="text-sm font-medium text-gray-700">Bio:</span>
					<p class="text-sm text-gray-900 mt-1">
						{mentorProfile.bio || 'No bio provided'}
					</p>
				</div>
			</div>
		</div>
	</div>

	<!-- My Sent Offers Section -->
	<div class="bg-white rounded-lg shadow-md p-6 mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">My Sent Offers</h2>
		
		{#if isLoadingOffers}
			<div class="text-center py-8">
				<div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
				<p class="mt-2 text-gray-600">Loading offers...</p>
			</div>
		{:else if mentorOffers.length === 0}
			<div class="text-center py-8 text-gray-500">
				<p>You haven't sent any offers yet.</p>
				<a href="/requests" class="text-blue-600 hover:text-blue-800 underline">Browse requests to make offers</a>
			</div>
		{:else}
			<div class="max-h-96 overflow-y-auto space-y-3 pr-2">
				{#each mentorOffers as offer}
					<div 
						class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
						role="button"
						tabindex="0"
						onclick={() => {
							selectedOffer = offer;
							showOfferDialog = true;
						}}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								selectedOffer = offer;
								showOfferDialog = true;
							}
						}}
					>
						<div class="flex justify-between items-start">
							<div class="flex-1">
								<h3 class="text-lg font-semibold text-gray-900 mb-1">{offer.request?.title || 'Request Title'}</h3>
								<div class="flex items-center space-x-4 text-sm text-gray-600 mb-2">
									<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
										{offer.request?.course_code || 'Course'}
									</span>
									<span class="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
										{offer.status}
									</span>
									<span class="text-lg font-bold text-green-600">Tk {offer.proposed_fee || 'Not specified'}</span>
								</div>
								<p class="text-gray-700 mb-2 line-clamp-2">{offer.message || 'No message provided'}</p>
								<div class="text-sm text-gray-600">
									<span class="font-medium">To:</span> {offer.request?.mentee?.name || 'Anonymous'}
									{#if offer.proposed_time}
										<span class="ml-4 font-medium">Offered Time:</span> {utcToBD(offer.proposed_time)}
									{/if}
								</div>
							</div>
							<div class="text-right">
								<div class="text-xs text-gray-500">
									{utcToBD(offer.created_at)}
								</div>
								<div class="mt-2">
									<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
										{offer.status === 'Accepted' ? 'bg-green-100 text-green-800' : 
										 offer.status === 'Declined' ? 'bg-red-100 text-red-800' : 
										 offer.status === 'Withdrawn' ? 'bg-gray-100 text-gray-800' : 
										 'bg-yellow-100 text-yellow-800'}">
										{offer.status}
									</span>
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Search and Sort Section -->
	<div class="bg-white rounded-lg shadow-md p-6 mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Sort by + search bar</h2>
		<div class="flex flex-col sm:flex-row gap-4">
			<div class="flex-1">
				<Input 
					placeholder="Search sessions by title, student, or subject..." 
					bind:value={searchQuery}
				/>
			</div>
			<div class="flex gap-2">
				<select 
					bind:value={sortBy}
					class="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				>
					<option value="date">Sort by Date</option>
					<option value="title">Sort by Title</option>
					<option value="student">Sort by Student</option>
				</select>
				<button 
					class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
					onclick={handleStatusSort}
				>
					Sort by Status ({statusSortOrder === 0 ? 'Ongoing' : statusSortOrder === 1 ? 'Upcoming' : 'Completed'} first)
				</button>
				<button class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50" onclick={() => searchQuery = ''}>Clear</button>
			</div>
		</div>
	</div>

	<!-- Sessions Table -->
	<div class="bg-white rounded-lg shadow-md p-6">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">List of ongoing sessions Made by One user (with status)</h2>
		
		<div class="overflow-x-auto">
			<table class="w-full">
				<thead>
					<tr class="border-b border-gray-200">
						<th class="text-left py-3 px-4 font-medium text-gray-700">Session</th>
						<th class="text-left py-3 px-4 font-medium text-gray-700">Student</th>
						<th class="text-left py-3 px-4 font-medium text-gray-700">Subject</th>
						<th class="text-left py-3 px-4 font-medium text-gray-700">Date & Time</th>
						<th class="text-left py-3 px-4 font-medium text-gray-700">Duration</th>
						<th class="text-left py-3 px-4 font-medium text-gray-700">Status</th>
					</tr>
				</thead>
				<tbody>
					{#each filteredSessions as session}
						<tr class="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onclick={() => showSessionDetails(session)}>
							<td class="py-3 px-4">
								<div class="font-medium text-gray-900">{session.title}</div>
							</td>
							<td class="py-3 px-4 text-gray-700">{session.student}</td>
							<td class="py-3 px-4 text-gray-700">{session.subject}</td>
							<td class="py-3 px-4 text-gray-700">
								{new Date(session.date).toLocaleDateString()} at {new Date(session.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
							</td>
							<td class="py-3 px-4 text-gray-700">{session.duration} min</td>
							<td class="py-3 px-4">
								<span class="px-2 py-1 text-xs rounded-full {
									session.status === 'ongoing' ? 'bg-green-100 text-green-800' :
									session.status === 'upcoming' ? 'bg-yellow-100 text-yellow-800' :
									'bg-gray-100 text-gray-800'
								}">
									{session.status}
								</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		
		{#if filteredSessions.length === 0}
			<div class="text-center py-8 text-gray-500">
				{searchQuery ? 'No sessions found matching your search criteria.' : 'No sessions available yet. Start mentoring to see your sessions here!'}
			</div>
		{/if}
	</div>

	<!-- Status Dialog -->
	{#if showStatusDialog}
		<Dialog.Root open={showStatusDialog} onOpenChange={(open) => showStatusDialog = open}>
			<Dialog.Content class="max-w-2xl w-full">
				<Dialog.Header>
					<Dialog.Title>Session Status Overview</Dialog.Title>
					<Dialog.Description>
						Detailed breakdown of your session statuses
					</Dialog.Description>
				</Dialog.Header>
				<div class="space-y-6">
					<!-- Status Statistics -->
					<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div class="bg-green-50 border border-green-200 rounded-lg p-4">
							<div class="flex items-center justify-between">
								<div>
									<h3 class="text-lg font-semibold text-green-800">Ongoing</h3>
									<p class="text-2xl font-bold text-green-600">{statusStats.ongoing}</p>
								</div>
								<span class="text-3xl">🟢</span>
							</div>
							<p class="text-sm text-green-700 mt-2">Currently active sessions</p>
						</div>
						<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
							<div class="flex items-center justify-between">
								<div>
									<h3 class="text-lg font-semibold text-yellow-800">Upcoming</h3>
									<p class="text-2xl font-bold text-yellow-600">{statusStats.upcoming}</p>
								</div>
								<span class="text-3xl">🟡</span>
							</div>
							<p class="text-sm text-yellow-700 mt-2">Scheduled future sessions</p>
						</div>
						<div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
							<div class="flex items-center justify-between">
								<div>
									<h3 class="text-lg font-semibold text-gray-800">Completed</h3>
									<p class="text-2xl font-bold text-gray-600">{statusStats.completed}</p>
								</div>
								<span class="text-3xl">⚫</span>
							</div>
							<p class="text-sm text-gray-700 mt-2">Finished sessions</p>
						</div>
					</div>

					<!-- Detailed Status Lists -->
					<div class="space-y-4">
						<!-- Ongoing Sessions -->
						{#if sessions.filter(s => s.status === 'ongoing').length > 0}
							<div>
								<h4 class="text-lg font-semibold text-green-800 mb-3 flex items-center">
									<span class="mr-2">🟢</span> Ongoing Sessions
								</h4>
								<div class="space-y-2">
									{#each sessions.filter(s => s.status === 'ongoing') as session}
										<div class="bg-green-50 border border-green-200 rounded-lg p-3">
											<div class="flex justify-between items-start">
												<div class="flex-1">
													<h5 class="font-medium text-green-900">{session.title}</h5>
													<p class="text-sm text-green-700">Student: {session.student}</p>
													<p class="text-sm text-green-700">Subject: {session.subject}</p>
												</div>
												<div class="text-right">
													<p class="text-sm text-green-700">{session.duration} min</p>
													<p class="text-sm text-green-700">{new Date(session.date).toLocaleDateString()}</p>
												</div>
											</div>
										</div>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Upcoming Sessions -->
						{#if sessions.filter(s => s.status === 'upcoming').length > 0}
							<div>
								<h4 class="text-lg font-semibold text-yellow-800 mb-3 flex items-center">
									<span class="mr-2">🟡</span> Upcoming Sessions
								</h4>
								<div class="space-y-2">
									{#each sessions.filter(s => s.status === 'upcoming') as session}
										<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
											<div class="flex justify-between items-start">
												<div class="flex-1">
													<h5 class="font-medium text-yellow-900">{session.title}</h5>
													<p class="text-sm text-yellow-700">Student: {session.student}</p>
													<p class="text-sm text-yellow-700">Subject: {session.subject}</p>
												</div>
												<div class="text-right">
													<p class="text-sm text-yellow-700">{session.duration} min</p>
													<p class="text-sm text-yellow-700">{new Date(session.date).toLocaleDateString()}</p>
												</div>
											</div>
										</div>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Completed Sessions -->
						{#if sessions.filter(s => s.status === 'completed').length > 0}
							<div>
								<h4 class="text-lg font-semibold text-gray-800 mb-3 flex items-center">
									<span class="mr-2">⚫</span> Completed Sessions
								</h4>
								<div class="space-y-2">
									{#each sessions.filter(s => s.status === 'completed') as session}
										<div class="bg-gray-50 border border-gray-200 rounded-lg p-3">
											<div class="flex justify-between items-start">
												<div class="flex-1">
													<h5 class="font-medium text-gray-900">{session.title}</h5>
													<p class="text-sm text-gray-700">Student: {session.student}</p>
													<p class="text-sm text-gray-700">Subject: {session.subject}</p>
												</div>
												<div class="text-right">
													<p class="text-sm text-gray-700">{session.duration} min</p>
													<p class="text-sm text-gray-700">{new Date(session.date).toLocaleDateString()}</p>
												</div>
											</div>
										</div>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				</div>
				<div class="flex justify-end mt-6">
					<Dialog.Close>
						<Button variant="outline">Close</Button>
					</Dialog.Close>
				</div>
			</Dialog.Content>
		</Dialog.Root>
	{/if}

	<!-- Session Details Dialog -->
	{#if showSessionDialog && selectedSession}
		<Dialog.Root open={showSessionDialog} onOpenChange={(open) => showSessionDialog = open}>
			<Dialog.Content class="max-w-2xl w-full">
				<Dialog.Header>
					<Dialog.Title>Session Details</Dialog.Title>
					<Dialog.Description>
						Complete information about this session
					</Dialog.Description>
				</Dialog.Header>
				<div class="space-y-4">
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<span class="text-sm font-medium text-gray-700">Session Title:</span>
							<p class="text-sm text-gray-900 mt-1">{selectedSession.title}</p>
						</div>
						<div>
							<span class="text-sm font-medium text-gray-700">Student:</span>
							<p class="text-sm text-gray-900 mt-1">{selectedSession.student}</p>
						</div>
						<div>
							<span class="text-sm font-medium text-gray-700">Subject:</span>
							<p class="text-sm text-gray-900 mt-1">{selectedSession.subject}</p>
						</div>
						<div>
							<span class="text-sm font-medium text-gray-700">Duration:</span>
							<p class="text-sm text-gray-900 mt-1">{selectedSession.duration} minutes</p>
						</div>
						<div>
							<span class="text-sm font-medium text-gray-700">Date:</span>
							<p class="text-sm text-gray-900 mt-1">{new Date(selectedSession.date).toLocaleDateString()}</p>
						</div>
						<div>
							<span class="text-sm font-medium text-gray-700">Time:</span>
							<p class="text-sm text-gray-900 mt-1">{new Date(selectedSession.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
						</div>
					</div>
					<div>
						<span class="text-sm font-medium text-gray-700">Status:</span>
						<div class="mt-1">
							<span class="px-3 py-1 text-sm rounded-full {
								selectedSession.status === 'ongoing' ? 'bg-green-100 text-green-800' :
								selectedSession.status === 'upcoming' ? 'bg-yellow-100 text-yellow-800' :
								'bg-gray-100 text-gray-800'
							}">
								{selectedSession.status.charAt(0).toUpperCase() + selectedSession.status.slice(1)}
							</span>
						</div>
					</div>
					<div>
						<span class="text-sm font-medium text-gray-700">Session ID:</span>
						<p class="text-sm text-gray-900 mt-1">{selectedSession.id}</p>
					</div>
				</div>
				<div class="flex justify-end mt-6">
					<Dialog.Close>
						<Button variant="outline">Close</Button>
					</Dialog.Close>
				</div>
			</Dialog.Content>
		</Dialog.Root>
	{/if}

	<!-- Mentor Application Dialog -->
	{#if showMentorDialog}
		<Dialog.Root open={showMentorDialog} onOpenChange={(open) => showMentorDialog = open}>
			<Dialog.Content class="max-w-3xl w-full">
				<Dialog.Header>
					<Dialog.Title>Join as Mentor</Dialog.Title>
					<Dialog.Description>
						Share your expertise and help students grow. Fill out the form below to apply for mentor status.
					</Dialog.Description>
				</Dialog.Header>
				
				<form onsubmit={(e) => { e.preventDefault(); submitMentorApplication(); }} class="space-y-6">
					<div>
						<label for="areasOfExpertise" class="block text-sm font-medium text-gray-700 mb-2">Areas of Expertise *</label>
						<Input 
							id="areasOfExpertise" 
							bind:value={mentorApplication.areasOfExpertise}
							placeholder="e.g., Data Structures, Algorithms, Web Development (comma-separated)"
							required
						/>
						<p class="text-sm text-gray-500 mt-1">Separate multiple areas with commas</p>
					</div>

					<div>
						<label for="bio" class="block text-sm font-medium text-gray-700 mb-2">Bio/Introduction *</label>
						<textarea 
							id="bio" 
							bind:value={mentorApplication.bio}
							class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
							rows="3"
							placeholder="Introduce yourself and describe what you can help with..."
							required
						></textarea>
					</div>

					<div>
						<label for="availability" class="block text-sm font-medium text-gray-700 mb-2">Availability *</label>
						<Input 
							id="availability" 
							bind:value={mentorApplication.availability}
							placeholder="e.g., Weekdays 6-8 PM, Weekends 10 AM-2 PM"
							required
						/>
					</div>

					<div>
						<label for="teachingMode" class="block text-sm font-medium text-gray-700 mb-2">Teaching Mode *</label>
						<select 
							id="teachingMode"
							bind:value={mentorApplication.teachingMode}
							class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
							required
						>
							<option value="both">Both Online & In-person</option>
							<option value="online">Online Only</option>
							<option value="in-person">In-person Only</option>
						</select>
					</div>

					<div class="flex justify-end space-x-2 pt-4">
						<Dialog.Close>
							<Button variant="outline">Cancel</Button>
						</Dialog.Close>
						<Button 
							type="submit" 
							disabled={isSubmitting}
							class="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300"
						>
							{isSubmitting ? 'Submitting...' : 'Submit Application'}
						</Button>
					</div>
				</form>
			</Dialog.Content>
		</Dialog.Root>
	{/if}

	<!-- Success Message -->
	{#if applicationSubmitted}
		<Dialog.Root open={applicationSubmitted} onOpenChange={(open) => applicationSubmitted = open}>
			<Dialog.Content class="max-w-2xl w-full">
				<Dialog.Header>
					<Dialog.Title>Welcome as a Mentor! 🎉</Dialog.Title>
					<Dialog.Description>
						You are now a mentor on our platform. Your profile has been updated with your mentor information.
					</Dialog.Description>
				</Dialog.Header>
				<div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
					<p class="text-green-700 text-sm">
						You can now access all mentor features and start helping other students. Your profile will be visible in the mentor directory.
					</p>
				</div>
				<div class="flex justify-end">
					<Dialog.Close>
						<Button>Start Mentoring</Button>
					</Dialog.Close>
				</div>
			</Dialog.Content>
		</Dialog.Root>
	{/if}

	<!-- Offer Details Dialog -->
	{#if showOfferDialog && selectedOffer}
		<Dialog.Root open={showOfferDialog} onOpenChange={(open) => showOfferDialog = open}>
			<Dialog.Content class="max-w-2xl w-full max-h-[80vh] overflow-y-auto">
				<Dialog.Header>
					<Dialog.Title>Offer Details</Dialog.Title>
					<Dialog.Description>
						View details of your sent offer and its current status.
					</Dialog.Description>
				</Dialog.Header>
				
				<div class="space-y-4">
					<!-- Request Information -->
					<div class="bg-gray-50 rounded-lg p-4">
						<h3 class="text-lg font-semibold text-gray-900 mb-3">Request Information</h3>
						<div class="space-y-3">
							<div>
								<span class="text-sm font-medium text-gray-700">Title:</span>
								<p class="text-sm text-gray-900 mt-1">{selectedOffer.request?.title || 'Request Title'}</p>
							</div>
							<div>
								<span class="text-sm font-medium text-gray-700">Course:</span>
								<p class="text-sm text-gray-900 mt-1">{selectedOffer.request?.course_code || 'Course Code'}</p>
							</div>
							<div>
								<span class="text-sm font-medium text-gray-700">Mentee:</span>
								<p class="text-sm text-gray-900 mt-1">{selectedOffer.request?.mentee?.name || 'Anonymous'}</p>
							</div>
							<div>
								<span class="text-sm font-medium text-gray-700">Request Budget:</span>
								<p class="text-sm text-gray-900 mt-1">Tk {selectedOffer.request?.budget || 'Not specified'}</p>
							</div>
							<div>
								<span class="text-sm font-medium text-gray-700">Description:</span>
								<p class="text-sm text-gray-900 mt-1">{selectedOffer.request?.description || 'No description provided'}</p>
							</div>
						</div>
					</div>

					<!-- Offer Information -->
					<div class="bg-blue-50 rounded-lg p-4">
						<h3 class="text-lg font-semibold text-gray-900 mb-3">Your Offer</h3>
						<div class="space-y-3">
							<div>
								<span class="text-sm font-medium text-gray-700">Offered Amount:</span>
								<p class="text-lg font-bold text-green-600 mt-1">Tk {selectedOffer.proposed_fee || 'Not specified'}</p>
							</div>
							<div>
								<span class="text-sm font-medium text-gray-700">Status:</span>
								<div class="mt-1">
									<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
										{selectedOffer.status === 'Accepted' ? 'bg-green-100 text-green-800' : 
										 selectedOffer.status === 'Declined' ? 'bg-red-100 text-red-800' : 
										 selectedOffer.status === 'Withdrawn' ? 'bg-gray-100 text-gray-800' : 
										 'bg-yellow-100 text-yellow-800'}">
										{selectedOffer.status}
									</span>
								</div>
							</div>
							{#if selectedOffer.proposed_time}
								<div>
									<span class="text-sm font-medium text-gray-700">Offered Time:</span>
									<p class="text-sm text-gray-900 mt-1">{utcToBD(selectedOffer.proposed_time)}</p>
								</div>
							{/if}
							<div>
								<span class="text-sm font-medium text-gray-700">Sent:</span>
								<p class="text-sm text-gray-900 mt-1">{utcToBD(selectedOffer.created_at)}</p>
							</div>
							<div>
								<span class="text-sm font-medium text-gray-700">Message:</span>
								<p class="text-sm text-gray-900 mt-1">{selectedOffer.message || 'No message provided'}</p>
							</div>
						</div>
					</div>

					<!-- Actions -->
					{#if selectedOffer.status === 'Pending'}
						<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
							<p class="text-yellow-800 text-sm">
								This offer is pending review by the mentee. You can withdraw it if needed.
							</p>
							<div class="mt-3">
								<Button 
									variant="outline" 
									onclick={async () => {
										try {
											if (!$user?.id) {
												toast.show('User not authenticated', 'error');
												return;
											}
											await HelpOfferController.withdrawHelpOffer(selectedOffer.offer_id, $user.id);
											toast.show('Offer withdrawn successfully', 'success');
											await loadMentorOffers();
											showOfferDialog = false;
										} catch (error) {
											console.error('Error withdrawing offer:', error);
											toast.show('Failed to withdraw offer', 'error');
										}
									}}
									class="text-red-600 border-red-300 hover:bg-red-50"
								>
									Withdraw Offer
								</Button>
							</div>
						</div>
					{:else if selectedOffer.status === 'Accepted'}
						<div class="bg-green-50 border border-green-200 rounded-lg p-4">
							<p class="text-green-800 text-sm">
								🎉 Great! This offer has been accepted. You can now proceed with the mentoring session.
							</p>
						</div>
					{:else if selectedOffer.status === 'Declined'}
						<div class="bg-red-50 border border-red-200 rounded-lg p-4">
							<p class="text-red-800 text-sm">
								This offer was declined by the mentee. You can make a new offer if the request is still open.
							</p>
						</div>
					{/if}
				</div>
				
				<div class="flex justify-end mt-6">
					<Dialog.Close>
						<Button variant="outline">Close</Button>
					</Dialog.Close>
				</div>
			</Dialog.Content>
		</Dialog.Root>
	{/if}
</div>
{/if}