<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';

	// Sample mentee profile data
	let menteeProfile = {
		name: 'Alex Chen',
		email: 'alex.chen@student.edu',
		department: 'Computer Science',
		interests: ['Web Development', 'Data Science', 'Mobile Apps', 'UI/UX Design'],
		bio: 'Passionate computer science student in my third year. Looking to improve my programming skills and learn from experienced mentors.',
		rating: 4.2,
		totalSessions: 23,
		profilePicture: '/api/placeholder/150/150'
	};

	// Sample sessions data for mentee (learning sessions)
	let sessions = [
		{
			id: '1',
			title: 'Data Structures Session',
			mentor: 'Dr. Sarah Johnson',
			date: '2024-01-15T14:00',
			status: 'ongoing',
			duration: 60,
			subject: 'Data Structures'
		},
		{
			id: '2',
			title: 'Web Development Review',
			mentor: 'Prof. Mike Davis',
			date: '2024-01-17T10:00',
			status: 'upcoming',
			duration: 45,
			subject: 'Web Development'
		},
		{
			id: '3',
			title: 'Algorithm Analysis',
			mentor: 'Dr. Sarah Johnson',
			date: '2024-01-10T16:00',
			status: 'completed',
			duration: 90,
			subject: 'Algorithms'
		},
		{
			id: '4',
			title: 'Machine Learning Basics',
			mentor: 'Prof. Emily Wilson',
			date: '2024-01-08T13:00',
			status: 'completed',
			duration: 75,
			subject: 'Machine Learning'
		}
	];

	let searchQuery = '';
	let sortBy = 'date';
	let statusSortOrder = 0; // 0: ongoing first, 1: upcoming first, 2: completed first
	let editProfileData = { ...menteeProfile };
	let newInterest = '';
	let showStatusDialog = false;
	let selectedSession: any = null;
	let showSessionDialog = false;

	// Removed handleAcademeetClick function - using proper Svelte link instead

	function handleEditProfile() {
		editProfileData = { ...menteeProfile };
	}

	function handleSaveProfile() {
		menteeProfile = { ...editProfileData };
		// Here you would typically save to backend
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

		<!-- Sign Out Link -->
		<a
			href="/auth/signout"
			class="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
		>
			Sign Out
		</a>
	</div>
</nav>

<div class="container mx-auto px-4 py-8 max-w-6xl">
	<h1 class="text-3xl font-bold text-gray-900 mb-8">Mentee Profile Page</h1>

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
								<Input id="department" bind:value={editProfileData.department} />
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
								<label class="block text-sm font-medium text-gray-700 mb-1">Learning Interests</label>
								<div class="space-y-3">
									<div class="flex gap-2">
										<input 
											type="text"
											placeholder="Add new interest..." 
											bind:value={newInterest}
											on:keydown={(e) => e.key === 'Enter' && addInterest()}
											class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										/>
										<button 
											class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
											on:click={addInterest}
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
													on:click={() => removeInterest(index)}
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
								<button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700" on:click={handleSaveProfile}>Save Changes</button>
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
					on:click={handleStatusSort}
				>
					Sort by Status ({statusSortOrder === 0 ? 'Ongoing' : statusSortOrder === 1 ? 'Upcoming' : 'Completed'} first)
				</button>
				<button class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50" on:click={() => searchQuery = ''}>Clear</button>
			</div>
		</div>
	</div>

	<!-- Sessions Table -->
	<div class="bg-white rounded-lg shadow-md p-6">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">List of learning sessions (with status)</h2>
		
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
						<tr class="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" on:click={() => showSessionDetails(session)}>
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
	</div>

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
