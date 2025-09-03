<script lang="ts">
	import * as Carousel from '$lib/components/ui/carousel';
	import * as Dialog from '$lib/components/ui/dialog';

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

	async function loadUpcomingSchedules() {
		try {
			const now = new Date().toISOString();
			const { data: bookings, error } = await supabase
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
				.or(`mentee_id.eq.${$user?.id},mentor_id.eq.${$user?.id}`)
				.in('status', ['Pending', 'Confirmed'])
				.gte('session_time', now)
				.order('session_time', { ascending: true });

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

	async function loadNotifications() {
		try {
			const { data: notifs, error } = await supabase
				.from('notifications')
				.select('*')
				.eq('user_id', $user?.id)
				.order('created_at', { ascending: false })
				.limit(10);

			if (error) throw error;

			notifications = notifs.map(notif => ({
				id: notif.notification_id,
				type: notif.type.toLowerCase(),
				title: notif.type,
				message: notif.message,
				time: notif.created_at,
				status: notif.is_read ? 'read' : 'unread'
			}));
		} catch (error) {
			console.error('Error loading notifications:', error);
		} finally {
			isLoading = false;
		}
	}

	// Subscribe to real-time updates
	onMount(() => {
		loadUpcomingSchedules();
		loadNotifications();

		// Subscribe to booking updates
		const bookingSubscription = supabase
			.channel('bookings')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'bookings',
					filter: `or(mentee_id=eq.${$user?.id},mentor_id=eq.${$user?.id})`
				},
				() => {
					loadUpcomingSchedules();
				}
			)
			.subscribe();

		// Subscribe to notification updates
		const notificationSubscription = supabase
			.channel('notifications')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'notifications',
					filter: `user_id=eq.${$user?.id}`
				},
				() => {
					loadNotifications();
				}
			)
			.subscribe();

		return () => {
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
														<span class="text-xs px-2 py-1 rounded-full {schedule.status === 'Confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
															{schedule.status}
														</span>
													</div>
													<div>
														<h3 class="font-semibold text-gray-900 mb-2 text-base line-clamp-1 overflow-hidden">{schedule.title}</h3>
														<p class="text-sm text-gray-600 mb-2 line-clamp-1 overflow-hidden">{schedule.type === 'mentor' ? `Student: ${schedule.student}` : `Mentor: ${schedule.mentor}`}</p>
														<p class="text-sm text-gray-500 line-clamp-1 overflow-hidden">{new Date(schedule.time).toLocaleDateString()} at {new Date(schedule.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
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
															{new Date(schedule.time).toLocaleDateString()} at {new Date(schedule.time).toLocaleTimeString()}
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
												<button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
													Join Session
												</button>
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
								<div class="w-full h-32 p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer text-left {notification.status === 'unread' ? 'bg-blue-50 border-blue-200' : 'bg-white'} flex flex-col justify-between">
									<div class="flex items-center justify-between mb-2 flex-shrink-0">
										<span class="text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
											{notification.type === 'offer' ? 'Offer' : 'Booking'}
										</span>
										{#if notification.status === 'unread'}
											<span class="w-3 h-3 bg-blue-600 rounded-full"></span>
										{/if}
									</div>
									<div class="flex-1 min-w-0">
										<h3 class="font-semibold text-gray-900 text-base line-clamp-1 mb-1">{notification.title}</h3>
										<p class="text-sm text-gray-600 line-clamp-2">{notification.message}</p>
									</div>
									<p class="text-sm text-gray-500 flex-shrink-0">
										{new Date(notification.time).toLocaleDateString()} at {new Date(notification.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
									</p>
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
												{new Date(notification.time).toLocaleDateString()} at {new Date(notification.time).toLocaleTimeString()}
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