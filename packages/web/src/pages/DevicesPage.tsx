import { useState } from 'react';
import { useSensorStore, useSensorSocket, SensorCard, Button } from '@ultibiker/shared';
import { Search, Plus, RotateCcw } from 'lucide-react';

export function DevicesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  
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

  const filteredAvailableDevices = availableDevices.filter(device =>
    device.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.manufacturerName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredConnectedDevices = connectedDevices.filter(device =>
    device.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.manufacturerName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Devices</h1>
          <p className="text-gray-500">
            Manage your cycling sensors and monitor connections
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            onClick={isScanning ? handleStopScanning : handleStartScanning}
            variant={isScanning ? 'secondary' : 'primary'}
            className="flex items-center space-x-2"
          >
            {isScanning ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" />
                <span>Stop Scanning</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Start Scanning</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search devices..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {/* Connected Devices */}
      {filteredConnectedDevices.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Connected Devices ({filteredConnectedDevices.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredConnectedDevices.map((device) => (
              <SensorCard
                key={device.id}
                device={device}
                data={sensorData[device.id]}
                connected={true}
                onDisconnect={handleDisconnectDevice}
              />
            ))}
          </div>
        </section>
      )}

      {/* Available Devices */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Available Devices ({filteredAvailableDevices.length})
          </h2>
          {isScanning && (
            <div className="flex items-center text-sm text-gray-500">
              <RotateCcw className="w-4 h-4 animate-spin mr-2" />
              Scanning for devices...
            </div>
          )}
        </div>

        {filteredAvailableDevices.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {isScanning ? 'Searching for devices...' : 'No devices found'}
            </h3>
            <p className="text-gray-500 mb-4">
              {isScanning 
                ? 'Make sure your sensors are in pairing mode and nearby.'
                : 'Click "Start Scanning" to discover nearby cycling sensors.'
              }
            </p>
            {!isScanning && (
              <Button onClick={handleStartScanning} className="inline-flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Start Scanning</span>
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAvailableDevices.map((device) => (
              <SensorCard
                key={device.id}
                device={device}
                connected={false}
                onConnect={handleConnectDevice}
              />
            ))}
          </div>
        )}
      </section>

      {/* Device Statistics */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Statistics</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary-600">
              {connectedDevices.length}
            </div>
            <div className="text-sm text-gray-500">Connected</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-600">
              {availableDevices.length}
            </div>
            <div className="text-sm text-gray-500">Available</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {Object.values(sensorData).filter(data => data).length}
            </div>
            <div className="text-sm text-gray-500">Active Streams</div>
          </div>
        </div>
      </section>
    </div>
  );
}