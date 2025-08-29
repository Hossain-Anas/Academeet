<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { isMentorMode } from '$lib/stores/roleToggle.js';
  
  export let mentor = {
    name: '',
    department: '',
    skills: [] as string[],
    rating: 0,
    students: 0,
    avatar: '',
    experience: '',
    bio: ''
  };
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
        <div class="flex items-center">
          <span class="text-green-500 mr-1">📚</span>
          <span>{mentor.experience}</span>
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
                       <div class="flex items-center">
                         <span class="text-green-500 mr-1">📚</span>
                         <span class="font-semibold">{mentor.experience}</span>
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
                       {mentor.name} focuses on practical, hands-on learning with real-world examples. 
                       Sessions are interactive and tailored to individual student needs.
                     </p>
                   </div>
                   
                   <div>
                     <h3 class="text-sm font-semibold text-gray-900 mb-1">Session Types</h3>
                     <ul class="text-xs text-gray-700 space-y-0.5">
                       <li>• One-on-one tutoring sessions</li>
                       <li>• Project-based learning</li>
                       <li>• Code review and debugging</li>
                       <li>• Career guidance and advice</li>
                     </ul>
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
         <Dialog.Root>
           <Dialog.Trigger>
             <button 
               class="px-4 py-2 border border-gray-300 text-sm rounded-lg transition-colors {$isMentorMode ? 'text-gray-400 bg-gray-100 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}"
               disabled={$isMentorMode}
             >
               Book Session
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
            <div class="space-y-4 py-4">
              <div>
                <label for="session-topic" class="block text-sm font-medium text-gray-700 mb-2">
                  Session Topic
                </label>
                <select id="session-topic" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
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
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label for="session-duration" class="block text-sm font-medium text-gray-700 mb-2">
                  Session Duration
                </label>
                <select id="session-duration" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="30">30 minutes</option>
                  <option value="60" selected>1 hour</option>
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
                  placeholder="Describe what you'd like to work on or any specific questions..."
                  rows="3"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>
            </div>
            
            <!-- Dialog Actions -->
            <div class="flex justify-end space-x-2 pt-4">
              <Dialog.Close>
                <button class="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
              </Dialog.Close>
              <button class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                Book Session
              </button>
            </div>
                     </Dialog.Content>
         </Dialog.Root>
      </div>
    </div>
  </div>
</div>
