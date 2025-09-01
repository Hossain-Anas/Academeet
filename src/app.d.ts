// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

declare module '$app/navigation' {
	export function goto(url: string, options?: { replaceState?: boolean }): void;
	export function invalidate(url: string): Promise<void>;
	export function invalidateAll(): Promise<void>;
	export function preload(url: string): Promise<void>;
	export function preloadData(url: string): Promise<void>;
}

declare module '$app/stores' {
	export const page: any;
	export const navigating: any;
	export const updated: any;
}

// Vite environment variables
interface ImportMetaEnv {
	readonly PUBLIC_SUPABASE_URL: string
	readonly PUBLIC_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}

export {};
