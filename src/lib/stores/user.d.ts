declare module '$lib/stores/user.js' {
  import { WritableStore, ReadableStore } from 'svelte/store';

  export interface UserState {
    profile: any | null;
    preferences: any | null;
    isMentor: boolean;
    isLoading: boolean;
    error: string | null;
  }

  export interface UserManager {
    getProfile(userId: string): Promise<{ data: any; error: any }>;
    updateProfile(userId: string, updates: any): Promise<{ data: any; error: any }>;
    toggleMentorRole(userId: string): Promise<{ data: any; error: any }>;
    getMentorAvailability(userId: string): Promise<{ data: any; error: any }>;
    updateMentorAvailability(userId: string, availability: any[]): Promise<{ data: any; error: any }>;
    getUserStats(userId: string): Promise<{ data: any; error: any }>;
    searchUsers(filters?: any): Promise<{ data: any; error: any }>;
    clearUserData(): void;
  }

  export const userStore: WritableStore<UserState>;
  export const userManager: UserManager;
  export const profile: ReadableStore<any | null>;
  export const preferences: ReadableStore<any | null>;
  export const isMentor: ReadableStore<boolean>;
  export const userLoading: ReadableStore<boolean>;
  export const userError: ReadableStore<string | null>;
}
