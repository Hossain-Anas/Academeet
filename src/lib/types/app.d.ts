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

declare module '$app/environment' {
  export const browser: boolean;
  export const dev: boolean;
  export const building: boolean;
  export const version: string;
}

declare module '$app/paths' {
  export const base: string;
  export const assets: string;
}
