<script lang="ts">
	import * as Carousel from '$lib/components/ui/carousel';
	import * as Dialog from '$lib/components/ui/dialog';
	import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

	import { auth } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import { user } from '$lib/stores/auth';

	async function handleSignOut() {
		await auth.signOut();
		goto('/auth/signin');
	}

	interface ScheduleItem {
		id: string;
		type: 'mentor' | 'mentee';
		title: string;
		student: string;
		mentor: string;
		time: string;
		duration: number;
		status: string;
		description: string;
	}

	interface NotificationItem {
		id: string;
		type: string;
		title: string;
		message: string;
		time: string;
		status: 'read' | 'unread';
	}

	let upcomingSchedules: ScheduleItem[] = [];
	let notifications: NotificationItem[] = [];
	let isLoading = true;

	// Convert UTC to Bangladesh time
	function utcToBD(utcDateTime: string): string {
		// Parse the UTC time
		const date = new Date(utcDateTime);
		
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
	}

	async function loadUpcomingSchedules() {
		try {
			// Get current time in UTC
			const now = new Date();
			const utcNow = new Date(now.getTime() - (6 * 60 * 60 * 1000)); // Convert BD time to UTC by subtracting 6 hours
			
			console.log('Loading schedules after:', utcNow.toISOString());
			
			// Get all upcoming and current sessions
			console.log('Current user ID:', $user?.id);
			
			const query = supabase
				.from('bookings')
				.select(`
					*,
					mentee:users!bookings_mentee_id_fkey (
						name
					),
					mentor:users!bookings_mentor_id_fkey (
						name
					)
				`)
				.or(`mentor_id.eq.${$user?.id},mentee_id.eq.${$user?.id}`)
				.in('status', ['Pending', 'Confirmed'])
				.gte('session_time', utcNow.toISOString())
				.order('session_time', { ascending: true });

			console.log('Query built:', query);
			
			const { data: bookings, error } = await query;

			console.log('Fetched bookings:', bookings);

			if (error) throw error;

			upcomingSchedules = bookings.map(booking => ({
				id: booking.booking_id,
				type: booking.mentee_id === $user?.id ? 'mentee' : 'mentor',
				title: `Session with ${booking.mentee_id === $user?.id ? booking.mentor.name : booking.mentee.name}`,
				student: booking.mentee.name,
				mentor: booking.mentor.name,
				time: booking.session_time,
				duration: booking.duration_minutes,
				status: booking.status,
				description: booking.topic || 'No description provided'
			}));
		} catch (error) {
			console.error('Error loading schedules:', error);
		}
	}

	async function handleConfirmSession(bookingId: string) {
		try {
			// Get the booking details first
			const { data: booking, error: bookingError } = await supabase
				.from('bookings')
				.select(`
					*,
					mentee:users!bookings_mentee_id_fkey (
						name
					),
					mentor:users!bookings_mentor_id_fkey (
						name
					)
				`)
				.eq('booking_id', bookingId)
				.single();

			if (bookingError) throw bookingError;

			// Update booking status
			const { error: updateError } = await supabase
				.from('bookings')
				.update({ status: 'Confirmed' })
				.eq('booking_id', bookingId);

			if (updateError) throw updateError;

			// Create notification for mentee
			const { error: notificationError } = await supabase
				.from('notifications')
				.insert({
					user_id: booking.mentee_id,
					type: 'Booking',
					message: `${booking.mentor.name} has confirmed your session for ${booking.topic} on ${utcToBD(booking.session_time).replace(' BDT', '')}`,
					is_read: false
				});

			if (notificationError) throw notificationError;

			// Refresh data
			await Promise.all([
				loadUpcomingSchedules(),
				loadNotifications()
			]);

		} catch (error) {
			console.error('Error confirming session:', error);
			// You might want to show a toast notification here
		}
	}

	async function markAsRead(notificationId: string) {
		try {
			const { error } = await supabase
				.from('notifications')
				.update({ is_read: true })
				.eq('notification_id', notificationId);

			if (error) throw error;
			await loadNotifications();
		} catch (error) {
			console.error('Error marking notification as read:', error);
		}
	}

	async function loadNotifications() {
		try {
			console.log('Loading notifications for user:', $user?.id);
			
			const notifQuery = supabase
				.from('notifications')
				.select('*')
				.eq('user_id', $user?.id)
				.order('created_at', { ascending: false })
				.limit(10);

			console.log('Notification query built:', notifQuery);
			
			const { data: notifs, error } = await notifQuery;
			
			console.log('Fetched notifications for user:', {
				userId: $user?.id,
				count: notifs?.length,
				notifications: notifs
			});

			if (error) throw error;

			notifications = notifs.map(notif => {
				return {
					id: notif.notification_id,
					type: notif.type.toLowerCase(),
					title: notif.type,
					message: notif.message,
					time: notif.created_at, // Keep as UTC string for utcToBD function
					status: notif.is_read ? 'read' : 'unread'
				};
			});
		} catch (error) {
			console.error('Error loading notifications:', error);
		} finally {
			isLoading = false;
		}
	}

	// Subscribe to real-time updates
	onMount(() => {
		console.log('MySpace mounted, setting up subscriptions...');
		
		// Set up subscriptions first
		const bookingSubscription = supabase
			.channel('bookings')
			.on('postgres_changes' as const,
				{
					event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
					schema: 'public',
					table: 'bookings',
					filter: `or(mentor_id.eq.${$user?.id},mentee_id.eq.${$user?.id})`
				},
				async (payload: RealtimePostgresChangesPayload<{ mentor_id: string; mentee_id: string }>) => {
					console.log('Booking change detected:', payload);
					
					// Type guard to ensure payload.new exists and has the expected shape
					if (payload.new && 'mentor_id' in payload.new) {
						console.log('Current user role in change:', payload.new.mentor_id === $user?.id ? 'mentor' : 'mentee');
					}
					
					await loadUpcomingSchedules();
					console.log('Schedules reloaded after change');
				}
			)
			.subscribe((status) => {
				console.log('Booking subscription status:', status);
			});

		// Set up separate channels for INSERT and UPDATE events
		const notificationSubscription = supabase
			.channel('notifications')
			.on('postgres_changes' as const,
				{
					event: 'INSERT',
					schema: 'public',
					table: 'notifications',
					filter: `user_id=eq.${$user?.id}`
				},
				async (payload: RealtimePostgresChangesPayload<{ user_id: string }>) => {
					console.log('New notification detected:', {
						userId: $user?.id,
						notification: payload.new
					});
					await loadNotifications();
					console.log('Notifications reloaded after new notification');
				}
			)
			.on('postgres_changes' as const,
				{
					event: 'UPDATE',
					schema: 'public',
					table: 'notifications',
					filter: `user_id=eq.${$user?.id}`
				},
				async (payload: RealtimePostgresChangesPayload<{ user_id: string }>) => {
					console.log('Notification updated:', {
						userId: $user?.id,
						notification: payload.new
					});
					await loadNotifications();
					console.log('Notifications reloaded after update');
				}
			)
			.subscribe((status) => {
				console.log('Notification subscription status:', {
					userId: $user?.id,
					status
				});
			});

		// Then load initial data
		console.log('Loading initial data...');
		Promise.all([
			loadUpcomingSchedules(),
			loadNotifications()
		]).then(() => {
			console.log('Initial data loaded');
		});

		return () => {
			console.log('Cleaning up subscriptions...');
			bookingSubscription.unsubscribe();
			notificationSubscription.unsubscribe();
		};
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
			<a href="/myspace" class="px-3 py-2 text-sm font-medium text-blue-600 border-b-2 border-blue-600">
				MySpace
			</a>
			<a href="/myspace/mentor-profile" class="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">
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

<div class="container mx-auto px-4 py-8 max-w-6xl">
	<h1 class="text-3xl font-bold text-gray-900 mb-8">MySpace Page</h1>

	<!-- Main Content Grid -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
		<!-- Upcoming Schedule Section -->
		<div class="bg-white rounded-lg shadow-md p-6">
			<h2 class="text-xl font-semibold text-gray-900 mb-4">Upcoming Schedule</h2>
			
			{#if isLoading}
				<div class="flex items-center justify-center h-64">
					<div class="animate-spin text-4xl">⚙️</div>
				</div>
			{:else if upcomingSchedules.length === 0}
				<div class="flex items-center justify-center h-64">
					<p class="text-gray-500">No upcoming sessions</p>
				</div>
			{:else}
			<Carousel.Root class="w-full">
				<Carousel.Content class="-ml-1">
					{#each upcomingSchedules as schedule}
						<Carousel.Item class="pl-1 basis-full">
							<div class="p-1 h-full w-full">
								<Dialog.Root>
									<Dialog.Trigger>
										<div class="w-full h-full min-h-[260px] p-6 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer text-left bg-white flex flex-col justify-between overflow-hidden">
											<div class="space-y-3">
												<div class="flex items-center justify-between">
													<span class="text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
														{schedule.type === 'mentor' ? 'Teaching' : 'Learning'}
													</span>
																						<span class="text-xs px-2 py-1 rounded-full {
                                schedule.status === 'Confirmed' ? 'bg-green-100 text-green-800' : 
                                schedule.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-gray-100 text-gray-800'
                              }">
					{schedule.status === 'Pending' ? 'Unconfirmed' : schedule.status}
													</span>
												</div>
												<div>
													<h3 class="font-semibold text-gray-900 mb-2 text-base line-clamp-1 overflow-hidden">{schedule.title}</h3>
													<p class="text-sm text-gray-600 mb-2 line-clamp-1 overflow-hidden">{schedule.type === 'mentor' ? `Student: ${schedule.student}` : `Mentor: ${schedule.mentor}`}</p>
																											<p class="text-sm text-gray-500 line-clamp-1 overflow-hidden">
															{utcToBD(schedule.time)}
														</p>
													<p class="text-sm text-gray-600 mt-2 line-clamp-1 overflow-hidden">{schedule.description}</p>
												</div>
											</div>
										</div>
									</Dialog.Trigger>
									<Dialog.Content class="max-w-4xl w-full overflow-auto">
										<Dialog.Header>
											<Dialog.Title class="text-xl break-words overflow-hidden">{schedule.title}</Dialog.Title>
											<Dialog.Description>
												{schedule.type === 'mentor' ? 'Teaching Session' : 'Learning Session'}
											</Dialog.Description>
										</Dialog.Header>
										<div class="space-y-4">
											<div class="grid grid-cols-2 gap-4">
												<div>
													<span class="text-sm font-medium text-gray-700">Type</span>
													<p class="text-sm text-gray-900">{schedule.type === 'mentor' ? 'Teaching Session' : 'Learning Session'}</p>
												</div>
												<div>
													<span class="text-sm font-medium text-gray-700">Status</span>
													<p class="text-sm text-gray-900">{schedule.status}</p>
												</div>
												<div>
													<span class="text-sm font-medium text-gray-700">Date & Time</span>
													<p class="text-sm text-gray-900">
																													{utcToBD(schedule.time)}
													</p>
												</div>
												<div>
													<span class="text-sm font-medium text-gray-700">Duration</span>
													<p class="text-sm text-gray-900">{schedule.duration} minutes</p>
												</div>
											</div>
											<div>
												<span class="text-sm font-medium text-gray-700">Description</span>
												<p class="text-sm text-gray-900">{schedule.description}</p>
											</div>
											<div>
												<span class="text-sm font-medium text-gray-700">
													{schedule.type === 'mentor' ? 'Student' : 'Mentor'}
												</span>
												<p class="text-sm text-gray-900">
													{schedule.type === 'mentor' ? schedule.student : schedule.mentor}
												</p>
											</div>
										</div>
										<div class="flex justify-end space-x-2 mt-6">
											<Dialog.Close>
												<button class="px-4 py-2 text-gray-600 hover:text-gray-800">
													Close
												</button>
											</Dialog.Close>
												{#if schedule.type === 'mentor' && (schedule.status === 'Pending' || schedule.status === 'Scheduled')}
													<button 
														onclick={() => handleConfirmSession(schedule.id)}
														class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
													>
														Confirm Session
													</button>
												{:else if schedule.status === 'Confirmed'}
											<button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
												Join Session
											</button>
												{/if}
										</div>
									</Dialog.Content>
								</Dialog.Root>
							</div>
						</Carousel.Item>
					{/each}
				</Carousel.Content>
				<div class="flex justify-center space-x-2 mt-4">
					<Carousel.Previous />
					<Carousel.Next />
				</div>
			</Carousel.Root>
			{/if}
		</div>

		<!-- Notifications Section -->
		<div class="bg-white rounded-lg shadow-md p-6">
			<h2 class="text-xl font-semibold text-gray-900 mb-4">Notifications</h2>
			
			{#if isLoading}
				<div class="flex items-center justify-center h-64">
					<div class="animate-spin text-4xl">⚙️</div>
				</div>
			{:else if notifications.length === 0}
				<div class="flex items-center justify-center h-64">
					<p class="text-gray-500">No notifications</p>
				</div>
			{:else}
			<div class="max-h-[300px] overflow-y-auto space-y-3">
				{#each notifications as notification}
					<Dialog.Root>
						<Dialog.Trigger>
															<div class="w-full p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer text-left {notification.status === 'unread' ? 'bg-blue-50 border-blue-200' : 'bg-white'}">
									<div class="flex items-center justify-between mb-2">
									<span class="text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
										{notification.type === 'offer' ? 'Offer' : 'Booking'}
									</span>
										<div class="flex items-center gap-2">
									{#if notification.status === 'unread'}
										<span class="w-3 h-3 bg-blue-600 rounded-full"></span>
									{/if}
											<button 
												onclick={() => markAsRead(notification.id)}
												class="text-xs text-gray-500 hover:text-gray-700 {notification.status === 'read' ? 'opacity-50 cursor-not-allowed' : ''}"
												disabled={notification.status === 'read'}
											>
												{notification.status === 'read' ? 'Read' : 'Mark as Read'}
											</button>
								</div>
								</div>
									<div class="space-y-2">
										<h3 class="font-semibold text-gray-900 text-base">{notification.title}</h3>
										<p class="text-sm text-gray-600 whitespace-pre-wrap">{notification.message}</p>
										<p class="text-sm text-gray-500">
											{utcToBD(notification.time)}
								</p>
							</div>
							</div>
						</Dialog.Trigger>
						<Dialog.Content class="max-w-2xl w-full">
							<Dialog.Header>
								<Dialog.Title class="text-xl break-words">{notification.title}</Dialog.Title>
								<Dialog.Description>
									{notification.type === 'offer' ? 'New Offer Received' : 'Booking Update'}
								</Dialog.Description>
							</Dialog.Header>
							<div class="space-y-4">
								<div>
									<span class="text-sm font-medium text-gray-700">Message</span>
									<p class="text-sm text-gray-900">{notification.message}</p>
								</div>
								<div class="grid grid-cols-2 gap-4">
									<div>
										<span class="text-sm font-medium text-gray-700">Type</span>
										<p class="text-sm text-gray-900">{notification.type === 'offer' ? 'Offer' : 'Booking'}</p>
									</div>
									<div>
										<span class="text-sm font-medium text-gray-700">Status</span>
										<p class="text-sm text-gray-900 capitalize">{notification.status}</p>
									</div>
									<div class="col-span-2">
										<span class="text-sm font-medium text-gray-700">Time</span>
										<p class="text-sm text-gray-900">
											{utcToBD(notification.time)}
										</p>
									</div>
								</div>
							</div>
							<div class="flex justify-end space-x-2 mt-6">
								<Dialog.Close>
									<button class="px-4 py-2 text-gray-600 hover:text-gray-800">
										Close
									</button>
								</Dialog.Close>
								{#if notification.type === 'offer'}
									<button class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
										Accept Offer
									</button>
								{/if}
							</div>
						</Dialog.Content>
					</Dialog.Root>
				{/each}
			</div>
			{/if}
		</div>
</div>

	<!-- Chat Section -->
	<div class="bg-white rounded-lg shadow-md p-6">
		<h2 class="text-xl font-semibold text-gray-900 mb-4">Chat</h2>
		
		<div class="text-center py-12">
			<p class="text-gray-600">CHAT</p>
		</div>
	</div>
</div>