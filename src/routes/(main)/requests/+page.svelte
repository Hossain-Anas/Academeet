<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { isMentorMode } from '$lib/stores/roleToggle.js';
	import { HelpRequestController } from '$lib/controllers/helpRequestController';
	import { toast } from '$lib/stores/toast';
	import { supabase } from '$lib/supabaseClient';
	import { user } from '$lib/stores/auth';

	// Form data for posting new request
	let formData = {
		title: '',
		course_code: '',
		description: '',
		preferred_time: '',
		budget: '',
		duration_minutes: '30' // Default to 30 minutes
	};

	// Loading states
	let isSubmitting = false;
	let isTimeSlotValid = true;

	// Get minimum date-time (now + 30 minutes to allow for processing)
	$: minDateTime = (() => {
		const now = new Date();
		now.setMinutes(now.getMinutes() + 30);
		return now.toISOString().slice(0, 16);
	})();

	// Get current user
	async function getCurrentUserId() {
		const { data: { user } } = await supabase.auth.getUser();
		return user?.id;
	}

	// Convert UTC to Bangladesh time (same as myspace page)
	function utcToBD(utcDateTime: string): string {
		if (!utcDateTime || utcDateTime === 'null' || utcDateTime === 'undefined') {
			return 'Not specified';
		}
		
		try {
			// Parse the UTC time - handle different formats from Supabase
			let date: Date;
			
			// Handle different Supabase date formats
			if (utcDateTime.includes('+00:00')) {
				// Format: "2025-09-06T13:15:46.603877+00:00" - already ISO format
				date = new Date(utcDateTime);
			} else if (utcDateTime.includes('+00')) {
				// Format: "2025-09-06 20:10:00+00" - convert to ISO format
				date = new Date(utcDateTime.replace(' ', 'T').replace('+00', 'Z'));
			} else {
				// Standard ISO format
				date = new Date(utcDateTime);
			}
			
			// Check if date is valid
			if (isNaN(date.getTime())) {
				console.warn('Invalid date:', utcDateTime);
				return 'Invalid date';
			}
			
			console.log('Parsing time:', utcDateTime, '->', date.toISOString());
			
			// Create a formatter for Bangladesh time
			const formatter = new Intl.DateTimeFormat('en-US', {
				timeZone: 'Asia/Dhaka',
				year: 'numeric',
				month: 'numeric',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
				hour12: true // Use 12-hour format with AM/PM
			});
			
			// Format the date and replace the timezone name with BDT
			return formatter.format(date)
				.replace(' AM', ' AM BDT')
				.replace(' PM', ' PM BDT');
		} catch (error) {
			console.error('Error formatting date:', utcDateTime, error);
			return 'Invalid date';
		}
	}

	// Search and filter
	let searchQuery = '';
	let sortBy = 'newest';

	import { onMount } from 'svelte';
	import { HelpOfferController } from '$lib/controllers/helpOfferController';

	// Request data state
	let requests: any[] = [];
	let isLoading = true;
	let error: string | null = null;

	// Offer form state
	let isSubmittingOffer = false;
	let dialogOpen = false;
	let offerData = {
		message: '',
		proposed_time: '',
		proposed_fee: ''
	};

	// Load help requests - bulletproof version
	async function loadHelpRequests() {
		console.log('Starting loadHelpRequests...');
		try {
			isLoading = true;
			error = null;
			
			console.log('Making Supabase query...');
			// Very simple query - just get help requests without joins
			const { data, error: supabaseError } = await supabase
				.from('help_requests')
				.select(`
					*,
					mentee:users!help_requests_mentee_id_fkey(
						name,
						department
					)
				`)
				.eq('status', 'Open')
				.order('created_at', { ascending: false });
			
			console.log('Supabase response:', { data, supabaseError });
			
			if (supabaseError) {
				console.error('Supabase error:', supabaseError);
				throw supabaseError;
			}
			
			// Map request data with mentee details
			requests = (data || []).map(request => ({
				...request,
				mentee_name: request.mentee?.name || 'Anonymous User',
				department: request.mentee?.department || 'Unknown'
			}));
			
			console.log('Final requests:', requests);
			
		} catch (err) {
			console.error('Error loading help requests:', err);
			error = err instanceof Error ? err.message : 'Failed to load help requests';
			toast.show(error, 'error');
			
			// Set empty array as fallback
			requests = [];
		} finally {
			isLoading = false;
			console.log('Finished loading, isLoading:', isLoading);
		}
	}

	onMount(() => {
		loadHelpRequests();
		
		// Safety timeout - if loading takes more than 10 seconds, stop loading
		setTimeout(() => {
			if (isLoading) {
				console.log('Loading timeout reached, forcing stop');
				isLoading = false;
				error = 'Loading timeout - please refresh the page';
				requests = [];
			}
		}, 10000);
	});

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

	// Check time slot whenever datetime or duration changes
	$: {
		if (formData.preferred_time && formData.duration_minutes) {
			isTimeSlotValid = false; // Set to false while checking
			checkExistingBookings(formData.preferred_time, parseInt(formData.duration_minutes)).then(result => {
				isTimeSlotValid = !result.hasConflict;
				if (result.hasConflict) {
					toast.show(result.error || 'Time slot not available', 'warning');
				}
			});
		} else {
			isTimeSlotValid = true; // Default to valid if no date/time selected
		}
	}

	// Helper function to check if two time ranges overlap
	function hasTimeOverlap(
		start1: Date, 
		end1: Date, 
		start2: Date, 
		end2: Date
	): boolean {
		return start1 < end2 && start2 < end1;
	}

	// Convert BD time to UTC for database storage
	function bdToUTC(bdDateTime: string | Date): Date {
		const bdDate = typeof bdDateTime === 'string' ? new Date(bdDateTime) : new Date(bdDateTime);
		
		// The input from datetime-local is treated as local time
		// We need to interpret it as BD time and convert to UTC
		const year = bdDate.getFullYear();
		const month = bdDate.getMonth();
		const day = bdDate.getDate();
		const hour = bdDate.getHours();
		const minute = bdDate.getMinutes();
		const second = bdDate.getSeconds();
		
		// Create UTC date by subtracting 6 hours (BD is UTC+6)
		return new Date(Date.UTC(year, month, day, hour - 6, minute, second));
	}

	async function checkExistingBookings(startTime: string, duration: number): Promise<{ hasConflict: boolean; error?: string }> {
		try {
			// Parse the selected time as BD time and convert to UTC for comparison
			const selectedStartUTC = bdToUTC(startTime);
			const now = new Date();
			
			if (selectedStartUTC <= now) {
				return { hasConflict: true, error: 'Cannot request sessions in the past' };
			}

			// Calculate the new session time range in UTC
			const newSessionStart = selectedStartUTC;
			const newSessionEnd = new Date(newSessionStart.getTime() + duration * 60000);

			// Check mentee's existing bookings
			const { data: menteeBookings, error: menteeError } = await supabase
				.from('bookings')
				.select('*, mentor:users!bookings_mentor_id_fkey (name)')
				.eq('mentee_id', $user?.id)
				.in('status', ['Pending', 'Confirmed']);

			if (menteeError) throw menteeError;

			// Check for overlaps with mentee's existing bookings
			if (menteeBookings && menteeBookings.length > 0) {
				for (const booking of menteeBookings) {
					const existingStart = new Date(booking.session_time);
					const existingEnd = new Date(existingStart.getTime() + booking.duration_minutes * 60000);
					
					if (hasTimeOverlap(newSessionStart, newSessionEnd, existingStart, existingEnd)) {
						const mentorName = booking.mentor?.name || 'a mentor';
						const sessionStatus = booking.status.toLowerCase();
						
						return { 
							hasConflict: true, 
							error: `You already have a ${sessionStatus} session with ${mentorName} from ${utcToBD(existingStart.toISOString())} to ${utcToBD(existingEnd.toISOString())}`
						};
					}
				}
			}

			return { hasConflict: false };
		} catch (error) {
			console.error('Error checking existing bookings:', error);
			return { hasConflict: false };
		}
	}

	async function handleSubmit() {
		try {
			isSubmitting = true;
			const userId = await getCurrentUserId();
			
			if (!userId) {
				toast.show('Please sign in to post a request', 'error');
				return;
			}

			// Convert budget to number if provided
			const budget = formData.budget ? parseFloat(formData.budget) : undefined;

			// Handle preferred_time - convert from local time to UTC for storage
			let preferredTimeUTC = undefined;
			if (formData.preferred_time) {
				// Check for time slot conflicts
				const conflictCheck = await checkExistingBookings(formData.preferred_time, parseInt(formData.duration_minutes));
				if (conflictCheck.hasConflict) {
					toast.show(conflictCheck.error || 'Time slot is not available', 'error');
					return;
				}

				// Convert to UTC for storage
				preferredTimeUTC = bdToUTC(formData.preferred_time).toISOString();
			}

			// Create help request
			await HelpRequestController.createHelpRequest({
				mentee_id: userId,
				title: formData.title,
				course_code: formData.course_code || undefined,
				description: formData.description,
				preferred_time: preferredTimeUTC,
				budget: budget,
				duration_minutes: parseInt(formData.duration_minutes)
			});

			// Show success message
			toast.show('Help request posted successfully!', 'success');

			// Reset form
			formData = {
				title: '',
				course_code: '',
				description: '',
				preferred_time: '',
				budget: '',
				duration_minutes: '30'
			};

			// Simple page reload to show updated data
			setTimeout(() => {
				window.location.reload();
			}, 1000);
		} catch (error: unknown) {
			console.error('Error posting help request:', error);
			const errorMessage = error instanceof Error ? error.message : 'Failed to post help request';
			toast.show(errorMessage, 'error');
		} finally {
			isSubmitting = false;
		}
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
							min={minDateTime}
							class="mt-1"
						/>
					</div>

					<div>
						<Label for="duration" class="text-sm font-medium text-gray-700">Session Duration</Label>
						<select 
							id="duration"
							bind:value={formData.duration_minutes}
							required
							class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
						>
							<option value="30">30 minutes</option>
							<option value="60">1 hour</option>
							<option value="90">1.5 hours</option>
							<option value="120">2 hours</option>
						</select>
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
						class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
						disabled={isSubmitting || !isTimeSlotValid}
					>
						{#if isSubmitting}
							Posting...
						{:else}
							Post Request
						{/if}
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
		
		{#if isLoading}
			<div class="text-center py-8">
				<div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
				<p class="mt-2 text-gray-600">Loading requests...</p>
			</div>
		{:else if error}
			<div class="text-center py-8 text-red-500">
				<p>{error}</p>
				<button 
					class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
					on:click={loadHelpRequests}
				>
					Try Again
				</button>
			</div>
		{:else if sortedRequests.length === 0}
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
									{request.created_at ? utcToBD(request.created_at) : 'Unknown'}
								</div>
							</div>
						</div>
						
						<p class="text-gray-700 mb-3 line-clamp-2">{request.description}</p>
						
						<div class="flex items-center justify-between text-sm text-gray-600">
							<div>
								<span class="font-medium">Preferred Time:</span>
								{request.preferred_time ? utcToBD(request.preferred_time) : 'Not specified'}
							</div>
							
							{#if !$isMentorMode}
								<button
									class="px-4 py-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed"
									disabled
								>
									Book Session
								</button>
							{:else}
								<Dialog.Root bind:open={dialogOpen}>
									<Dialog.Trigger>
										<button 
											class="px-4 py-2 {request.mentee_id === $user?.id ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'} rounded-lg transition-colors"
											disabled={request.mentee_id === $user?.id}
											title={request.mentee_id === $user?.id ? "You can't make an offer to your own request" : ""}
										>
											{request.mentee_id === $user?.id ? "Your Own Request" : "Make Offer"}
										</button>
									</Dialog.Trigger>
									<Dialog.Content>
										<Dialog.Header>
											<Dialog.Title>Make an Offer</Dialog.Title>
											<Dialog.Description>
												Submit your offer for this request.
											</Dialog.Description>
										</Dialog.Header>
										<form 
											on:submit|preventDefault={async () => {
												try {
													isSubmittingOffer = true;
													const userId = await getCurrentUserId();
													
													if (!userId) {
														toast.show('Please sign in to make an offer', 'error');
														return;
													}

													// Handle proposed_time - convert from local time to UTC for storage
													let proposedTimeUTC = undefined;
													if (offerData.proposed_time) {
														// datetime-local gives us local time, convert to UTC
														const localDate = new Date(offerData.proposed_time);
														proposedTimeUTC = localDate.toISOString();
														console.log('Offer original time:', offerData.proposed_time);
														console.log('Offer converted to UTC:', proposedTimeUTC);
													}

													await HelpOfferController.createHelpOffer({
														request_id: request.request_id,
														mentor_id: userId,
														message: offerData.message,
														proposed_time: proposedTimeUTC,
														proposed_fee: offerData.proposed_fee ? parseFloat(offerData.proposed_fee) : undefined
													});

													toast.show('Offer submitted successfully! The mentee will be notified.', 'success');
													offerData = { message: '', proposed_time: '', proposed_fee: '' };
													dialogOpen = false;
													
													// Reload page to show updated data
													window.location.reload();
												} catch (error) {
													console.error('Error submitting offer:', error);
													const errorMessage = error instanceof Error ? error.message : 'Failed to submit offer';
													toast.show(errorMessage, 'error');
												} finally {
													isSubmittingOffer = false;
												}
											}}
											class="space-y-4"
										>
											<div>
												<Label for="offer_message" class="text-sm font-medium">Message *</Label>
												<textarea
													id="offer_message"
													bind:value={offerData.message}
													rows="3"
													placeholder="Describe how you can help..."
													required
													class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
												></textarea>
											</div>
											<div class="grid grid-cols-2 gap-4">
												<div>
													<Label for="proposed_time" class="text-sm font-medium">Proposed Time</Label>
													<Input
														id="proposed_time"
														type="datetime-local"
														bind:value={offerData.proposed_time}
														class="mt-1"
													/>
												</div>
												<div>
													<Label for="proposed_fee" class="text-sm font-medium">Proposed Fee (Tk)</Label>
													<Input
														id="proposed_fee"
														type="number"
														bind:value={offerData.proposed_fee}
														placeholder="0.00"
														min="0"
														step="0.01"
														class="mt-1"
													/>
												</div>
											</div>
											<div class="flex justify-end space-x-2 mt-6">
												<Dialog.Close>
													<button 
														type="button"
														class="px-4 py-2 text-gray-600 hover:text-gray-800"
														disabled={isSubmittingOffer}
													>
														Cancel
													</button>
												</Dialog.Close>
												<button 
													type="submit"
													class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
													disabled={isSubmittingOffer}
												>
													{#if isSubmittingOffer}
														Submitting...
													{:else}
														Submit Offer
													{/if}
												</button>
											</div>
										</form>
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
