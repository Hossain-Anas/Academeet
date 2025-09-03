import { writable, derived, get } from 'svelte/store';
import { supabase } from '$lib/supabaseClient';
import { user as authUser } from './auth';

// Types
export interface UserProfile {
  user_id: string;
  name: string;
  email: string;
  department: string;
  semester: string;
  skills: string[];
  interests: string[];
  learning_interests: string[];
  teaching_style: string;
  session_types: string[];
  is_mentor: boolean;
  created_at: string;
  updated_at: string;
}

export interface MentorAvailability {
  availability_id: string;
  mentor_id: string;
  day_of_week: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface UserStats {
  totalBookings: number;
  totalReviews: number;
  totalRequests: number;
  averageRating: string;
}

export interface UserFilters {
  department?: string;
  skills?: string[];
}

export interface UserState {
  profile: UserProfile | null;
  preferences: any | null;
  isMentor: boolean;
  isLoading: boolean;
  error: string | null;
}

// Create the user store
export const userStore = writable<UserState>({
  profile: null,
  preferences: null,
  isMentor: false,
  isLoading: false,
  error: null
});

// User management methods
export const userManager = {
  // Get user profile
  async getProfile(userId: string): Promise<{ data: UserProfile | null; error: any }> {
    try {
      console.log('Getting profile for user:', userId);
      userStore.update(state => ({ ...state, isLoading: true }));
      
      // First check if the user exists in the users table
      console.log('Querying Supabase users table...');
      const query = supabase
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      console.log('Query built:', query);
      
      const { data, error } = await query;
      
      console.log('Supabase query result:', { 
        data, 
        error,
        errorDetails: error ? {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        } : null
      });

      if (error) {
        if (error.code === 'PGRST116') {
          // No profile found, create one with default values
          console.log('No profile found, creating new profile');
          const { data: authData } = await supabase.auth.getUser(userId);
          const user = authData?.user;
          
          if (!user) throw new Error('User not found');

          const newProfile = {
            user_id: userId,
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
            email: user.email || '',
            department: user.user_metadata?.department || '',
            semester: user.user_metadata?.semester || '',
            skills: user.user_metadata?.skills || [],
            interests: user.user_metadata?.interests || [],
            is_mentor: user.user_metadata?.is_mentor || false
          };

          console.log('Creating profile with data:', newProfile);

          const { data: createdProfile, error: createError } = await supabase
            .from('users')
            .insert([newProfile])
            .select()
            .single();

          if (createError) throw createError;

          console.log('Profile created successfully:', createdProfile);

          userStore.update(state => ({
            ...state,
            profile: createdProfile,
            isMentor: createdProfile.is_mentor || false,
            isLoading: false,
            error: null
          }));

          return { data: createdProfile, error: null };
        }
        throw error;
      }

      console.log('Profile found:', data);

      userStore.update(state => ({
        ...state,
        profile: data,
        isMentor: data.is_mentor || false,
        isLoading: false,
        error: null
      }));

      // Role toggle will be initialized separately to avoid circular dependency

      return { data, error: null };
    } catch (error) {
      console.error('Error getting/creating profile:', error);
      userStore.update(state => ({
        ...state,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
      return { data: null, error };
    }
  },

  // Update user profile
  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<{ data: UserProfile | null; error: any }> {
    try {
      userStore.update(state => ({ ...state, isLoading: true }));
      
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      userStore.update(state => ({
        ...state,
        profile: data,
        isMentor: data.is_mentor || false,
        isLoading: false,
        error: null
      }));

      // Role toggle will be initialized separately to avoid circular dependency

      return { data, error: null };
    } catch (error) {
      userStore.update(state => ({
        ...state,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
      return { data: null, error };
    }
  },

  // Toggle mentor role
  async toggleMentorRole(userId: string): Promise<{ data: UserProfile | null; error: any }> {
    try {
      userStore.update(state => ({ ...state, isLoading: true }));
      
      const currentProfile = get(userStore).profile;
      if (!currentProfile) throw new Error('No profile found');
      
      const newMentorStatus = !currentProfile.is_mentor;

      const { data, error } = await supabase
        .from('users')
        .update({ is_mentor: newMentorStatus })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      userStore.update(state => ({
        ...state,
        profile: data,
        isMentor: data.is_mentor,
        isLoading: false,
        error: null
      }));

      // Role toggle will be initialized separately to avoid circular dependency

      return { data, error: null };
    } catch (error) {
      userStore.update(state => ({
        ...state,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
      return { data: null, error };
    }
  },

  // Get mentor availability
  async getMentorAvailability(userId: string): Promise<{ data: MentorAvailability[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('mentor_availability')
        .select('*')
        .eq('mentor_id', userId)
        .order('day_of_week', { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Update mentor availability
  async updateMentorAvailability(userId: string, availability: Omit<MentorAvailability, 'availability_id' | 'mentor_id' | 'created_at'>[]): Promise<{ data: MentorAvailability[] | null; error: any }> {
    try {
      // First, delete existing availability
      const { error: deleteError } = await supabase
        .from('mentor_availability')
        .delete()
        .eq('mentor_id', userId);

      if (deleteError) throw deleteError;

      // Then insert new availability
      if (availability && availability.length > 0) {
        const availabilityWithMentorId = availability.map(slot => ({
          ...slot,
          mentor_id: userId
        }));

        const { data, error } = await supabase
          .from('mentor_availability')
          .insert(availabilityWithMentorId)
          .select();

        if (error) throw error;
        return { data, error: null };
      }

      return { data: [], error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Get user statistics
  async getUserStats(userId: string): Promise<{ data: UserStats | null; error: any }> {
    try {
      const [bookings, reviews, requests] = await Promise.all([
        supabase
          .from('bookings')
          .select('*')
          .or(`mentee_id.eq.${userId},mentor_id.eq.${userId}`),
        supabase
          .from('reviews')
          .select('*')
          .or(`reviewer_id.eq.${userId},reviewed_user_id.eq.${userId}`),
        supabase
          .from('help_requests')
          .select('*')
          .eq('mentee_id', userId)
      ]);

      const stats: UserStats = {
        totalBookings: bookings.data?.length || 0,
        totalReviews: reviews.data?.length || 0,
        totalRequests: requests.data?.length || 0,
        averageRating: '0'
      };

      // Calculate average rating if user has reviews
      if (reviews.data && reviews.data.length > 0) {
        const userReviews = reviews.data.filter(review => 
          review.reviewed_user_id === userId
        );
        if (userReviews.length > 0) {
          const totalRating = userReviews.reduce((sum, review) => sum + review.rating, 0);
          stats.averageRating = (totalRating / userReviews.length).toFixed(1);
        }
      }

      return { data: stats, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Search users (for finding mentors)
  async searchUsers(filters: UserFilters = {}): Promise<{ data: UserProfile[] | null; error: any }> {
    try {
      let query = supabase
        .from('users')
        .select('*')
        .eq('is_mentor', true);

      if (filters.department) {
        query = query.eq('department', filters.department);
      }

      if (filters.skills && filters.skills.length > 0) {
        query = query.contains('skills', filters.skills);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Clear user data (for logout)
  clearUserData(): void {
    userStore.set({
      profile: null,
      preferences: null,
      isMentor: false,
      isLoading: false,
      error: null
    });
  }
};

// Track if we're currently loading a profile and for which user
let currentLoadingUserId: string | null = null;

// Track the last loaded profile ID to prevent duplicate loads
let lastLoadedProfileId: string | null = null;

// Initialize user profile when auth user changes
authUser.subscribe(async (currentUser) => {
  const userId = currentUser?.id || null;
  console.log('Auth user changed:', userId || 'null');
  
  if (userId) {
    // Skip if we've already loaded this profile
    if (lastLoadedProfileId === userId) {
      console.log('Profile already loaded for user:', userId);
      return;
    }

    // Skip if we're already loading this profile
    if (currentLoadingUserId === userId) {
      console.log('Profile load already in progress for user:', userId);
      return;
    }

    // Start loading the profile
    currentLoadingUserId = userId;
    console.log('Loading profile for user:', userId);
    
    try {
      userStore.update(state => ({ ...state, isLoading: true }));
      const { data: profile, error } = await userManager.getProfile(userId);
      
      if (error) {
        console.error('Failed to load profile:', error);
        userStore.update(state => ({
          ...state,
          error: error instanceof Error ? error.message : 'Failed to load profile',
          isLoading: false
        }));
      } else {
        console.log('Profile loaded successfully:', profile?.name);
        userStore.update(state => ({
          ...state,
          profile,
          isMentor: profile?.is_mentor || false,
          isLoading: false,
          error: null
        }));
        lastLoadedProfileId = userId;
      }
    } catch (error) {
      console.error('Error in profile loading:', error);
      userStore.update(state => ({
        ...state,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Error loading profile'
      }));
    } finally {
      // Only clear the loading flag if we're still loading the same user
      if (currentLoadingUserId === userId) {
        currentLoadingUserId = null;
      }
    }
  } else {
    console.log('No auth user, clearing user data');
    currentLoadingUserId = null;
    lastLoadedProfileId = null;
    userManager.clearUserData();
  }
});

// Export individual store values for easy access
export const profile = derived(userStore, $userStore => $userStore.profile);
export const preferences = derived(userStore, $userStore => $userStore.preferences);
export const isMentor = derived(userStore, $userStore => $userStore.isMentor);
export const userLoading = derived(userStore, $userStore => $userStore.isLoading);
export const userError = derived(userStore, $userStore => $userStore.error);
