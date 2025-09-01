import { writable, derived, get } from 'svelte/store';
import { supabase } from '$lib/supabaseClient';

// Types
export interface User {
  id: string;
  email?: string;
  user_metadata?: {
    name?: string;
    department?: string;
    semester?: string;
    skills?: string[];
    interests?: string[];
    is_mentor?: boolean;
  };
}

export interface Session {
  user: User;
  access_token: string;
  refresh_token: string;
  expires_at?: number;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface UserData {
  name: string;
  email: string;
  department: string;
  semester: string;
  skills?: string[];
  interests?: string[];
  is_mentor: boolean;
}

export interface AuthResponse {
  data: { user: User | null; session: Session | null } | null;
  error: any;
}

// Create the auth store
export const authStore = writable<AuthState>({
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,
  error: null
});

// Authentication methods
export const auth = {
  // Sign up
  async signUp(email: string, password: string, userData: UserData): Promise<AuthResponse> {
    try {
      console.log('Attempting signup with:', { email, userData });
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });

      if (error) {
        console.error('Supabase auth error:', error);
        throw error;
      }

      console.log('Auth signup successful:', data);

      // Create user profile in users table
      if (data.user) {
        const profileData = {
          user_id: data.user.id,
          name: userData.name,
          email: userData.email,
          department: userData.department,
          semester: userData.semester,
          skills: userData.skills || [],
          interests: userData.interests || [],
          is_mentor: userData.is_mentor || false
        };
        
        console.log('Creating profile with:', profileData);
        
        const { error: profileError } = await supabase
          .from('users')
          .insert([profileData]);

        if (profileError) {
          console.error('Profile creation error:', profileError);
          throw profileError;
        }
        
        console.log('Profile created successfully');
      }

      return { data, error: null };
    } catch (error) {
      console.error('Signup error:', error);
      return { data: null, error };
    }
  },

  // Sign in
  async signIn(email: string, password: string): Promise<AuthResponse> {
    try {
      console.log('Attempting sign in for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Sign in error:', error);
        throw error;
      }

      console.log('Sign in successful:', data);

      // Update store
      authStore.update(state => ({
        ...state,
        user: data.user,
        session: data.session,
        isAuthenticated: !!data.user,
        isLoading: false,
        error: null
      }));

      // Profile loading is handled by the user store subscription

      return { data, error: null };
    } catch (error) {
      console.error('Sign in failed:', error);
      authStore.update(state => ({
        ...state,
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false
      }));
      return { data: null, error };
    }
  },

  // Sign out
  async signOut(): Promise<{ error: any }> {
    try {
      console.log('Starting sign out process...');
      
      // First sign out from Supabase to invalidate the session
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Clear all stores immediately
      authStore.set({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });

      // Clear user store
      const { userManager } = await import('./user');
      userManager.clearUserData();

      if (browser) {
        // Clear all storage
        console.log('Clearing all storage...');
        localStorage.clear();
        sessionStorage.clear();

        // Clear any cached data and force a full reload
        console.log('Forcing page reload...');
        window.location.replace('/auth/signin');
        
        // Prevent any navigation until reload
        window.onpopstate = () => {
          window.location.replace('/auth/signin');
        };
      }

      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      // Even if there's an error, try to force sign out
      if (browser) {
        localStorage.clear();
        sessionStorage.clear();
        window.location.replace('/auth/signin');
      }
      return { error };
    }
  },

  // Get current session
  async getSession(): Promise<{ session: Session | null; error: any }> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) throw error;

      console.log('Got session:', session);

      // Update store
      authStore.update(state => ({
        ...state,
        session,
        user: session?.user || null,
        isAuthenticated: !!session?.user,
        isLoading: false
      }));

      // Load user profile to initialize role toggle
      if (session?.user) {
        try {
          console.log('Loading profile for user:', session.user.id);
          const { userManager } = await import('./user');
          const { data: profile, error: profileError } = await userManager.getProfile(session.user.id);
          
          if (profileError) {
            console.error('Failed to load user profile:', profileError);
            throw profileError;
          }

          console.log('Loaded profile:', profile);
          
          // Initialize role toggle after profile is loaded
          const { initializeRole } = await import('./roleToggle');
          initializeRole();
        } catch (error) {
          console.error('Failed to load user profile:', error);
        }
      }

      return { session, error: null };
    } catch (error) {
      authStore.update(state => ({
        ...state,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
      return { session: null, error };
    }
  },

  // Listen to auth changes
  onAuthStateChange() {
    return supabase.auth.onAuthStateChange(async (event: string, session: Session | null) => {
      console.log('Auth state changed:', event, session);
      
      if (event === 'INITIAL_SESSION') {
        // Handle initial session state
        if (session) {
          authStore.update(state => ({
            ...state,
            user: session.user,
            session,
            isAuthenticated: true,
            isLoading: false,
            error: null
          }));
          
          // Load user profile to initialize role toggle
          if (session.user) {
            try {
              const { userManager } = await import('./user');
              await userManager.getProfile(session.user.id);
              
              // Initialize role toggle after profile is loaded
              const { initializeRole } = await import('./roleToggle');
              initializeRole();
            } catch (error) {
              console.error('Failed to load user profile:', error);
            }
          }
        } else {
          // No initial session - user is not authenticated
          authStore.update(state => ({
            ...state,
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          }));
        }
      } else if (event === 'SIGNED_IN' && session) {
        authStore.update(state => ({
          ...state,
          user: session.user,
          session,
          isAuthenticated: true,
          isLoading: false,
          error: null
        }));
        
        // Load user profile to initialize role toggle
        if (session.user) {
          try {
            const { userManager } = await import('./user');
            await userManager.getProfile(session.user.id);
            
            // Initialize role toggle after profile is loaded
            const { initializeRole } = await import('./roleToggle');
            initializeRole();
          } catch (error) {
            console.error('Failed to load user profile:', error);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        authStore.update(state => ({
          ...state,
          user: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        }));
      } else if (event === 'TOKEN_REFRESHED' && session) {
        authStore.update(state => ({
          ...state,
          session,
          user: session.user,
          isAuthenticated: true,
          isLoading: false
        }));
      }
    });
  },

  // Reset password
  async resetPassword(email: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  // Update password
  async updatePassword(newPassword: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  }
};

// Track if auth has been initialized
let isInitialized = false;

import { browser } from '$app/environment';

// Initialize auth state
export async function initializeAuth(): Promise<void> {
  // Prevent multiple initializations
  if (isInitialized) {
    console.log('Auth already initialized, skipping...');
    return;
  }

  try {
    console.log('Initializing auth...');
    
    // Set loading state
    authStore.update(state => ({
      ...state,
      isLoading: true
    }));

    // Only initialize auth on client-side
    if (browser) {
      // Start listening for auth changes first
      supabase.auth.onAuthStateChange(
        async (event, session) => {
          const userId = session?.user?.id;
          console.log('Auth state changed:', event, userId);
          
          // Skip update if nothing has changed
          const currentState = get(authStore);
          if (
            currentState.user?.id === userId &&
            currentState.isAuthenticated === !!userId &&
            !currentState.isLoading
          ) {
            console.log('Auth state unchanged, skipping update');
            return;
          }
          
          // Update store with session data
          authStore.update(state => ({
            ...state,
            user: session?.user || null,
            session,
            isAuthenticated: !!session?.user,
            isLoading: false,
            error: null
          }));
        }
      );

      // Then get the current session
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error getting session:', error);
        throw error;
      }
      
      const userId = session?.user?.id;
      console.log('Initial session loaded:', userId);
      
      // Skip update if nothing has changed
      const currentState = get(authStore);
      if (
        currentState.user?.id === userId &&
        currentState.isAuthenticated === !!userId &&
        !currentState.isLoading
      ) {
        console.log('Initial auth state unchanged, skipping update');
        return;
      }
      
      // Update store with session data
      authStore.update(state => ({
        ...state,
        user: session?.user || null,
        session,
        isAuthenticated: !!session?.user,
        isLoading: false,
        error: null
      }));
    } else {
      // On server-side, just set not loading and not authenticated
      console.log('Server-side initialization - skipping auth');
      authStore.update(state => ({
        ...state,
        isLoading: false,
        isAuthenticated: false
      }));
    }
    
    isInitialized = true;
    return;
  } catch (error) {
    console.error('Auth initialization failed:', error);
    // Make sure we're not stuck in loading state
    authStore.update(state => ({
      ...state,
      isLoading: false,
      error: error instanceof Error ? error.message : 'Failed to initialize auth'
    }));
    throw error;
  }
}

// Export individual store values for easy access
export const user = derived(authStore, $authStore => $authStore.user);
export const session = derived(authStore, $authStore => $authStore.session);
export const isAuthenticated = derived(authStore, $authStore => $authStore.isAuthenticated);
export const isLoading = derived(authStore, $authStore => $authStore.isLoading);
export const error = derived(authStore, $authStore => $authStore.error);
