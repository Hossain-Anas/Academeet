declare module '$lib/utils.js' {
  export function cn(...inputs: (string | undefined | null | false)[]): string;
  
  export interface WithElementRef<T> {
    ref?: T | null;
    class?: string;
    [key: string]: any;
  }
}

// Make HTMLFormAttributes more flexible for form props
declare global {
  namespace svelte.JSX {
    interface HTMLAttributes<T> {
      [key: string]: any;
    }
  }
}
