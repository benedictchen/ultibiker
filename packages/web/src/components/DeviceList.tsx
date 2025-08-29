import { useSensorStore } from '@ultibiker/shared';
import { 
  Bluetooth, 
  Radio, 
  Battery, 
  Heart, 
  Gauge, 
  Bike,
  Activity,
  Signal,
} from 'lucide-react';
import { clsx } from 'clsx';

export function DeviceList() {
  const { connectedDevices, sensorData } = useSensorStore();

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'heart_rate':
        return Heart;
      case 'cadence':
      case 'speed_cadence':
        return Gauge;
      case 'power':
        return Activity;
      case 'speed':
        return Bike;
      default:
        return Signal;
    }
  };

  const getConnectionIcon = (protocol: string) => {
    return protocol === 'bluetooth' ? Bluetooth : Radio;
  };

  if (connectedDevices.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        <Signal className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm">No devices connected</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {connectedDevices.map((device) => {
        const DeviceIcon = getDeviceIcon(device.type);
        const ConnectionIcon = getConnectionIcon(device.protocol);
        const data = sensorData[device.id];
        
        return (
          <div
            key={device.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center space-x-3">
              <div className="p-1.5 bg-primary-100 rounded-md">
                <DeviceIcon className="w-4 h-4 text-primary-700" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <p className="font-medium text-gray-900 text-sm">
                    {device.name || `${device.type} Sensor`}
                  </p>
                  <ConnectionIcon className="w-3 h-3 text-gray-400" />
                </div>
                <div className="flex items-center space-x-3 text-xs text-gray-500">
                  {device.manufacturerName && (
                    <span>{device.manufacturerName}</span>
                  )}
                  {device.batteryLevel !== undefined && (
                    <div className="flex items-center space-x-1">
                      <Battery className="w-3 h-3" />
                      <span>{device.batteryLevel}%</span>
                    </div>
                  )}
                  {device.rssi !== undefined && (
                    <span>{device.rssi} dBm</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="text-right">
              {data && (
                <div className="space-y-0.5">
                  {data.heartRate !== undefined && (
                    <div className="text-xs">
                      <span className="font-medium text-red-600">{data.heartRate}</span>
                      <span className="text-gray-500 ml-1">bpm</span>
                    </div>
                  )}
                  {data.power !== undefined && (
                    <div className="text-xs">
                      <span className="font-medium text-yellow-600">{data.power}</span>
                      <span className="text-gray-500 ml-1">W</span>
                    </div>
                  )}
                  {data.cadence !== undefined && (
                    <div className="text-xs">
                      <span className="font-medium text-blue-600">{data.cadence}</span>
                      <span className="text-gray-500 ml-1">rpm</span>
                    </div>
                  )}
                  {data.speed !== undefined && (
                    <div className="text-xs">
                      <span className="font-medium text-green-600">{data.speed.toFixed(1)}</span>
                      <span className="text-gray-500 ml-1">km/h</span>
                    </div>
                  )}
                </div>
              )}
              
              <div className={clsx(
                'w-2 h-2 rounded-full mt-1 ml-auto',
                data ? 'bg-green-500' : 'bg-gray-400'
              )} />
            </div>
          </div>
        );
      })}
    </div>
  );
}