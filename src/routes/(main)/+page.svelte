<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient.js';
  import Autoplay from "embla-carousel-autoplay";
  import * as Carousel from "$lib/components/ui/carousel/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { isMentorMode } from '$lib/stores/roleToggle.js';

  let status = 'Testing...';

  // Autoplay plugins
  const notificationPlugin = Autoplay({ delay: 4000, stopOnInteraction: true });
  const featuredPlugin = Autoplay({ delay: 5000, stopOnInteraction: true });

  // Sample data
  const topMentors = [
    { name: 'Dr. Sarah Johnson', field: 'Computer Science', rating: 4.9, students: 45, avatar: '👩‍💻', experience: '8 years' },
    { name: 'Prof. Michael Chen', field: 'Mathematics', rating: 4.8, students: 38, avatar: '👨‍🏫', experience: '12 years' },
    { name: 'Dr. Emily Rodriguez', field: 'Physics', rating: 4.7, students: 42, avatar: '👩‍🔬', experience: '6 years' },
    { name: 'Prof. David Kim', field: 'Engineering', rating: 4.9, students: 51, avatar: '👨‍🔧', experience: '10 years' },
    { name: 'Dr. Lisa Wang', field: 'Chemistry', rating: 4.6, students: 35, avatar: '👩‍🔬', experience: '7 years' },
    { name: 'Prof. James Wilson', field: 'Biology', rating: 4.8, students: 48, avatar: '👨‍🔬', experience: '15 years' }
  ];

  const notifications = [
    { title: 'New mentorship request', message: 'Someone wants to connect with you', time: '2 hours ago', type: 'request', icon: '📝' },
    { title: 'Weekly reminder', message: 'Don\'t forget your scheduled session', time: '1 day ago', type: 'reminder', icon: '⏰' },
    { title: 'Achievement unlocked', message: 'You\'ve helped 10 students this month!', time: '3 days ago', type: 'achievement', icon: '🏆' },
    { title: 'New message', message: 'You have 3 unread messages', time: '5 hours ago', type: 'message', icon: '💬' },
    { title: 'Settings update', message: 'Your profile preferences have been saved', time: '1 week ago', type: 'settings', icon: '⚙️' }
  ];

  const mentorOfTheMonth = [
    { name: 'Dr. James Wilson', field: 'Engineering', image: '🏆', description: 'Outstanding mentor with 100+ successful connections', badge: 'Mentor of the Month', achievements: '150+ students helped' },
    { name: 'Prof. Lisa Park', field: 'Biology', image: '🌟', description: 'Leading researcher helping students excel', badge: 'Featured Mentor', achievements: '95% success rate' },
    { name: 'Dr. Alex Thompson', field: 'Chemistry', image: '💎', description: 'Innovative teaching methods and high success rate', badge: 'Rising Star', achievements: '200+ sessions' },
    { name: 'Prof. Maria Garcia', field: 'Computer Science', image: '🚀', description: 'Tech industry expert with real-world experience', badge: 'Industry Expert', achievements: '50+ job placements' }
  ];

  async function testSupabase() {
    try {
      const { data, error } = await supabase.from('users').select('count').limit(1);
      
      if (error) {
        status = `❌ Error: ${error.message}`;
      } else {
        status = '✅ Supabase Connected!';
      }
    } catch (err) {
      status = `❌ Failed: ${err instanceof Error ? err.message : 'Unknown error'}`;
    }
  }

  onMount(() => {
    testSupabase();
  });
</script>

<div class="min-h-screen bg-gray-50">
  <!-- Hero Section - Eye-catching Light Theme -->
  <div class="relative w-full min-h-screen flex items-center justify-center px-8 overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
    <!-- Animated Gradient Overlay -->
    <div class="absolute inset-0 bg-gradient-to-r from-blue-400/10 via-indigo-400/10 to-purple-400/10 animate-pulse"></div>
    
    <!-- Decorative Elements -->
    <div class="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-full blur-3xl"></div>
    <div class="absolute bottom-20 right-10 w-40 h-40 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"></div>
    
              <div class="relative max-w-5xl mx-auto text-center">
       <!-- Main Heading with Enhanced Typography -->
       <div class="mb-12">
         <h1 class="text-8xl lg:text-9xl xl:text-[10rem] font-black text-gray-900 mb-6 leading-none tracking-tight">
           <span class="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent drop-shadow-lg">
             Academeet
           </span>
         </h1>
         
         <!-- Animated Decorative Line -->
         <div class="w-32 h-1 bg-gradient-to-r from-blue-600 to-purple-600 mx-auto rounded-full mb-8 animate-pulse"></div>
       </div>
       
       <!-- Elegant Subtitle with Animation -->
       <div class="mb-10">
         <h2 class="text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-800 mb-6 leading-tight">
           Where students connect with
           <span class="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent animate-gradient-x">
             expert mentors
           </span>
         </h2>
         
         <!-- Description with Fade-in Effect -->
         <p class="text-xl lg:text-2xl text-gray-600 leading-relaxed max-w-3xl mx-auto animate-fade-in">
           Transform your academic journey with personalized mentorship from experienced educators and industry professionals.
         </p>
       </div>
       
       <!-- Enhanced CTA Buttons -->
       <div class="flex flex-col sm:flex-row gap-6 justify-center">
         <button class="group px-10 py-5 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl">
           <span class="flex items-center gap-2">
             Get Started
             <svg class="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
             </svg>
           </span>
         </button>
         <button class="px-10 py-5 text-lg bg-white/80 backdrop-blur-sm text-gray-700 rounded-2xl font-semibold border-2 border-gray-200 hover:border-gray-300 hover:bg-white transition-all duration-300 shadow-lg hover:shadow-xl">
           Learn More
         </button>
       </div>
     </div>
   </div>

  <!-- How It Works Section -->
  <div class="max-w-7xl mx-auto px-8 py-20">
    <div class="text-center mb-16">
      <h2 class="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">How It Works</h2>
      <p class="text-xl text-gray-600 max-w-3xl mx-auto">Simple steps to connect with expert mentors and accelerate your learning journey</p>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div class="text-center p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100/50 shadow-lg">
        <div class="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <span class="text-white text-2xl font-bold">1</span>
        </div>
        <h3 class="text-xl font-bold text-gray-900 mb-4">Find Your Mentor</h3>
        <p class="text-gray-600">Browse through our curated list of expert mentors in your field of interest</p>
      </div>
      
      <div class="text-center p-8 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100/50 shadow-lg">
        <div class="w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <span class="text-white text-2xl font-bold">2</span>
        </div>
        <h3 class="text-xl font-bold text-gray-900 mb-4">Schedule Sessions</h3>
        <p class="text-gray-600">Book personalized mentoring sessions that fit your schedule and learning goals</p>
      </div>
      
      <div class="text-center p-8 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-100/50 shadow-lg">
        <div class="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <span class="text-white text-2xl font-bold">3</span>
        </div>
        <h3 class="text-xl font-bold text-gray-900 mb-4">Grow & Excel</h3>
        <p class="text-gray-600">Learn from experts, get personalized guidance, and achieve your academic goals</p>
      </div>
    </div>
  </div>

  <!-- Why Choose Academeet Section -->
  <div class="max-w-7xl mx-auto px-8 py-20 bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-purple-50/50">
    <div class="text-center mb-16">
      <h2 class="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">Why Choose Academeet</h2>
      <p class="text-xl text-gray-600 max-w-3xl mx-auto">Discover what makes our platform the preferred choice for students and mentors alike</p>
    </div>
    
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
      <div class="space-y-8">
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
            </svg>
          </div>
          <div>
            <h3 class="text-xl font-bold text-gray-900 mb-2">Expert Mentors</h3>
            <p class="text-gray-600">Connect with verified professionals and educators with proven track records</p>
          </div>
        </div>
        
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div>
            <h3 class="text-xl font-bold text-gray-900 mb-2">Flexible Scheduling</h3>
            <p class="text-gray-600">Book sessions that work with your schedule, anytime, anywhere</p>
          </div>
        </div>
        
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div>
            <h3 class="text-xl font-bold text-gray-900 mb-2">Personalized Learning</h3>
            <p class="text-gray-600">Get tailored guidance and support based on your specific needs and goals</p>
          </div>
        </div>
      </div>
      
             <div class="space-y-8">
         <div class="flex items-start gap-4">
           <div class="w-12 h-12 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
             <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
             </svg>
           </div>
           <div>
             <h3 class="text-xl font-bold text-gray-900 mb-2">Time Saving</h3>
             <p class="text-gray-600">Quick and efficient matching with mentors. No more endless searching or waiting for responses.</p>
           </div>
         </div>
         
         <div class="flex items-start gap-4">
           <div class="w-12 h-12 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center flex-shrink-0">
             <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
             </svg>
           </div>
           <div>
             <h3 class="text-xl font-bold text-gray-900 mb-2">Easy to Find</h3>
             <p class="text-gray-600">Advanced search and filtering to quickly find the perfect mentor for your specific needs.</p>
           </div>
         </div>
         
         <div class="flex items-start gap-4">
           <div class="w-12 h-12 bg-gradient-to-r from-orange-600 to-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
             <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
             </svg>
           </div>
           <div>
             <h3 class="text-xl font-bold text-gray-900 mb-2">User Friendly</h3>
             <p class="text-gray-600">Intuitive interface designed for students. Simple booking, clear communication, and easy tracking.</p>
           </div>
         </div>
         
         <div class="flex items-start gap-4">
           <div class="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center flex-shrink-0">
             <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
             </svg>
           </div>
           <div>
             <h3 class="text-xl font-bold text-gray-900 mb-2">Secure & Reliable</h3>
             <p class="text-gray-600">Safe platform with verified mentors, secure payments, and reliable scheduling system.</p>
           </div>
         </div>
       </div>
    </div>
  </div>

  <!-- Bento Grid - Main Content -->
  <div class="max-w-7xl mx-auto px-8 py-16">
    <div class="grid grid-cols-3 grid-rows-6 gap-8">

      <!-- Top Mentors: left, wide and tall -->
      <section class="col-span-2 row-span-4 rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 p-8 h-full border border-blue-100/50 shadow-lg">
        <h2 class="text-3xl font-bold text-gray-900 mb-6">Top Mentors</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          {#each topMentors.slice(0, 6) as mentor, i (i)}
            <Card.Root class="bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all duration-300 cursor-pointer border border-white/50">
              <Card.Content class="p-4">
                <div class="flex items-center space-x-3">
                  <div class="text-2xl">{mentor.avatar}</div>
                  <div class="flex-1">
                    <h3 class="font-semibold text-gray-900">{mentor.name}</h3>
                    <p class="text-sm text-gray-600">{mentor.field}</p>
                    <div class="flex items-center justify-between text-xs mt-1">
                      <span class="text-yellow-500">⭐ {mentor.rating}</span>
                      <span class="text-gray-500">{mentor.students} students</span>
                    </div>
                  </div>
                </div>
              </Card.Content>
            </Card.Root>
          {/each}
        </div>
        <div class="mt-6 text-center">
          <button class="text-blue-600 hover:text-blue-700 font-semibold transition-colors">View All Mentors →</button>
        </div>
      </section>

      <!-- Mentor of the Month: right tall -->
      <section class="row-span-4 rounded-3xl bg-gradient-to-br from-indigo-50 to-purple-50 p-6 h-full border border-indigo-100/50 shadow-lg">
        <h3 class="text-xl font-bold text-gray-900 mb-4">Mentor of the Month</h3>
        <Carousel.Root
          plugins={[featuredPlugin]}
          class="h-full"
          onmouseenter={featuredPlugin.stop}
          onmouseleave={featuredPlugin.reset}
        >
          <Carousel.Content>
            {#each mentorOfTheMonth as mentor, i (i)}
              <Carousel.Item>
                <div class="p-1 h-full">
                  <Card.Root class="bg-white/80 backdrop-blur-sm h-full border border-white/50">
                    <Card.Content class="p-4 h-full flex flex-col">
                      <div class="flex flex-col items-center gap-2">
                        <div class="text-3xl">{mentor.image}</div>
                        <div class="bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs px-3 py-1 rounded-full inline-block font-medium">
                          {mentor.badge}
                        </div>
                        <h4 class="font-semibold text-gray-900 text-lg">{mentor.name}</h4>
                        <p class="text-sm text-gray-600">{mentor.field}</p>
                        <p class="text-xs text-gray-500 text-center max-w-[22rem]">{mentor.description}</p>
                      </div>

                      <!-- Fills remaining space to bottom; add metrics and CTA -->
                      <div class="mt-auto w-full">
                        <div class="grid grid-cols-3 gap-3 text-center mb-3">
                          <div>
                            <div class="text-base font-semibold text-gray-900">4.9</div>
                            <div class="text-[10px] text-gray-500">Rating</div>
                          </div>
                          <div>
                            <div class="text-base font-semibold text-gray-900">150+</div>
                            <div class="text-[10px] text-gray-500">Students</div>
                          </div>
                          <div>
                            <div class="text-base font-semibold text-gray-900">95%</div>
                            <div class="text-[10px] text-gray-500">Success</div>
                          </div>
                        </div>
                        <button class="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 text-sm font-medium">
                          View Profile
                        </button>
                      </div>
                    </Card.Content>
                  </Card.Root>
                </div>
              </Carousel.Item>
            {/each}
          </Carousel.Content>
          <Carousel.Previous class="carousel-nav-button" />
          <Carousel.Next class="carousel-nav-button" />
        </Carousel.Root>
      </section>

      <!-- Join As A Mentor: bottom-left spanning 2 cols x 2 rows -->
      <section class="col-span-2 row-span-2 rounded-3xl bg-gradient-to-br from-purple-50 to-pink-50 p-6 h-full border border-purple-100/50 shadow-lg">
        <h3 class="text-xl font-bold text-gray-900 mb-4">Join As A Mentor</h3>
        <div class="text-center p-4">
          <div class="text-3xl mb-3">👨‍🏫</div>
          <p class="text-gray-600 text-sm mb-4">Share your expertise and help students grow</p>
          <button class="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300 font-medium">
            Become a Mentor
          </button>
        </div>
      </section>

      <!-- Notifications: right bottom short -->
      <section class="row-span-2 rounded-3xl bg-gradient-to-br from-blue-50 to-cyan-50 p-6 h-full border border-blue-100/50 shadow-lg">
        <h3 class="text-xl font-bold text-gray-900 mb-4">Notifications</h3>
        <Carousel.Root
          plugins={[notificationPlugin]}
          class="h-full"
          onmouseenter={notificationPlugin.stop}
          onmouseleave={notificationPlugin.reset}
        >
          <Carousel.Content>
            {#each notifications as notification, i (i)}
              <Carousel.Item>
                <div class="p-1">
                  <Card.Root class="bg-white/80 backdrop-blur-sm border border-white/50">
                    <Card.Content class="p-3">
                      <div class="flex items-start space-x-2">
                        <div class="text-lg">{notification.icon}</div>
                        <div class="flex-1">
                          <h4 class="font-semibold text-gray-900 text-sm">{notification.title}</h4>
                          <p class="text-gray-600 text-xs">{notification.message}</p>
                          <p class="text-blue-500 text-xs mt-1">{notification.time}</p>
                        </div>
                      </div>
                    </Card.Content>
                  </Card.Root>
                </div>
              </Carousel.Item>
            {/each}
          </Carousel.Content>
          <Carousel.Previous class="carousel-nav-button" />
          <Carousel.Next class="carousel-nav-button" />
        </Carousel.Root>
      </section>

    </div>
  </div>

  <!-- Database Status (Optional) -->
  <div class="max-w-7xl mx-auto px-8 pb-16">
    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100/50 shadow-lg">
      <p class="text-sm text-gray-700 font-medium">Database Status: {status}</p>
      <button 
        on:click={testSupabase}
        class="mt-3 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 font-medium"
      >
        Test Connection
      </button>
    </div>
  </div>
</div>
