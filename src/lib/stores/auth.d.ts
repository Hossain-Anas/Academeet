declare module '$lib/stores/auth.js' {
  import { WritableStore, ReadableStore } from 'svelte/store';

  export interface AuthState {
    user: any | null;
    session: any | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
  }

  export interface AuthMethods {
    signUp(email: string, password: string, userData: any): Promise<{ data: any; error: any }>;
    signIn(email: string, password: string): Promise<{ data: any; error: any }>;
    signOut(): Promise<{ error: any }>;
    getSession(): Promise<{ session: any; error: any }>;
    onAuthStateChange(): any;
    resetPassword(email: string): Promise<{ error: any }>;
    updatePassword(newPassword: string): Promise<{ error: any }>;
  }

  export const authStore: WritableStore<AuthState>;
  export const auth: AuthMethods;
  export const user: ReadableStore<any | null>;
  export const session: ReadableStore<any | null>;
  export const isAuthenticated: ReadableStore<boolean>;
  export const isLoading: ReadableStore<boolean>;
  export const error: ReadableStore<string | null>;
  
  export function initializeAuth(): Promise<void>;
}
