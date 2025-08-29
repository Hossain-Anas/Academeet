<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { isMentorMode } from '$lib/stores/roleToggle.js';

	// Form data for posting new request
	let formData = {
		title: '',
		course_code: '',
		description: '',
		preferred_time: '',
		budget: ''
	};

	// Search and filter
	let searchQuery = '';
	let sortBy = 'newest';

	// Sample request data (replace with real data later)
	let requests = [
		{
			id: '1',
			title: 'Help with Data Structures Assignment',
			course_code: 'CSE201',
			description: 'I need help understanding binary trees and implementing them in Java. The assignment is due next week.',
			preferred_time: '2024-01-15T14:00',
			budget: 25.00,
			status: 'Open',
			created_at: '2024-01-10T10:30:00',
			mentee_name: 'Alice Johnson',
			department: 'Computer Science'
		},
		{
			id: '2',
			title: 'Calculus II Integration Problems',
			course_code: 'MATH202',
			description: 'Struggling with integration by parts and trigonometric substitution. Need step-by-step explanations.',
			preferred_time: '2024-01-16T16:00',
			budget: 30.00,
			status: 'Open',
			created_at: '2024-01-11T09:15:00',
			mentee_name: 'Bob Smith',
			department: 'Mathematics'
		},
		{
			id: '3',
			title: 'Web Development Project Review',
			course_code: 'CSE301',
			description: 'Need someone to review my React project and provide feedback on code structure and best practices.',
			preferred_time: '2024-01-17T13:00',
			budget: 40.00,
			status: 'Open',
			created_at: '2024-01-12T14:20:00',
			mentee_name: 'Carol Davis',
			department: 'Computer Science'
		}
	];

	// Filtered requests based on search
	$: filteredRequests = requests.filter(request => {
		const query = searchQuery.toLowerCase();
		return (
			request.title.toLowerCase().includes(query) ||
			request.course_code.toLowerCase().includes(query) ||
			request.description.toLowerCase().includes(query) ||
			request.mentee_name.toLowerCase().includes(query) ||
			request.department.toLowerCase().includes(query)
		);
	});

	// Sort requests
	$: sortedRequests = [...filteredRequests].sort((a, b) => {
		switch (sortBy) {
			case 'newest':
				return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
			case 'oldest':
				return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
			case 'budget_high':
				return b.budget - a.budget;
			case 'budget_low':
				return a.budget - b.budget;
			default:
				return 0;
		}
	});

	function handleSubmit() {
		// TODO: Submit to backend
		console.log('Submitting request:', formData);
		// Reset form
		formData = {
			title: '',
			course_code: '',
			description: '',
			preferred_time: '',
			budget: ''
		};
	}

	function clearSearch() {
		searchQuery = '';
	}
</script>

<div class="container mx-auto px-4 py-8 max-w-6xl">
	<h1 class="text-3xl font-bold text-gray-900 mb-8">Request Page</h1>

		<!-- Post A New Request Section -->
	{#if !$isMentorMode}
		<div class="bg-white rounded-lg shadow-md p-6 mb-8">
			<h2 class="text-xl font-semibold text-gray-900 mb-4">Post A New Request</h2>
			
			<form on:submit|preventDefault={handleSubmit} class="space-y-4">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<Label for="title" class="text-sm font-medium text-gray-700">Request Title *</Label>
						<Input
							id="title"
							bind:value={formData.title}
							placeholder="e.g., Help with Data Structures Assignment"
							required
							class="mt-1"
						/>
					</div>
					
					<div>
						<Label for="course_code" class="text-sm font-medium text-gray-700">Course Code</Label>
						<Input
							id="course_code"
							bind:value={formData.course_code}
							placeholder="e.g., CSE201"
							class="mt-1"
						/>
					</div>
				</div>

				<div>
					<Label for="description" class="text-sm font-medium text-gray-700">Description *</Label>
					<textarea
						id="description"
						bind:value={formData.description}
						placeholder="Describe what help you need..."
						required
						rows="4"
						class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
					></textarea>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<Label for="preferred_time" class="text-sm font-medium text-gray-700">Preferred Time</Label>
						<Input
							id="preferred_time"
							type="datetime-local"
							bind:value={formData.preferred_time}
							class="mt-1"
						/>
					</div>
					
					<div>
						<Label for="budget" class="text-sm font-medium text-gray-700">Budget (Tk)</Label>
						<Input
							id="budget"
							type="number"
							bind:value={formData.budget}
							placeholder="0.00"
							min="0"
							step="0.01"
							class="mt-1"
						/>
					</div>
				</div>

				<div class="flex justify-end">
					<button
						type="submit"
						class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
					>
						Post Request
					</button>
				</div>
			</form>
		</div>
	{:else}
		<div class="bg-white rounded-lg shadow-md p-6 mb-8">
			<h2 class="text-xl font-semibold text-gray-900 mb-4">Post A New Request</h2>
			<div class="text-center py-8 text-gray-500">
				<p>Mentors cannot post requests. Switch to mentee mode to post a new request.</p>
			</div>
		</div>
	{/if}

	<!-- Sort by + Search Bar Section -->
	<div class="bg-white rounded-lg shadow-md p-4 mb-6">
		<div class="flex flex-col sm:flex-row gap-4 items-center justify-between">
			<div class="flex items-center space-x-4">
				<Label for="sort" class="text-sm font-medium text-gray-700">Sort by:</Label>
				<select
					id="sort"
					bind:value={sortBy}
					class="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
				>
					<option value="newest">Newest First</option>
					<option value="oldest">Oldest First</option>
					<option value="budget_high">Budget (High to Low)</option>
					<option value="budget_low">Budget (Low to High)</option>
				</select>
			</div>

			<div class="flex items-center space-x-2 w-full sm:w-auto">
				<Input
					bind:value={searchQuery}
					placeholder="Search requests..."
					class="flex-1 sm:w-64"
				/>
				<button
					on:click={clearSearch}
					class="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
				>
					Clear
				</button>
			</div>
		</div>
	</div>

	<!-- List of Posted Requests Section -->
	<div class="bg-white rounded-lg shadow-md p-6">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">List of Posted Requests by Other Users</h2>
		
		{#if sortedRequests.length === 0}
			<div class="text-center py-8 text-gray-500">
				<p>No requests found matching your search.</p>
			</div>
		{:else}
			<div class="grid gap-4">
				{#each sortedRequests as request}
					<div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
						<div class="flex justify-between items-start mb-3">
							<div class="flex-1">
								<h3 class="text-lg font-semibold text-gray-900 mb-1">{request.title}</h3>
								<div class="flex items-center space-x-4 text-sm text-gray-600 mb-2">
									<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
										{request.course_code}
									</span>
									<span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
										{request.status}
									</span>
									<span>Posted by {request.mentee_name}</span>
									<span>{request.department}</span>
								</div>
							</div>
							<div class="text-right">
								<div class="text-lg font-bold text-green-600">Tk {request.budget}</div>
								<div class="text-xs text-gray-500">
									{new Date(request.created_at).toLocaleDateString()}
								</div>
							</div>
						</div>
						
						<p class="text-gray-700 mb-3 line-clamp-2">{request.description}</p>
						
						<div class="flex items-center justify-between text-sm text-gray-600">
							<div>
								<span class="font-medium">Preferred Time:</span>
								{new Date(request.preferred_time).toLocaleString()}
							</div>
							
							{#if !$isMentorMode}
								<button
									class="px-4 py-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed"
									disabled
								>
									Book Session
								</button>
							{:else}
								<Dialog.Root>
									<Dialog.Trigger>
										<button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
											Make Offer
										</button>
									</Dialog.Trigger>
									<Dialog.Content>
										<Dialog.Header>
											<Dialog.Title>Make an Offer</Dialog.Title>
											<Dialog.Description>
												Submit your offer for this request.
											</Dialog.Description>
										</Dialog.Header>
										<div class="space-y-4">
											<div>
												<Label for="offer_message" class="text-sm font-medium">Message</Label>
												<textarea
													id="offer_message"
													rows="3"
													placeholder="Describe how you can help..."
													class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
												></textarea>
											</div>
											<div class="grid grid-cols-2 gap-4">
												<div>
													<Label for="proposed_time" class="text-sm font-medium">Proposed Time</Label>
													<Input
														id="proposed_time"
														type="datetime-local"
														class="mt-1"
													/>
												</div>
												<div>
													<Label for="proposed_fee" class="text-sm font-medium">Proposed Fee (Tk)</Label>
													<Input
														id="proposed_fee"
														type="number"
														placeholder="0.00"
														min="0"
														step="0.01"
														class="mt-1"
													/>
												</div>
											</div>
										</div>
										<div class="flex justify-end space-x-2 mt-6">
											<Dialog.Close>
												<button class="px-4 py-2 text-gray-600 hover:text-gray-800">
													Cancel
												</button>
											</Dialog.Close>
											<button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
												Submit Offer
											</button>
										</div>
									</Dialog.Content>
								</Dialog.Root>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
