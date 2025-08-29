import { useMemo } from 'react';
import { Card, CardHeader, CardContent } from './card';
import { Button } from './button';
import { clsx } from 'clsx';
import { 
  Bluetooth, 
  Radio, 
  Battery, 
  Signal, 
  Heart, 
  Gauge, 
  Bike,
  Thermometer,
  Activity,
  MapPin,
} from 'lucide-react';
import type { SensorDevice, SensorData } from '@ultibiker/core';

interface SensorCardProps {
  device: SensorDevice;
  data?: SensorData;
  connected?: boolean;
  onConnect?: (deviceId: string) => void;
  onDisconnect?: (deviceId: string) => void;
  className?: string;
}

export function SensorCard({ 
  device, 
  data, 
  connected = false, 
  onConnect, 
  onDisconnect, 
  className 
}: SensorCardProps) {
  const sensorIcon = useMemo(() => {
    switch (device.type) {
      case 'heart_rate':
        return <Heart className="w-5 h-5" />;
      case 'cadence':
      case 'speed_cadence':
        return <Gauge className="w-5 h-5" />;
      case 'power':
        return <Activity className="w-5 h-5" />;
      case 'speed':
        return <Bike className="w-5 h-5" />;
      case 'temperature':
        return <Thermometer className="w-5 h-5" />;
      case 'gps':
        return <MapPin className="w-5 h-5" />;
      default:
        return <Signal className="w-5 h-5" />;
    }
  }, [device.type]);

  const connectionIcon = useMemo(() => {
    if (device.protocol === 'bluetooth') {
      return <Bluetooth className="w-4 h-4" />;
    }
    return <Radio className="w-4 h-4" />;
  }, [device.protocol]);

  const handleToggleConnection = () => {
    if (connected) {
      onDisconnect?.(device.id);
    } else {
      onConnect?.(device.id);
    }
  };

  const formatSensorData = (data: SensorData) => {
    const metrics: Array<{ label: string; value: string; unit?: string }> = [];

    if (data.heartRate !== undefined) {
      metrics.push({ label: 'Heart Rate', value: data.heartRate.toString(), unit: 'bpm' });
    }
    if (data.cadence !== undefined) {
      metrics.push({ label: 'Cadence', value: data.cadence.toString(), unit: 'rpm' });
    }
    if (data.speed !== undefined) {
      metrics.push({ label: 'Speed', value: data.speed.toFixed(1), unit: 'km/h' });
    }
    if (data.power !== undefined) {
      metrics.push({ label: 'Power', value: data.power.toString(), unit: 'W' });
    }
    if (data.temperature !== undefined) {
      metrics.push({ label: 'Temperature', value: data.temperature.toFixed(1), unit: '°C' });
    }
    if (data.distance !== undefined) {
      metrics.push({ label: 'Distance', value: (data.distance / 1000).toFixed(2), unit: 'km' });
    }

    return metrics;
  };

  return (
    <Card className={clsx('transition-all duration-200', connected && 'ring-2 ring-primary-500', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={clsx(
              'p-2 rounded-lg',
              connected ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
            )}>
              {sensorIcon}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                {device.name || `${device.type} Sensor`}
              </h3>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                {connectionIcon}
                <span className="capitalize">{device.protocol}</span>
                {device.manufacturerName && (
                  <>
                    <span>•</span>
                    <span>{device.manufacturerName}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {device.batteryLevel !== undefined && (
              <div className="flex items-center text-sm text-gray-500">
                <Battery className="w-4 h-4 mr-1" />
                <span>{device.batteryLevel}%</span>
              </div>
            )}
            <div className={clsx(
              'w-3 h-3 rounded-full',
              connected ? 'bg-green-500' : 'bg-gray-400'
            )} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Device Information */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          {device.deviceId && (
            <div>
              <span className="text-gray-500">Device ID:</span>
              <div className="font-mono text-xs bg-gray-100 px-2 py-1 rounded mt-1">
                {device.deviceId}
              </div>
            </div>
          )}
          {device.rssi !== undefined && (
            <div>
              <span className="text-gray-500">Signal:</span>
              <div className="font-semibold">{device.rssi} dBm</div>
            </div>
          )}
          {device.serviceUuids && device.serviceUuids.length > 0 && (
            <div className="col-span-2">
              <span className="text-gray-500">Services:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {device.serviceUuids.map((uuid) => (
                  <span key={uuid} className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                    {uuid.slice(0, 8)}...
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Real-time Data */}
        {data && connected && (
          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-900 mb-3">Live Data</h4>
            <div className="grid grid-cols-2 gap-3">
              {formatSensorData(data).map(({ label, value, unit }) => (
                <div key={label} className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-500">{label}</div>
                  <div className="text-xl font-bold text-gray-900">
                    {value}
                    {unit && <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="border-t pt-4">
          <Button
            onClick={handleToggleConnection}
            variant={connected ? 'secondary' : 'primary'}
            className="w-full"
          >
            {connected ? 'Disconnect' : 'Connect'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}