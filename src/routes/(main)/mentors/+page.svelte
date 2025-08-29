<script lang="ts">
	import MentorCard from '$lib/components/MentorCard.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';

	// Sample mentor data (replace with real data later)
	let mentors = [
		{
			name: 'Dr. Sarah Johnson',
			department: 'Computer Science',
			skills: ['Web Development', 'JavaScript', 'React', 'Node.js', 'Python'],
			rating: 4.9,
			students: 45,
			avatar: '👩‍💻',
			experience: '8 years',
			bio: 'Experienced web developer with expertise in modern JavaScript frameworks and full-stack development.'
		},
		{
			name: 'Prof. Michael Chen',
			department: 'Mathematics',
			skills: ['Calculus', 'Linear Algebra', 'Statistics', 'Data Analysis'],
			rating: 4.8,
			students: 38,
			avatar: '👨‍🏫',
			experience: '12 years',
			bio: 'Mathematics professor specializing in applied mathematics and statistical analysis.'
		},
		{
			name: 'Dr. Emily Rodriguez',
			department: 'Physics',
			skills: ['Quantum Mechanics', 'Classical Mechanics', 'Thermodynamics'],
			rating: 4.7,
			students: 42,
			avatar: '👩‍🔬',
			experience: '6 years',
			bio: 'Physics researcher with focus on quantum mechanics and theoretical physics.'
		},
		{
			name: 'Prof. David Kim',
			department: 'Engineering',
			skills: ['Mechanical Engineering', 'CAD', 'Thermodynamics', 'Robotics'],
			rating: 4.9,
			students: 51,
			avatar: '👨‍🔧',
			experience: '10 years',
			bio: 'Mechanical engineering expert with experience in robotics and automation systems.'
		},
		{
			name: 'Dr. Lisa Wang',
			department: 'Chemistry',
			skills: ['Organic Chemistry', 'Analytical Chemistry', 'Biochemistry'],
			rating: 4.6,
			students: 35,
			avatar: '👩‍🔬',
			experience: '7 years',
			bio: 'Chemistry professor with expertise in organic synthesis and analytical methods.'
		},
		{
			name: 'Prof. James Wilson',
			department: 'Biology',
			skills: ['Cell Biology', 'Genetics', 'Microbiology', 'Ecology'],
			rating: 4.8,
			students: 48,
			avatar: '👨‍🔬',
			experience: '15 years',
			bio: 'Senior biology professor with extensive research experience in genetics and cell biology.'
		},
		{
			name: 'Dr. Alex Thompson',
			department: 'Computer Science',
			skills: ['Machine Learning', 'AI', 'Python', 'Data Science', 'Web Development'],
			rating: 4.9,
			students: 62,
			avatar: '👨‍💻',
			experience: '9 years',
			bio: 'AI researcher and machine learning expert with industry experience in tech companies.'
		},
		{
			name: 'Prof. Maria Garcia',
			department: 'Computer Science',
			skills: ['Software Engineering', 'Java', 'Database Design', 'Web Development'],
			rating: 4.7,
			students: 41,
			avatar: '👩‍💻',
			experience: '11 years',
			bio: 'Software engineering professor with expertise in enterprise software development.'
		}
	];

	let searchQuery = '';
	let filteredMentors = mentors;

	// Filter mentors based on search query
	$: {
		if (searchQuery.trim() === '') {
			filteredMentors = mentors;
		} else {
			filteredMentors = mentors.filter(mentor =>
				mentor.skills.some(skill =>
					skill.toLowerCase().includes(searchQuery.toLowerCase())
				) ||
				mentor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				mentor.department.toLowerCase().includes(searchQuery.toLowerCase())
			);
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
	</div>

	<!-- Mentors Grid -->
	{#if filteredMentors.length > 0}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each filteredMentors as mentor}
				<MentorCard {mentor} />
			{/each}
		</div>
	{:else}
		<!-- No Results -->
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
