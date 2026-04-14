import { create } from 'zustand';
import type { Defect, Component, User } from './types';

interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  setAuth: (user: User | null, token: string | null) => void;
  logout: () => void;

  // Defects
  defects: Defect[];
  setDefects: (d: Defect[]) => void;
  selectedDefect: Defect | null;
  setSelectedDefect: (d: Defect | null) => void;

  // Components
  components: Component[];
  setComponents: (c: Component[]) => void;
  selectedComponent: Component | null;
  setSelectedComponent: (c: Component | null) => void;

  // UI
  activeFloor: string;
  setActiveFloor: (f: string) => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useStore = create<AppState>((set) => ({
  // Auth
  user: null,
  token: localStorage.getItem('token'),
  setAuth: (user, token) => {
    if (token) localStorage.setItem('token', token);
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },

  // Defects
  defects: [],
  setDefects: (defects) => set({ defects }),
  selectedDefect: null,
  setSelectedDefect: (selectedDefect) => set({ selectedDefect }),

  // Components
  components: [],
  setComponents: (components) => set({ components }),
  selectedComponent: null,
  setSelectedComponent: (selectedComponent) => set({ selectedComponent }),

  // UI
  activeFloor: '1F',
  setActiveFloor: (activeFloor) => set({ activeFloor }),
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
