import { useState } from 'react';
import { useSensorStore, useSensorSocket, SensorCard, Button } from '@ultibiker/shared';
import { Search, Plus, RotateCcw } from 'lucide-react';

export function DevicesPage() {
  const { 
    availableDevices, 
    connectedDevices, 
    sensorData, 
    isScanning,
    connectDevice,
    disconnectDevice,
  } = useSensorStore();
  
  const { startScanning, stopScanning, connectDevice: socketConnectDevice, disconnectDevice: socketDisconnectDevice } = useSensorSocket();

  const handleStartScanning = () => {
    startScanning();
  };

  const handleStopScanning = () => {
    stopScanning();
  };

  const handleConnectDevice = async (deviceId: string) => {
    const device = availableDevices.find(d => d.id === deviceId);
    if (device) {
      await connectDevice(device);
      socketConnectDevice(deviceId);
    }
  };

  const handleDisconnectDevice = async (deviceId: string) => {
    await disconnectDevice(deviceId);
    socketDisconnectDevice(deviceId);
  };

  // Device type icons matching original spec
  const getDeviceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'heartrate':
      case 'heart_rate':
        return '💓';
      case 'power':
        return '⚡';
      case 'cadence':
        return '🔄';
      case 'speed':
        return '📏';
      case 'trainer':
        return '🚴';
      default:
        return '🎯';
    }
  };

  // Signal strength indicator matching original spec
  const getSignalStrength = (rssi: number) => {
    if (rssi >= -50) return '📶'; // Excellent (4 bars)
    if (rssi >= -60) return '📶'; // Good (3 bars) 
    if (rssi >= -70) return '📶'; // Fair (2 bars)
    if (rssi >= -80) return '📶'; // Poor (1 bar)
    return '❌'; // No signal
  };

  return (
    <div className="space-y-6">
      {/* Scan Controls - matching original spec */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-900">🔍 SCAN FOR DEVICES</h2>
          <div className="flex items-center space-x-2">
            <Button
              onClick={isScanning ? handleStopScanning : handleStartScanning}
              variant={isScanning ? 'secondary' : 'primary'}
              className="flex items-center space-x-2"
            >
              {isScanning ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>⏹️ Stop</span>
                </>
              ) : (
                <>
                  <span>🔄 Scanning...</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Two-column layout matching original design spec */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left Column: Detected Devices */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
            📋 DETECTED DEVICES
          </h3>
          
          {/* ANT+ Devices */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-700 mb-3">📡 ANT+ Devices:</h4>
            {availableDevices.filter(d => d.protocol === 'ant+').length === 0 ? (
              <p className="text-gray-500 text-sm italic">No ANT+ devices found</p>
            ) : (
              availableDevices.filter(d => d.protocol === 'ant+').map((device) => (
                <div key={device.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded mb-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{getDeviceIcon(device.type)}</span>
                    <div>
                      <div className="font-medium">{device.name}</div>
                      <div className="text-sm text-gray-500">{device.type} Sensor</div>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleConnectDevice(device.id)}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1"
                  >
                    +Add
                  </Button>
                </div>
              ))
            )}
          </div>

          {/* Bluetooth Devices */}
          <div>
            <h4 className="font-medium text-gray-700 mb-3">📶 Bluetooth Devices:</h4>
            {availableDevices.filter(d => d.protocol === 'bluetooth').length === 0 ? (
              <p className="text-gray-500 text-sm italic">No Bluetooth devices found</p>
            ) : (
              availableDevices.filter(d => d.protocol === 'bluetooth').map((device) => (
                <div key={device.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded mb-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{getDeviceIcon(device.type)}</span>
                    <div>
                      <div className="font-medium">{device.name}</div>
                      <div className="text-sm text-gray-500">{device.type} Sensor</div>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleConnectDevice(device.id)}
                    size="sm" 
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1"
                  >
                    +Add
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Connected Devices */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
            ✅ CONNECTED DEVICES
          </h3>
          
          {connectedDevices.length === 0 ? (
            <p className="text-gray-500 text-sm italic">No devices connected</p>
          ) : (
            connectedDevices.map((device) => (
              <div key={device.id} className="py-3 px-3 bg-green-50 rounded mb-3 border border-green-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{getDeviceIcon(device.type)}</span>
                    <div>
                      <div className="font-medium text-gray-900">
                        {device.name} ({device.type})
                      </div>
                      <div className="text-sm text-green-600">
                        Status: Connected ✅
                      </div>
                      <div className="text-sm text-gray-500">
                        Signal: Strong {getSignalStrength(device.signalStrength || -50)}
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleDisconnectDevice(device.id)}
                    size="sm"
                    variant="danger"
                    className="px-2 py-1"
                  >
                    ❌ Remove
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Device Status Footer - matching original spec */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-700 mb-2">📊 Device Status:</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>• ANT+ Stick: Connected ✅</div>
          <div>• Bluetooth: Enabled ✅</div> 
          <div>• Total Devices: {connectedDevices.length} connected</div>
        </div>
      </div>
    </div>
  );
}