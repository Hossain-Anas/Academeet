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
  let isTimeSlotValid = true;
  let isBookingSuccess = false;
  let bookingChannel: any;

  // Get minimum date-time (now + 30 minutes to allow for processing)
  $: minDateTime = (() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    return now.toISOString().slice(0, 16);
  })();

  // Check time slot whenever datetime or duration changes
  $: {
    if (selectedDateTime && selectedDuration) {
      isTimeSlotValid = false; // Set to false while checking
      checkExistingBookings(selectedDateTime, selectedDuration).then(result => {
        isTimeSlotValid = !result.hasConflict;
        if (result.hasConflict) {
          toast.show(result.error || 'Time slot not available', 'warning');
        }
      });
    } else {
      isTimeSlotValid = false; // Default to invalid if no date/time selected
    }
  }

  onDestroy(() => {
    // Clean up subscriptions
    if (bookingChannel) bookingChannel.unsubscribe();
  });

  // FIXED: Consistent timezone conversion functions
  
  // Convert BD time input to UTC for database storage
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

  // Convert UTC to BD time for display
  function utcToBD(utcDateTime: string | Date): string {
    const utcDate = typeof utcDateTime === 'string' ? new Date(utcDateTime) : utcDateTime;
    
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    return formatter.format(utcDate) + ' BDT';
  }



  async function checkExistingBookings(startTime: string, duration: number): Promise<{ hasConflict: boolean; error?: string }> {
    try {
      // Parse the selected time as BD time and convert to UTC for comparison
      const selectedStartUTC = bdToUTC(startTime);
      const now = new Date();
      
      if (selectedStartUTC <= now) {
        return { hasConflict: true, error: 'Cannot book sessions in the past' };
      }

      // Calculate the new session time range in UTC
      const newSessionStart = selectedStartUTC;
      const newSessionEnd = new Date(newSessionStart.getTime() + duration * 60000);
      
      console.log('New session time range (UTC):', {
        start: newSessionStart.toISOString(),
        end: newSessionEnd.toISOString(),
        startBD: utcToBD(newSessionStart),
        endBD: utcToBD(newSessionEnd)
      });

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
              error: `You already have a ${sessionStatus} session with ${mentorName} from ${utcToBD(existingStart)} to ${utcToBD(existingEnd)}`
            };
          }
        }
      }

      // Check mentor's existing bookings
      const { data: mentorBookings, error: mentorError } = await supabase
        .from('bookings')
        .select('*, mentee:users!bookings_mentee_id_fkey (name)')
        .eq('mentor_id', mentor.user_id)
        .in('status', ['Pending', 'Confirmed']);

      if (mentorError) throw mentorError;

      // Check for overlaps with mentor's existing bookings
      if (mentorBookings && mentorBookings.length > 0) {
        for (const booking of mentorBookings) {
          const existingStart = new Date(booking.session_time);
          const existingEnd = new Date(existingStart.getTime() + booking.duration_minutes * 60000);
          
          if (hasTimeOverlap(newSessionStart, newSessionEnd, existingStart, existingEnd)) {
            return { 
              hasConflict: true, 
              error: `${mentor.name} has another session scheduled from ${utcToBD(existingStart)} to ${utcToBD(existingEnd)}`
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

  // Helper function to check if two time ranges overlap
  function hasTimeOverlap(
    start1: Date, 
    end1: Date, 
    start2: Date, 
    end2: Date
  ): boolean {
    const overlap = start1 < end2 && start2 < end1;
    
    console.log('Checking overlap:', {
      range1: `${start1.toISOString()} - ${end1.toISOString()}`,
      range2: `${start2.toISOString()} - ${end2.toISOString()}`,
      hasOverlap: overlap
    });
    
    return overlap;
  }

  // Updated form submission handler
  async function handleBookSession(event: Event) {
    event.preventDefault();
    
    try {
      if (!$user) {
        toast.show('Please log in to book a session', 'error');
        return;
      }

      if (!selectedTopic || !selectedDateTime || !selectedDuration) {
        toast.show('Please fill in all required fields', 'error');
        return;
      }

      // Double-check for conflicts before submission
      const conflictCheck = await checkExistingBookings(selectedDateTime, selectedDuration);
      if (conflictCheck.hasConflict) {
        toast.show(conflictCheck.error || 'Time slot is not available', 'error');
        return;
      }

      isSubmitting = true;
      
      // Convert BD time to UTC for database storage
      const utcDateTime = bdToUTC(selectedDateTime).toISOString();

      console.log('Booking details:', {
        selectedDateTime_BD: selectedDateTime,
        utcDateTime: utcDateTime,
        duration: selectedDuration
      });

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          mentee_id: $user.id,
          mentor_id: mentor.user_id,
          session_time: utcDateTime,
          duration_minutes: selectedDuration,
          status: 'Pending',
          topic: selectedTopic,
          message: message
        })
        .select(`
          booking_id,
          mentee_id,
          mentor_id,
          session_time,
          duration_minutes,
          status,
          topic,
          message,
          mentee:users!bookings_mentee_id_fkey (
            name,
            email
          ),
          mentor:users!bookings_mentor_id_fkey (
            name,
            email
          )
        `)
        .single();

      if (bookingError) {
        console.error('Booking request failed:', bookingError);
        throw new Error(bookingError.message || 'Failed to book session');
      }

      // Create notifications with proper time formatting
      const menteeName = (booking.mentee as any)?.name || 'Unknown';
      const mentorName = (booking.mentor as any)?.name || 'Unknown';
      const bdTimeFormatted = utcToBD(utcDateTime);
      
      const notifications = [
        {
          user_id: mentor.user_id,
          message: `New session request from ${menteeName} for ${selectedTopic} on ${bdTimeFormatted}`,
          type: 'Booking',
          is_read: false
        },
        {
          user_id: $user?.id,
          message: `Session request sent to ${mentorName} for ${selectedTopic} at ${bdTimeFormatted}. Awaiting confirmation.`,
          type: 'Booking',
          is_read: false
        }
      ];

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notificationError) throw notificationError;

      // Set up real-time subscription for booking updates
      bookingChannel = supabase
        .channel(`booking:${booking.booking_id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'bookings',
            filter: `booking_id=eq.${booking.booking_id}`
          },
          (payload: { new: { status: string } }) => {
            console.log('Booking status changed:', payload);
            if (payload.new.status === 'Confirmed') {
              toast.show('Session confirmed! Check your upcoming sessions.', 'success');
            }
          }
        )
        .subscribe();

      isBookingSuccess = true;
      toast.show('Session booked successfully! Check your upcoming schedules.', 'success');

    } catch (error) {
      console.error('Booking error:', error);
      toast.show(error instanceof Error ? error.message : 'An error occurred', 'error');
    } finally {
      isSubmitting = false;
    }
  }
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
            </div>
          </Dialog.Content>
        </Dialog.Root>
        
                 <!-- Book Session Dialog -->
        <Dialog.Root 
          onOpenChange={(open: boolean) => { 
            if (!open) {
              isSubmitting = false;
            } else {
              // Reset form and validation when dialog opens
              selectedTopic = '';
              selectedDateTime = '';
              selectedDuration = 60;
              message = '';
              isTimeSlotValid = true;
            }
          }}>
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
                  Preferred Date & Time (Bangladesh Time)
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
              
              <!-- Success Message -->
              {#if isBookingSuccess}
                <div class="flex flex-col items-center justify-center py-4 space-y-4">
                  <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <span class="text-2xl text-green-600">✓</span>
                  </div>
                  <h3 class="text-lg font-semibold text-gray-900">Booking Successful!</h3>
                  <p class="text-sm text-gray-600 text-center">
                    Your session has been booked successfully. You can view the details in your upcoming schedules.
                  </p>
            </div>
              {:else}
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
                    disabled={isSubmitting || !isTimeSlotValid || !selectedDateTime || !selectedDuration}
                    class="px-4 py-2 text-white text-sm rounded-lg transition-colors disabled:opacity-50 {isTimeSlotValid && selectedDateTime && selectedDuration ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400'}"
                  >
                    {isSubmitting ? 'Booking...' : 
                      !selectedDateTime || !selectedDuration ? 'Select Date & Time' :
                      !isTimeSlotValid ? (selectedDateTime && selectedDuration ? 'Time Slot Not Available - Check Schedule' : 'Time Slot Not Available') : 
                      'Book Session'}
              </button>
            </div>
              {/if}
            </form>
                     </Dialog.Content>
         </Dialog.Root>
      </div>
    </div>
  </div>
</div>