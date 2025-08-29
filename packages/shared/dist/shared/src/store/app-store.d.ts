interface AppSettings {
    theme: 'light' | 'dark' | 'system';
    language: string;
    notifications: {
        enabled: boolean;
        sound: boolean;
        desktop: boolean;
    };
    charts: {
        updateInterval: number;
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
    setSidebarOpen: (open: boolean) => void;
    setActiveView: (view: string) => void;
    addError: (message: string, type?: 'error' | 'warning' | 'info') => void;
    removeError: (id: string) => void;
    clearErrors: () => void;
    setLoading: (loading: boolean, message?: string) => void;
    updateSettings: (settings: Partial<AppSettings>) => void;
    resetSettings: () => void;
}
export declare const useAppStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<AppState>, "persist"> & {
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<AppState, {
            settings: AppSettings;
        }>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: AppState) => void) => () => void;
        onFinishHydration: (fn: (state: AppState) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<AppState, {
            settings: AppSettings;
        }>>;
    };
}>;
export declare const selectSettings: (state: AppState) => AppSettings;
export declare const selectTheme: (state: AppState) => "light" | "dark" | "system";
export declare const selectUnits: (state: AppState) => {
    speed: "kmh" | "mph";
    distance: "km" | "mi";
    temperature: "c" | "f";
    weight: "kg" | "lbs";
};
export declare const selectErrors: (state: AppState) => {
    id: string;
    message: string;
    type: "error" | "warning" | "info";
    timestamp: number;
}[];
export declare const selectIsLoading: (state: AppState) => boolean;
export {};
