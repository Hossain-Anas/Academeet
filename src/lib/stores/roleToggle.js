import { writable } from 'svelte/store';

// Create a writable store for the role toggle
// false = mentee, true = mentor
export const isMentorMode = writable(false);

// Function to toggle between mentor and mentee mode
export function toggleRole() {
    isMentorMode.update(current => !current);
}

// Function to set specific role
export function setRole(isMentor) {
    isMentorMode.set(isMentor);
}
