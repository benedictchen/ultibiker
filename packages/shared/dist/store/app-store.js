import { create } from 'zustand';
import { persist } from 'zustand/middleware';
const defaultSettings = {
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
export const useAppStore = create()(persist((set, get) => ({
    // Initial state
    settings: defaultSettings,
    sidebarOpen: false,
    activeView: 'dashboard',
    errors: [],
    isLoading: false,
    loadingMessage: undefined,
    // UI Actions
    setSidebarOpen: (open) => {
        set({ sidebarOpen: open });
    },
    setActiveView: (view) => {
        set({ activeView: view });
    },
    addError: (message, type = 'error') => {
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
    removeError: (id) => {
        set(state => ({
            errors: state.errors.filter(e => e.id !== id),
        }));
    },
    clearErrors: () => {
        set({ errors: [] });
    },
    setLoading: (loading, message) => {
        set({ isLoading: loading, loadingMessage: message });
    },
    // Settings Actions
    updateSettings: (newSettings) => {
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
}), {
    name: 'ultibiker-app-store',
    partialize: (state) => ({ settings: state.settings }),
}));
// Selectors
export const selectSettings = (state) => state.settings;
export const selectTheme = (state) => state.settings.theme;
export const selectUnits = (state) => state.settings.units;
export const selectErrors = (state) => state.errors;
export const selectIsLoading = (state) => state.isLoading;
