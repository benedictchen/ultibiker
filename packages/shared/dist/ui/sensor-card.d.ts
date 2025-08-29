import type { SensorDevice, SensorData } from '@ultibiker/core';
interface SensorCardProps {
    device: SensorDevice;
    data?: SensorData;
    connected?: boolean;
    onConnect?: (deviceId: string) => void;
    onDisconnect?: (deviceId: string) => void;
    className?: string;
}
export declare function SensorCard({ device, data, connected, onConnect, onDisconnect, className }: SensorCardProps): import("react/jsx-runtime").JSX.Element;
export {};
