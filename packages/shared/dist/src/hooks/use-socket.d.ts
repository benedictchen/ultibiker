import { Socket } from 'socket.io-client';
interface UseSocketOptions {
    url?: string;
    autoConnect?: boolean;
    reconnection?: boolean;
    reconnectionAttempts?: number;
    reconnectionDelay?: number;
}
export declare function useSocket(options?: UseSocketOptions): {
    socket: Socket | null;
    connected: boolean;
    connecting: boolean;
    error: string | null;
    reconnectAttempts: number;
    connect: () => void;
    disconnect: () => void;
    emit: (event: string, data?: any) => boolean;
    on: (event: string, handler: (...args: any[]) => void) => () => void;
};
export declare function useSensorSocket(): {
    connected: boolean;
    startScanning: () => boolean;
    stopScanning: () => boolean;
    connectDevice: (deviceId: string) => boolean;
    disconnectDevice: (deviceId: string) => boolean;
    requestDeviceInfo: (deviceId: string) => boolean;
};
export {};
