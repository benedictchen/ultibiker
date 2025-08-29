import { EventEmitter } from 'events';
export interface PermissionStatus {
    granted: boolean;
    denied: boolean;
    requiresUserAction: boolean;
    message: string;
    instructions?: string[];
}
export interface DevicePermissions {
    bluetooth: PermissionStatus;
    usb: PermissionStatus;
    camera?: PermissionStatus;
    microphone?: PermissionStatus;
}
export declare class PermissionManager extends EventEmitter {
    private platform;
    private permissions;
    constructor();
    checkAllPermissions(): Promise<DevicePermissions>;
    checkBluetoothPermissions(): Promise<PermissionStatus>;
    private checkMacOSBluetoothPermissions;
    private checkLinuxBluetoothPermissions;
    private checkWindowsBluetoothPermissions;
    checkUSBPermissions(): Promise<PermissionStatus>;
    private checkMacOSUSBPermissions;
    private checkLinuxUSBPermissions;
    private checkWindowsUSBPermissions;
    requestNativeBluetoothPermission(): Promise<PermissionStatus>;
    requestBluetoothPermission(): Promise<PermissionStatus>;
    getPermissionSummary(): string;
    getDetailedReport(): string[];
    createPermissionGuide(): Promise<string>;
}
