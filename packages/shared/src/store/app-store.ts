import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: {
    enabled: boolean;
    sound: boolean;
    desktop: boolean;
  };
  charts: {
    updateInterval: number; // ms
    maxDataPoints: number;
    smoothing: boolean;
  };
  units: {
    speed: 'kmh' | 'mph';
    distance: 'km' | 'mi';
    temperature: 'c' | 'f';
    weight: 'kg' | 'lbs';
  };
}

interface UIState {
  sidebarOpen: boolean;
  activeView: string;
  errors: Array<{
    id: string;
    message: string;
    type: 'error' | 'warning' | 'info';
    timestamp: number;
  }>;
  isLoading: boolean;
  loadingMessage?: string;
}

interface AppState extends UIState {
  settings: AppSettings;
  
  // UI Actions
  setSidebarOpen: (open: boolean) => void;
  setActiveView: (view: string) => void;
  addError: (message: string, type?: 'error' | 'warning' | 'info') => void;
  removeError: (id: string) => void;
  clearErrors: () => void;
  setLoading: (loading: boolean, message?: string) => void;
  
  // Settings Actions
  updateSettings: (settings: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

const defaultSettings: AppSettings = {
  theme: 'system',
  language: 'en',
  notifications: {
    enabled: true,
    sound: true,
    desktop: true,
  },
  charts: {
    updateInterval: 1000,
    maxDataPoints: 300,
    smoothing: true,
  },
  units: {
    speed: 'kmh',
    distance: 'km',
    temperature: 'c',
    weight: 'kg',
  },
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      settings: defaultSettings,
      sidebarOpen: false,
      activeView: 'dashboard',
      errors: [],
      isLoading: false,
      loadingMessage: undefined,

      // UI Actions
      setSidebarOpen: (open: boolean) => {
        set({ sidebarOpen: open });
      },

      setActiveView: (view: string) => {
        set({ activeView: view });
      },

      addError: (message: string, type: 'error' | 'warning' | 'info' = 'error') => {
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const error = {
          id,
          message,
          type,
          timestamp: Date.now(),
        };

        set(state => ({
          errors: [...state.errors, error],
        }));

        // Auto-remove after 5 seconds for non-error types
        if (type !== 'error') {
          setTimeout(() => {
            set(state => ({
              errors: state.errors.filter(e => e.id !== id),
            }));
          }, 5000);
        }
      },

      removeError: (id: string) => {
        set(state => ({
          errors: state.errors.filter(e => e.id !== id),
        }));
      },

      clearErrors: () => {
        set({ errors: [] });
      },

      setLoading: (loading: boolean, message?: string) => {
        set({ isLoading: loading, loadingMessage: message });
      },

      // Settings Actions
      updateSettings: (newSettings: Partial<AppSettings>) => {
        set(state => ({
          settings: {
            ...state.settings,
            ...newSettings,
          },
        }));
      },

      resetSettings: () => {
        set({ settings: defaultSettings });
      },
    }),
    {
      name: 'ultibiker-app-store',
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);

// Selectors
export const selectSettings = (state: AppState) => state.settings;
export const selectTheme = (state: AppState) => state.settings.theme;
export const selectUnits = (state: AppState) => state.settings.units;
export const selectErrors = (state: AppState) => state.errors;
export const selectIsLoading = (state: AppState) => state.isLoading;