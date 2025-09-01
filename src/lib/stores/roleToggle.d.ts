declare module '$lib/stores/roleToggle.js' {
  import { WritableStore } from 'svelte/store';

  export const isMentorMode: WritableStore<boolean>;
  export function toggleRole(): void;
  export function setRole(isMentor: boolean): void;
}
