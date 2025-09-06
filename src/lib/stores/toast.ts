import { writable } from 'svelte/store';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastMessage {
  message: string;
  type: ToastType;
  id: number;
}

function createToastStore() {
  const { subscribe, update } = writable<ToastMessage[]>([]);
  let nextId = 1;

  function show(message: string, type: ToastType = 'info', duration: number = 3000) {
    const id = nextId++;
    const toast = { message, type, id };

    update(toasts => [...toasts, toast]);

    if (duration > 0) {
      setTimeout(() => {
        remove(id);
      }, duration);
    }
  }

  function remove(id: number) {
    update(toasts => toasts.filter(t => t.id !== id));
  }

  return {
    subscribe,
    show,
    remove
  };
}

export const toast = createToastStore();


