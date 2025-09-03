<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { isMentorMode } from '$lib/stores/roleToggle.js';
  import { user } from '$lib/stores/auth';
  import { supabase } from '$lib/supabaseClient';
  import { onDestroy } from 'svelte';
  import { toast } from '$lib/stores/toast';
  
  export let mentor = {
    user_id: '',
    name: '',
    department: '',
    skills: [] as string[],
    rating: 0,
    students: 0,
    avatar: '',
    bio: '',
    teachingStyle: '',
    sessionTypes: [] as string[]
  };

  // Check if current user is trying to book their own session
  $: isSelfBooking = $user?.id === mentor.user_id;
  
  // Disable booking if user is in mentor mode or trying to book themselves
  $: isBookingDisabled = $isMentorMode || isSelfBooking;

  // Form state
  let isSubmitting = false;
  let selectedTopic = '';
  let selectedDateTime = '';
  let selectedDuration = 60;
  let message = '';
  let bookingDialog: any;

  // Get minimum date-time (now + 30 minutes to allow for processing)
  $: minDateTime = (() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    return now.toISOString().slice(0, 16);
  })();

  async function checkExistingBookings(startTime: string, duration: number): Promise<boolean> {
    try {
      const sessionStart = new Date(startTime);
      const sessionEnd = new Date(sessionStart.getTime() + duration * 60000);

      const { data: existingBookings, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('mentee_id', $user?.id)
        .in('status', ['Scheduled', 'Completed'])
        .or(`session_time.gte.${sessionStart.toISOString()},session_time.lt.${sessionEnd.toISOString()}`);

      if (error) throw error;

      return existingBookings && existingBookings.length > 0;
    } catch (error) {
      console.error('Error checking existing bookings:', error);
      return false;
    }
  }

  async function handleBookSession(event: Event) {
    event.preventDefault();
    console.log('Form submitted');
    try {
      if (!$user) {
        toast.show('Please log in to book a session', 'error');
        return;
      }

      if (!selectedTopic || !selectedDateTime || !selectedDuration) {
        toast.show('Please fill in all required fields', 'error');
        return;
      }

      // Check for existing bookings
      const hasExistingBooking = await checkExistingBookings(selectedDateTime, selectedDuration);
      if (hasExistingBooking) {
        toast.show('You already have a session scheduled during this time slot', 'error');
        return;
      }

      isSubmitting = true;

      // Create booking using Supabase client
      console.log('Sending booking request:', {
        mentee_id: $user.id,
        mentor_id: mentor.user_id,
        session_time: selectedDateTime,
        duration_minutes: selectedDuration,
        status: 'Scheduled',
        topic: selectedTopic,
        message: message
      });

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          mentee_id: $user.id,
          mentor_id: mentor.user_id,
          session_time: selectedDateTime,
          duration_minutes: selectedDuration,
          status: 'Scheduled',
          topic: selectedTopic,
          message: message
        })
        .select(`
          *,
          mentee:users!bookings_mentee_id_fkey (
            name
          ),
          mentor:users!bookings_mentor_id_fkey (
            name
          )
        `)
        .single();

      if (bookingError) {
        console.error('Booking request failed:', bookingError);
        throw new Error(bookingError.message || 'Failed to book session');
      }

      console.log('Booking response:', booking);

      // Subscribe to real-time updates for this booking
      supabase.channel(`booking:${booking.booking_id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'bookings',
            filter: `booking_id=eq.${booking.booking_id}`
          },
          (payload: { new: { status: string } }) => {
            if (payload.new.status === 'Confirmed') {
              toast.show('Session confirmed! Check your upcoming sessions.', 'success');
            }
          }
        )
        .subscribe();

      // Subscribe to notifications
      supabase.channel(`notifications:${$user?.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${$user?.id}`
          },
          (payload: { new: { message: string } }) => {
            toast.show(payload.new.message, 'info');
          }
        )
        .subscribe();

      toast.show('Booking request sent successfully!', 'success');
      bookingDialog?.close();

      // Reset form
      selectedTopic = '';
      selectedDateTime = '';
      selectedDuration = 60;
      message = '';

    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'An error occurred', 'error');
    } finally {
      isSubmitting = false;
    }
  }

  onDestroy(() => {
    // Clean up subscriptions
    supabase.removeAllChannels();
  });
</script>

<div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200 border border-gray-100">
  <div class="flex items-start space-x-4">
    <!-- Avatar -->
    <div class="flex-shrink-0">
      <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
        {mentor.avatar || mentor.name.charAt(0).toUpperCase()}
      </div>
    </div>
    
    <!-- Mentor Info -->
    <div class="flex-1 min-w-0">
      <h3 class="text-lg font-semibold text-gray-900 mb-1">{mentor.name}</h3>
      <p class="text-sm text-gray-600 mb-2">{mentor.department}</p>
      
      <!-- Skills -->
      <div class="flex flex-wrap gap-1 mb-3">
        {#each mentor.skills.slice(0, 3) as skill}
          <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
            {skill}
          </span>
        {/each}
        {#if mentor.skills.length > 3}
          <span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
            +{mentor.skills.length - 3} more
          </span>
        {/if}
      </div>
      
      <!-- Stats -->
      <div class="flex items-center space-x-4 text-sm text-gray-600 mb-4">
        <div class="flex items-center">
          <span class="text-yellow-500 mr-1">⭐</span>
          <span>{mentor.rating}</span>
        </div>
        <div class="flex items-center">
          <span class="text-blue-500 mr-1">👥</span>
          <span>{mentor.students} students</span>
        </div>

      </div>
      
      <!-- Bio Preview -->
      {#if mentor.bio}
        <p class="text-sm text-gray-600 mb-4 line-clamp-2">{mentor.bio}</p>
      {/if}
      
      <!-- Action Buttons -->
      <div class="flex space-x-2">
        <!-- View Profile Dialog -->
        <Dialog.Root>
          <Dialog.Trigger>
            <button class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
              View Profile
            </button>
          </Dialog.Trigger>
                     <Dialog.Content class="max-w-lg w-full mx-4">
             <Dialog.Header>
               <Dialog.Title>Mentor Profile</Dialog.Title>
               <Dialog.Description>
                 Detailed information about {mentor.name}'s expertise and experience
               </Dialog.Description>
             </Dialog.Header>
             
             <!-- Compact Profile Card -->
             <div class="py-4">
               <div class="bg-white rounded-lg border border-gray-200 p-4">
                 <!-- Profile Header - Compact -->
                 <div class="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-4">
                   <div class="flex-shrink-0">
                     <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                       {mentor.avatar || mentor.name.charAt(0).toUpperCase()}
                     </div>
                   </div>
                   
                   <div class="flex-1 text-center sm:text-left">
                     <h2 class="text-xl font-bold text-gray-900 mb-1">{mentor.name}</h2>
                     <p class="text-sm text-gray-600 mb-2">{mentor.department}</p>
                     
                     <!-- Compact Stats -->
                     <div class="flex flex-wrap justify-center sm:justify-start gap-4 text-xs">
                       <div class="flex items-center">
                         <span class="text-yellow-500 mr-1">⭐</span>
                         <span class="font-semibold">{mentor.rating}</span>
                       </div>
                       <div class="flex items-center">
                         <span class="text-blue-500 mr-1">👥</span>
                         <span class="font-semibold">{mentor.students}</span>
                       </div>

                     </div>
                   </div>
                 </div>
                 
                 <!-- Bio Section - Compact -->
                 {#if mentor.bio}
                   <div class="mb-4">
                     <h3 class="text-sm font-semibold text-gray-900 mb-2">About</h3>
                     <p class="text-sm text-gray-700 leading-relaxed">{mentor.bio}</p>
                   </div>
                 {/if}
                 
                 <!-- Skills Section - Compact -->
                 <div class="mb-4">
                   <h3 class="text-sm font-semibold text-gray-900 mb-2">Expertise & Skills</h3>
                   <div class="flex flex-wrap gap-1">
                     {#each mentor.skills as skill}
                       <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                         {skill}
                       </span>
                     {/each}
                   </div>
                 </div>
                 
                 <!-- Additional Info - Compact -->
                 <div class="space-y-3">
                   <div>
                     <h3 class="text-sm font-semibold text-gray-900 mb-1">Teaching Style</h3>
                     <p class="text-xs text-gray-700">
                       {mentor.teachingStyle || `${mentor.name} has not provided their teaching style yet.`}
                     </p>
                   </div>
                   
                   <div>
                     <h3 class="text-sm font-semibold text-gray-900 mb-1">Session Types</h3>
                     {#if mentor.sessionTypes && mentor.sessionTypes.length > 0}
                       <ul class="text-xs text-gray-700 space-y-0.5">
                         {#each mentor.sessionTypes as type}
                           <li>• {type}</li>
                         {/each}
                       </ul>
                     {:else}
                       <p class="text-xs text-gray-700">No session types specified yet.</p>
                     {/if}
                   </div>
                 </div>
               </div>
             </div>
            
            <!-- Dialog Actions -->
            <div class="flex justify-end space-x-2 pt-4">
              <Dialog.Close>
                <button class="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">
                  Close
                </button>
              </Dialog.Close>
              <Dialog.Close>
                <button class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                  Book Session
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Root>
        
                 <!-- Book Session Dialog -->
         <Dialog.Root bind:this={bookingDialog}>
           <Dialog.Trigger>
             <button 
               class="px-4 py-2 border border-gray-300 text-sm rounded-lg transition-colors {isBookingDisabled ? 'text-gray-400 bg-gray-100 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}"
               disabled={isBookingDisabled}
               title={isSelfBooking ? "You cannot book your own session" : $isMentorMode ? "Switch to mentee mode to book sessions" : ""}
             >
               {#if isSelfBooking}
                 Cannot Book Own Session
               {:else}
                 Book Session
               {/if}
             </button>
           </Dialog.Trigger>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Book a Session with {mentor.name}</Dialog.Title>
              <Dialog.Description>
                Schedule a mentoring session with {mentor.name} from {mentor.department}. 
                Choose your preferred time and topic for the session.
              </Dialog.Description>
            </Dialog.Header>
            
            <!-- Session Booking Form -->
            <form on:submit|preventDefault={handleBookSession} class="space-y-4 py-4">
              <div>
                <label for="session-topic" class="block text-sm font-medium text-gray-700 mb-2">
                  Session Topic
                </label>
                <select 
                  id="session-topic" 
                  bind:value={selectedTopic}
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a topic</option>
                  {#each mentor.skills as skill}
                    <option value={skill}>{skill}</option>
                  {/each}
                  <option value="other">Other (specify in message)</option>
                </select>
              </div>
              
              <div>
                <label for="session-datetime" class="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Date & Time
                </label>
                <input 
                  id="session-datetime"
                  type="datetime-local"
                  bind:value={selectedDateTime}
                  min={minDateTime}
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label for="session-duration" class="block text-sm font-medium text-gray-700 mb-2">
                  Session Duration
                </label>
                <select 
                  id="session-duration"
                  bind:value={selectedDuration}
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="90">1.5 hours</option>
                  <option value="120">2 hours</option>
                </select>
              </div>
              
              <div>
                <label for="session-message" class="block text-sm font-medium text-gray-700 mb-2">
                  Message (Optional)
                </label>
                <textarea 
                  id="session-message"
                  bind:value={message}
                  placeholder="Describe what you'd like to work on or any specific questions..."
                  rows="3"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>
            
              <!-- Dialog Actions -->
              <div class="flex justify-end space-x-2 pt-4">
                <Dialog.Close>
                  <button 
                    type="button"
                    class="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </Dialog.Close>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Booking...' : 'Book Session'}
                </button>
              </div>
            </form>
          </Dialog.Content>
         </Dialog.Root>
      </div>
    </div>
  </div>
</div>
