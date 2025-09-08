<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { profile, userLoading, userError } from '$lib/stores/user';
	import { auth, user } from '$lib/stores/auth';
	import { supabase } from '$lib/supabaseClient.js';
	import { onMount } from 'svelte';
	import { HelpRequestController } from '$lib/controllers/helpRequestController';
	import { HelpOfferController } from '$lib/controllers/helpOfferController';
	import { BookingController } from '$lib/controllers/bookingController';
	import { toast } from '$lib/stores/toast';

	// Basic mentee profile data - will be populated from userStore
	let menteeProfile = {
		name: 'User',
		email: 'user@example.com',
		department: '',
		interests: [] as string[],
		bio: '',
		rating: 0,
		totalSessions: 0,
		profilePicture: ''
	};
	
	// Track if component is mounted to prevent hydration mismatch
	let isMounted = false;

	// Sessions data from Supabase (will be loaded dynamically)
	let sessions: any[] = [];
	let isLoadingSessions = false;

	// Mentee's posted requests with offers
	let menteeRequests: any[] = [];
	let isLoadingRequests = false;
	let selectedRequest: any = null;
	let showRequestDialog = false;

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

	// Load mentee's requests with offers
	async function loadMenteeRequests() {
		if (!$user?.id) return;
		
		try {
			isLoadingRequests = true;
			const requests = await HelpRequestController.getHelpRequestsByMentee($user.id);
			
			// Load offers for each request
			menteeRequests = await Promise.all(requests.map(async (request) => {
				const offers = await HelpOfferController.getHelpOffersByRequest(request.request_id!);
				return {
					...request,
					offers: offers
				};
			}));
		} catch (error) {
			console.error('Error loading mentee requests:', error);
			toast.show('Failed to load requests', 'error');
		} finally {
			isLoadingRequests = false;
		}
	}

	// Load mentee's sessions (bookings) from Supabase
	async function loadMenteeSessions() {
		if (!$user?.id) return;
		
		try {
			isLoadingSessions = true;
			const bookings = await BookingController.getBookingsByMentee($user.id);
			
			// Transform bookings to session format for UI compatibility
			sessions = bookings.map(booking => ({
				id: booking.booking_id,
				title: (booking as any).request?.title || 'Direct Session',
				mentor: (booking as any).mentor?.name || 'Unknown Mentor',
				date: booking.session_time,
				status: mapBookingStatusToSessionStatus(booking.status || 'Scheduled'),
				duration: booking.duration_minutes,
				subject: (booking as any).request?.course_code || 'General'
			}));
		} catch (error) {
			console.error('Error loading mentee sessions:', error);
			toast.show('Failed to load sessions', 'error');
		} finally {
			isLoadingSessions = false;
		}
	}

	// Map booking status to session status for UI compatibility
	function mapBookingStatusToSessionStatus(bookingStatus: string): string {
		switch (bookingStatus) {
			case 'Scheduled':
				return 'upcoming';
			case 'Completed':
				return 'completed';
			case 'Cancelled':
			case 'No-show':
				return 'completed'; // Treat cancelled/no-show as completed for UI
			default:
				return 'upcoming';
		}
	}

	// Show loading until component is mounted
	$: showContent = isMounted;

	let searchQuery = '';
	let sortBy = 'date';
	let statusSortOrder = 0; // 0: ongoing first, 1: upcoming first, 2: completed first
	let editProfileData = { ...menteeProfile };
	let newInterest = '';
	let showStatusDialog = false;
	let selectedSession: any = null;
	let showSessionDialog = false;

	// Initialize profile data from userStore
	onMount(() => {
		console.log('Mentee profile page mounted');
		loadMenteeRequests();
		loadMenteeSessions();
		
		// Mark component as mounted
		isMounted = true;
		
		// Return cleanup function
		return () => {
			console.log('Mentee profile page unmounting');
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
			console.log('Mentee profile state changed:', {
				isMounted,
				profile: $profile,
				userLoading: $userLoading,
				user: $user
			});

			if (isMounted) {
				if ($profile) {
					console.log('Using profile data for mentee:', $profile);
					menteeProfile = {
						name: $profile.name || ($user?.user_metadata?.name || 'User'),
						email: $profile.email || ($user?.email || 'user@example.com'),
						department: $profile.department || '',
						interests: $profile.learning_interests || [],
						bio: $profile.interests?.join(', ') || '',
						rating: 0, // Will be calculated from reviews
						totalSessions: 0, // Will be calculated from bookings
						profilePicture: ''
					};
					editProfileData = { ...menteeProfile };
				} else if (!$userLoading && $user) {
					console.log('Using auth user data for mentee:', $user);
					menteeProfile = {
						name: $user.user_metadata?.name || 'User',
						email: $user.email || 'user@example.com',
						department: $user.user_metadata?.department || '',
						interests: $user.user_metadata?.skills || [],
						bio: $user.user_metadata?.interests?.join(', ') || '',
						rating: 0,
						totalSessions: 0,
						profilePicture: ''
					};
					editProfileData = { ...menteeProfile };
				} else if (!$userLoading) {
					console.log('No profile or user data available for mentee, using defaults');
					menteeProfile = {
						name: 'User',
						email: 'user@example.com',
						department: '',
						interests: [],
						bio: '',
						rating: 0,
						totalSessions: 0,
						profilePicture: ''
					};
					editProfileData = { ...menteeProfile };
				}
			}

			// Update previous state
			prevState = currentState;
		}
	}

	// Function to refresh profile data
	function refreshProfile() {
		// This would typically call userManager.getProfile again
		// For now, we'll just log that it was called
		console.log('Refreshing profile data...');
	}

	// Reactive statements for userStore state with fallbacks
	$: isLoading = $userLoading || false;
	$: error = $userError || null;
	
	// Debug: Log current user state and show success message
	$: if ($profile) {
		console.log('Current mentee user profile:', $profile);
		// Profile successfully loaded
	}
	
	// Fallback for when profile store is not ready
	$: if (!$profile && !isLoading && !error) {
		console.log('Mentee profile store not ready yet, using default values');
	}



	async function handleSaveProfile() {
		try {
			if (!$user) {
				throw new Error('User not authenticated');
			}

			// Update profile in Supabase
			const { error } = await supabase
				.from('users')
				.update({
					learning_interests: editProfileData.interests,
					interests: editProfileData.bio ? [editProfileData.bio] : []
				})
				.eq('user_id', $user.id);

			if (error) throw error;

			// Update local state
			menteeProfile = { ...editProfileData };
			
			console.log('Mentee profile updated:', menteeProfile);
		} catch (error) {
			console.error('Failed to save mentee profile:', error);
		}
	}

	function addInterest() {
		if (newInterest.trim() && !editProfileData.interests.includes(newInterest.trim())) {
			editProfileData.interests = [...editProfileData.interests, newInterest.trim()];
			newInterest = '';
		}
	}

	function removeInterest(index: number) {
		editProfileData.interests = editProfileData.interests.filter((_, i) => i !== index);
	}

	function handleStatusSort() {
		statusSortOrder = (statusSortOrder + 1) % 3; // Cycle through 0, 1, 2
		sortBy = 'status';
	}

	function showSessionDetails(session: any) {
		selectedSession = session;
		showSessionDialog = true;
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
			session.mentor.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
				case 'mentor':
					return a.mentor.localeCompare(b.mentor);
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
			<a href="/myspace/mentor-profile" class="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">
				Mentor Profile
			</a>
			<a href="/myspace/mentee-profile" class="px-3 py-2 text-sm font-medium text-blue-600 border-b-2 border-blue-600">
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
	<h1 class="text-3xl font-bold text-gray-900 mb-8">Mentee Profile Page</h1>

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
	{#if !isLoading && !error && !menteeProfile.department && menteeProfile.interests.length === 0 && !menteeProfile.bio}
		<div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
			<div class="flex items-center">
				<span class="text-blue-600 mr-2">💡</span>
				<p class="text-blue-800 text-sm">
					<strong>Welcome!</strong> Your basic info is set up. Click "Edit Profile" to add your interests and bio to complete your mentee profile.
				</p>
			</div>
		</div>
	{/if}

	<!-- Profile Section -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
		<!-- Profile Picture Card -->
		<div class="bg-white rounded-lg shadow-md p-6 flex flex-col items-center">
			<div class="w-32 h-32 rounded-full bg-gray-200 mb-4 flex items-center justify-center">
				<span class="text-4xl text-gray-500">👤</span>
			</div>
			<h2 class="text-xl font-semibold text-gray-900 mb-2">{menteeProfile.name}</h2>
			<p class="text-sm text-gray-600 mb-4">{menteeProfile.department}</p>
			<div class="flex items-center mb-2">
				<span class="text-yellow-500">★</span>
				<span class="text-sm text-gray-700 ml-1">{menteeProfile.rating}</span>
			</div>
			<p class="text-sm text-gray-600">{menteeProfile.totalSessions} sessions attended</p>
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
								Update your mentee profile information
							</Dialog.Description>
						</Dialog.Header>
						<div class="space-y-4">
							<div>
								<label for="name" class="block text-sm font-medium text-gray-700 mb-1">Name</label>
								<Input id="name" bind:value={editProfileData.name} />
							</div>
							<div>
								<label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
								<Input id="email" type="email" bind:value={editProfileData.email} />
							</div>
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
								></textarea>
							</div>
							<div>
								<label for="newInterest" class="block text-sm font-medium text-gray-700 mb-1">Learning Interests</label>
								<div class="space-y-3">
									<div class="flex gap-2">
										<input 
											id="newInterest"
											type="text"
											placeholder="Add new interest..." 
											bind:value={newInterest}
											onkeydown={(e) => e.key === 'Enter' && addInterest()}
											class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										/>
										<button 
											class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
											onclick={addInterest}
										>
											Add
										</button>
									</div>
									<div class="flex flex-wrap gap-2">
										{#each editProfileData.interests as interest, index}
											<div class="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
												<span>{interest}</span>
												<button 
													class="text-green-600 hover:text-green-800"
													onclick={() => removeInterest(index)}
												>
													×
												</button>
											</div>
										{/each}
									</div>
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
					<span class="text-sm font-medium text-gray-700">Email:</span>
					<p class="text-sm text-gray-900">{menteeProfile.email}</p>
				</div>
				<div>
					<span class="text-sm font-medium text-gray-700">Learning Interests:</span>
					<div class="flex flex-wrap gap-2 mt-1">
						{#each menteeProfile.interests as interest}
							<span class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">{interest}</span>
						{/each}
					</div>
				</div>
				<div>
					<span class="text-sm font-medium text-gray-700">Bio:</span>
					<p class="text-sm text-gray-900 mt-1">{menteeProfile.bio}</p>
				</div>
			</div>
		</div>
	</div>

	<!-- My Posted Requests Section -->
	<div class="bg-white rounded-lg shadow-md p-6 mb-8">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">My Posted Requests</h2>
		
		{#if isLoadingRequests}
			<div class="text-center py-8">
				<div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
				<p class="mt-2 text-gray-600">Loading requests...</p>
			</div>
		{:else if menteeRequests.length === 0}
			<div class="text-center py-8 text-gray-500">
				<p>You haven't posted any requests yet.</p>
				<a href="/requests" class="text-blue-600 hover:text-blue-800 underline">Post your first request</a>
			</div>
		{:else}
			<div class="max-h-96 overflow-y-auto space-y-3 pr-2">
				{#each menteeRequests as request}
					<div 
						class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
						role="button"
						tabindex="0"
						onclick={() => {
							selectedRequest = request;
							showRequestDialog = true;
						}}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								selectedRequest = request;
								showRequestDialog = true;
							}
						}}
					>
						<div class="flex justify-between items-start">
							<div class="flex-1">
								<h3 class="text-lg font-semibold text-gray-900 mb-1">{request.title}</h3>
								<div class="flex items-center space-x-4 text-sm text-gray-600 mb-2">
									<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
										{request.course_code}
									</span>
									<span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
										{request.status}
									</span>
									<span class="text-lg font-bold text-green-600">Tk {request.budget}</span>
								</div>
								<p class="text-gray-700 mb-2 line-clamp-2">{request.description}</p>
								<div class="text-sm text-gray-600">
									<span class="font-medium">Offers:</span> {request.offers?.length || 0}
									{#if request.preferred_time}
										<span class="ml-4 font-medium">Preferred Time:</span> {utcToBD(request.preferred_time)}
									{/if}
								</div>
							</div>
							<div class="text-right">
								<div class="text-xs text-gray-500">
									{utcToBD(request.created_at)}
								</div>
								{#if request.offers?.length > 0}
									<div class="mt-2">
										<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
											{request.offers.length} offer{request.offers.length > 1 ? 's' : ''}
										</span>
									</div>
								{/if}
								<div class="mt-2">
									<button 
										class="text-red-600 hover:text-red-800 text-xs px-2 py-1 rounded hover:bg-red-50 transition-colors"
										onclick={(e) => {
											e.stopPropagation();
											if (confirm('Are you sure you want to delete this request? This action cannot be undone and will also delete all associated offers.')) {
												(async () => {
													try {
														if (!$user?.id) {
															toast.show('User not authenticated', 'error');
															return;
														}
														await HelpRequestController.deleteHelpRequest(request.request_id, $user.id);
														toast.show('Request deleted successfully', 'success');
														loadMenteeRequests();
													} catch (error) {
														console.error('Error deleting request:', error);
														toast.show('Failed to delete request', 'error');
													}
												})();
											}
										}}
									>
										🗑️ Delete
									</button>
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
					placeholder="Search sessions by title, mentor, or subject..." 
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
					<option value="mentor">Sort by Mentor</option>
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
		<h2 class="text-xl font-semibold text-gray-900 mb-4">List of learning sessions (with status)</h2>
		
		{#if isLoadingSessions}
			<div class="text-center py-8">
				<div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
				<p class="mt-2 text-gray-600">Loading sessions...</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead>
						<tr class="border-b border-gray-200">
							<th class="text-left py-3 px-4 font-medium text-gray-700">Session</th>
							<th class="text-left py-3 px-4 font-medium text-gray-700">Mentor</th>
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
								<td class="py-3 px-4 text-gray-700">{session.mentor}</td>
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
					No sessions found matching your search criteria.
				</div>
			{/if}
		{/if}
	</div>


	<!-- Request Details Dialog -->
	{#if showRequestDialog && selectedRequest}
		<Dialog.Root open={showRequestDialog} onOpenChange={(open) => showRequestDialog = open}>
			<Dialog.Content class="max-w-4xl w-full">
				<Dialog.Header>
					<Dialog.Title>Request Details: {selectedRequest.title}</Dialog.Title>
					<Dialog.Description>
						Manage offers and interactions for this request
					</Dialog.Description>
				</Dialog.Header>
				
				<div class="space-y-6">
					<!-- Request Info -->
					<div class="bg-gray-50 rounded-lg p-4">
						<h3 class="font-semibold text-gray-900 mb-2">Request Information</h3>
						<div class="grid grid-cols-2 gap-4 text-sm">
							<div>
								<span class="font-medium">Course:</span> {selectedRequest.course_code}
							</div>
							<div>
								<span class="font-medium">Budget:</span> Tk {selectedRequest.budget}
							</div>
							<div>
								<span class="font-medium">Status:</span> 
								<span class="ml-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
									{selectedRequest.status}
								</span>
							</div>
							<div>
								<span class="font-medium">Preferred Time:</span> 
								{selectedRequest.preferred_time ? utcToBD(selectedRequest.preferred_time) : 'Not specified'}
							</div>
						</div>
						<div class="mt-3">
							<span class="font-medium">Description:</span>
							<p class="text-gray-700 mt-1">{selectedRequest.description}</p>
						</div>
					</div>

					<!-- Offers Section -->
					<div>
						<h3 class="font-semibold text-gray-900 mb-3">Offers ({selectedRequest.offers?.length || 0})</h3>
						
						{#if selectedRequest.offers?.length === 0}
							<div class="text-center py-8 text-gray-500">
								<p>No offers yet. Your request is visible to all mentors.</p>
							</div>
						{:else}
							<div class="space-y-3">
								{#each selectedRequest.offers as offer}
									<div class="border border-gray-200 rounded-lg p-4">
										<div class="flex justify-between items-start mb-3">
											<div>
												<h4 class="font-medium text-gray-900">Offer from Mentor</h4>
												<p class="text-sm text-gray-600">Status: 
													<span class="ml-1 px-2 py-1 rounded-full text-xs {
														offer.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
														offer.status === 'Accepted' ? 'bg-green-100 text-green-800' :
														'bg-red-100 text-red-800'
													}">
														{offer.status}
													</span>
												</p>
											</div>
											<div class="text-right">
												{#if offer.proposed_fee}
													<div class="text-lg font-bold text-green-600">Tk {offer.proposed_fee}</div>
												{/if}
												{#if offer.proposed_time}
													<div class="text-sm text-gray-600">{utcToBD(offer.proposed_time)}</div>
												{/if}
											</div>
										</div>
										
										<p class="text-gray-700 mb-3">{offer.message}</p>
										
										{#if offer.status === 'Pending'}
											<div class="flex gap-2">
												<button 
													class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
													onclick={async () => {
														try {
															await HelpOfferController.acceptHelpOffer(offer.offer_id, $user?.id!);
															toast.show('Offer accepted successfully!', 'success');
															loadMenteeRequests();
															showRequestDialog = false;
														} catch (error) {
															toast.show('Failed to accept offer', 'error');
														}
													}}
												>
													Accept Offer
												</button>
												<button 
													class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
													onclick={async () => {
														try {
															await HelpOfferController.declineHelpOffer(offer.offer_id, $user?.id!);
															toast.show('Offer declined', 'success');
															loadMenteeRequests();
															showRequestDialog = false;
														} catch (error) {
															toast.show('Failed to decline offer', 'error');
														}
													}}
												>
													Decline Offer
												</button>
											</div>
										{/if}
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</div>
				
				<div class="flex justify-between mt-6">
					<!-- Delete Request Button -->
					<button 
						class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
						onclick={async () => {
							if (confirm('Are you sure you want to delete this request? This action cannot be undone and will also delete all associated offers.')) {
								try {
									if (!$user?.id) {
										toast.show('User not authenticated', 'error');
										return;
									}
									await HelpRequestController.deleteHelpRequest(selectedRequest.request_id, $user.id);
									toast.show('Request deleted successfully', 'success');
									loadMenteeRequests();
									showRequestDialog = false;
								} catch (error) {
									console.error('Error deleting request:', error);
									toast.show('Failed to delete request', 'error');
								}
							}
						}}
					>
						🗑️ Delete Request
					</button>
					
					<!-- Close Button -->
					<Dialog.Close>
						<Button variant="outline">Close</Button>
					</Dialog.Close>
				</div>
			</Dialog.Content>
		</Dialog.Root>
	{/if}

	<!-- Status Dialog -->
	{#if showStatusDialog}
		<Dialog.Root open={showStatusDialog} onOpenChange={(open) => showStatusDialog = open}>
			<Dialog.Content class="max-w-2xl w-full">
				<Dialog.Header>
					<Dialog.Title>Session Status Overview</Dialog.Title>
					<Dialog.Description>
						Detailed breakdown of your learning session statuses
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
							<p class="text-sm text-green-700 mt-2">Currently active learning sessions</p>
						</div>
						<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
							<div class="flex items-center justify-between">
								<div>
									<h3 class="text-lg font-semibold text-yellow-800">Upcoming</h3>
									<p class="text-2xl font-bold text-yellow-600">{statusStats.upcoming}</p>
								</div>
								<span class="text-3xl">🟡</span>
							</div>
							<p class="text-sm text-yellow-700 mt-2">Scheduled future learning sessions</p>
						</div>
						<div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
							<div class="flex items-center justify-between">
								<div>
									<h3 class="text-lg font-semibold text-gray-800">Completed</h3>
									<p class="text-2xl font-bold text-gray-600">{statusStats.completed}</p>
								</div>
								<span class="text-3xl">⚫</span>
							</div>
							<p class="text-sm text-gray-700 mt-2">Finished learning sessions</p>
						</div>
					</div>

					<!-- Detailed Status Lists -->
					<div class="space-y-4">
						<!-- Ongoing Sessions -->
						{#if sessions.filter(s => s.status === 'ongoing').length > 0}
							<div>
								<h4 class="text-lg font-semibold text-green-800 mb-3 flex items-center">
									<span class="mr-2">🟢</span> Ongoing Learning Sessions
								</h4>
								<div class="space-y-2">
									{#each sessions.filter(s => s.status === 'ongoing') as session}
										<div class="bg-green-50 border border-green-200 rounded-lg p-3">
											<div class="flex justify-between items-start">
												<div class="flex-1">
													<h5 class="font-medium text-green-900">{session.title}</h5>
													<p class="text-sm text-green-700">Mentor: {session.mentor}</p>
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
									<span class="mr-2">🟡</span> Upcoming Learning Sessions
								</h4>
								<div class="space-y-2">
									{#each sessions.filter(s => s.status === 'upcoming') as session}
										<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
											<div class="flex justify-between items-start">
												<div class="flex-1">
													<h5 class="font-medium text-yellow-900">{session.title}</h5>
													<p class="text-sm text-yellow-700">Mentor: {session.mentor}</p>
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
									<span class="mr-2">⚫</span> Completed Learning Sessions
								</h4>
								<div class="space-y-2">
									{#each sessions.filter(s => s.status === 'completed') as session}
										<div class="bg-gray-50 border border-gray-200 rounded-lg p-3">
											<div class="flex justify-between items-start">
												<div class="flex-1">
													<h5 class="font-medium text-gray-900">{session.title}</h5>
													<p class="text-sm text-gray-700">Mentor: {session.mentor}</p>
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
					<Dialog.Title>Learning Session Details</Dialog.Title>
					<Dialog.Description>
						Complete information about this learning session
					</Dialog.Description>
				</Dialog.Header>
				<div class="space-y-4">
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<span class="text-sm font-medium text-gray-700">Session Title:</span>
							<p class="text-sm text-gray-900 mt-1">{selectedSession.title}</p>
						</div>
						<div>
							<span class="text-sm font-medium text-gray-700">Mentor:</span>
							<p class="text-sm text-gray-900 mt-1">{selectedSession.mentor}</p>
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
</div>
{/if}
