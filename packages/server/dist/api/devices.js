import { Router } from 'express';
export function createDeviceRoutes(sensorManager) {
    const router = Router();
    // Get all discovered devices
    router.get('/discovered', (req, res) => {
        try {
            const devices = sensorManager.getDiscoveredDevices();
            res.json({
                success: true,
                data: devices,
                count: devices.length
            });
        }
        catch (error) {
            console.error('Error getting discovered devices:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get discovered devices'
            });
        }
    });
    // Get all connected devices
    router.get('/connected', (req, res) => {
        try {
            const devices = sensorManager.getConnectedDevices();
            res.json({
                success: true,
                data: devices,
                count: devices.length
            });
        }
        catch (error) {
            console.error('Error getting connected devices:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get connected devices'
            });
        }
    });
    // Start device scanning
    router.post('/scan/start', async (req, res) => {
        try {
            await sensorManager.startScanning();
            res.json({
                success: true,
                message: 'Device scanning started'
            });
        }
        catch (error) {
            console.error('Error starting device scan:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to start device scanning'
            });
        }
    });
    // Stop device scanning
    router.post('/scan/stop', (req, res) => {
        try {
            sensorManager.stopScanning();
            res.json({
                success: true,
                message: 'Device scanning stopped'
            });
        }
        catch (error) {
            console.error('Error stopping device scan:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to stop device scanning'
            });
        }
    });
    // Connect to a device
    router.post('/:deviceId/connect', async (req, res) => {
        try {
            const { deviceId } = req.params;
            const success = await sensorManager.connectDevice(deviceId);
            if (success) {
                res.json({
                    success: true,
                    message: `Successfully connected to device ${deviceId}`
                });
            }
            else {
                res.status(400).json({
                    success: false,
                    error: `Failed to connect to device ${deviceId}`
                });
            }
        }
        catch (error) {
            console.error('Error connecting to device:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while connecting to device'
            });
        }
    });
    // Disconnect from a device
    router.post('/:deviceId/disconnect', async (req, res) => {
        try {
            const { deviceId } = req.params;
            const success = await sensorManager.disconnectDevice(deviceId);
            if (success) {
                res.json({
                    success: true,
                    message: `Successfully disconnected from device ${deviceId}`
                });
            }
            else {
                res.status(400).json({
                    success: false,
                    error: `Failed to disconnect from device ${deviceId}`
                });
            }
        }
        catch (error) {
            console.error('Error disconnecting from device:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error while disconnecting from device'
            });
        }
    });
    // Get device details
    router.get('/:deviceId', (req, res) => {
        try {
            const { deviceId } = req.params;
            // Check both discovered and connected devices
            const discoveredDevices = sensorManager.getDiscoveredDevices();
            const connectedDevices = sensorManager.getConnectedDevices();
            const allDevices = [...discoveredDevices, ...connectedDevices];
            const device = allDevices.find(d => d.deviceId === deviceId);
            if (device) {
                res.json({
                    success: true,
                    data: device
                });
            }
            else {
                res.status(404).json({
                    success: false,
                    error: `Device ${deviceId} not found`
                });
            }
        }
        catch (error) {
            console.error('Error getting device details:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get device details'
            });
        }
    });
    return router;
}
//# sourceMappingURL=devices.js.map