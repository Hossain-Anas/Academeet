<script lang="ts">
	import * as Carousel from '$lib/components/ui/carousel/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { isMentorMode } from '$lib/stores/roleToggle.js';

	// Sample upcoming schedule data
	let upcomingSchedules = [
		{
			id: '1',
			type: 'mentor',
			title: 'Data Structures Session',
			student: 'Alice Johnson',
			time: '2024-01-15T14:00',
			duration: 60,
			status: 'Confirmed',
			description: 'Help with binary trees implementation in Java'
		},
		{
			id: '2',
			type: 'mentee',
			title: 'Calculus II Help',
			mentor: 'Dr. Smith',
			time: '2024-01-16T16:00',
			duration: 90,
			status: 'Pending',
			description: 'Integration by parts and trigonometric substitution'
		},
		{
			id: '3',
			type: 'mentor',
			title: 'Web Development Review',
			student: 'Bob Wilson',
			time: '2024-01-17T10:00',
			duration: 45,
			status: 'Confirmed',
			description: 'React project code review and best practices'
		},
		{
			id: '4',
			type: 'mentee',
			title: 'Physics Problem Solving',
			mentor: 'Dr. Brown',
			time: '2024-01-18T15:30',
			duration: 75,
			status: 'Pending',
			description: 'Mechanics and thermodynamics problems'
		}
	];

	// Sample notifications data
	let notifications = [
		{
			id: '1',
			type: 'offer',
			title: 'New Offer Received',
			message: 'Dr. Johnson offered to help with your Data Structures assignment',
			time: '2024-01-14T10:30',
			status: 'unread'
		},
		{
			id: '2',
			type: 'booking',
			title: 'Session Confirmed',
			message: 'Your session with Alice Johnson has been confirmed for tomorrow',
			time: '2024-01-14T09:15',
			status: 'read'
		},
		{
			id: '3',
			type: 'offer',
			title: 'Offer Accepted',
			message: 'Your offer for Calculus II help has been accepted by the student',
			time: '2024-01-14T08:45',
			status: 'read'
		},
		{
			id: '4',
			type: 'booking',
			title: 'Session Reminder',
			message: 'Reminder: You have a session with Dr. Smith in 30 minutes',
			time: '2024-01-14T07:30',
			status: 'unread'
		}
	];

	// Sample chat messages
	let chatMessages = [
		{ id: '1', sender: 'Alice Johnson', message: 'Hi! I have a question about the assignment', time: '10:30 AM' },
		{ id: '2', sender: 'You', message: 'Sure! What do you need help with?', time: '10:32 AM' },
		{ id: '3', sender: 'Alice Johnson', message: 'I\'m stuck with the binary tree traversal', time: '10:33 AM' }
	];

	// Removed handleAcademeetClick function - using proper Svelte link instead
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
	<h1 class="text-3xl font-bold text-gray-900 mb-8">MySpace Page</h1>

	<!-- Main Content Grid -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
		<!-- Upcoming Schedule Section -->
		<div class="bg-white rounded-lg shadow-md p-6">
			<h2 class="text-xl font-semibold text-gray-900 mb-4">Upcoming Schedule</h2>
			
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
		</div>

		<!-- Notifications Section -->
		<div class="bg-white rounded-lg shadow-md p-6">
			<h2 class="text-xl font-semibold text-gray-900 mb-4">Notifications</h2>
			
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