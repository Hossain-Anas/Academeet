import { writable, derived, get } from 'svelte/store';
import { userStore } from './user';

// Types
export type MentorMode = boolean; // false = mentee, true = mentor

// Create a writable store for the role toggle
export const isMentorMode = writable<MentorMode>(false);

// Derived store to check if the user can toggle to mentor mode
export const canToggleToMentor = derived(
  userStore,
  ($userStore) => {
    // User can toggle to mentor mode only if they have mentor privileges
    return $userStore?.profile?.is_mentor === true;
  }
);

// Derived store to check if the toggle should be enabled
export const isToggleEnabled = derived(
  userStore,
  ($userStore) => {
    // Toggle is enabled if user has mentor privileges
    return $userStore?.profile?.is_mentor === true;
  }
);

// Function to toggle between mentor and mentee mode (only if user has mentor privileges)
export function toggleRole(): void {
  try {
    const currentUserStore = get(userStore);
    
    // Only allow toggle if user has mentor privileges
    if (currentUserStore?.profile?.is_mentor === true) {
      isMentorMode.update(current => !current);
    }
  } catch (error) {
    console.warn('Cannot toggle role - userStore not ready:', error);
  }
}

// Function to set specific role (only if user has mentor privileges)
export function setRole(isMentor: MentorMode): void {
  try {
    const currentUserStore = get(userStore);
    
    // Only allow setting mentor mode if user has mentor privileges
    if (isMentor && currentUserStore?.profile?.is_mentor !== true) {
      console.warn('User does not have mentor privileges');
      return;
    }
    
    isMentorMode.set(isMentor);
  } catch (error) {
    console.warn('Cannot set role - userStore not ready:', error);
  }
}

// Function to initialize role based on user profile
export function initializeRole(): void {
  try {
    const currentUserStore = get(userStore);
    
    if (currentUserStore?.profile) {
      // Start in mentee mode by default
      isMentorMode.set(false);
    }
  } catch (error) {
    console.warn('Cannot initialize role - userStore not ready:', error);
  }
}
