import { useMemo } from 'react';
import { useSensorStore, Card, CardHeader, CardContent } from '@ultibiker/shared';
import { RealtimeChart } from '../components/RealtimeChart';
import { MetricsGrid } from '../components/MetricsGrid';
import { DeviceList } from '../components/DeviceList';
import { Activity, Gauge, Heart, Bike, Users } from 'lucide-react';

export function DashboardPage() {
  const { connectedDevices, sensorData, connectionStatus } = useSensorStore();

  // Aggregate current metrics from all connected devices
  const currentMetrics = useMemo(() => {
    const metrics = {
      heartRate: 0,
      power: 0,
      cadence: 0,
      speed: 0,
      activeDevices: connectedDevices.length,
    };

    Object.values(sensorData).forEach(data => {
      if (data) {
        if (data.heartRate !== undefined && data.heartRate > metrics.heartRate) {
          metrics.heartRate = data.heartRate;
        }
        if (data.power !== undefined) {
          metrics.power += data.power;
        }
        if (data.cadence !== undefined && data.cadence > metrics.cadence) {
          metrics.cadence = data.cadence;
        }
        if (data.speed !== undefined && data.speed > metrics.speed) {
          metrics.speed = data.speed;
        }
      }
    });

    return metrics;
  }, [sensorData, connectedDevices]);

  const metricCards = [
    {
      title: 'Heart Rate',
      value: currentMetrics.heartRate,
      unit: 'bpm',
      icon: Heart,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      title: 'Power',
      value: currentMetrics.power,
      unit: 'W',
      icon: Activity,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      title: 'Cadence',
      value: currentMetrics.cadence,
      unit: 'rpm',
      icon: Gauge,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Speed',
      value: currentMetrics.speed.toFixed(1),
      unit: 'km/h',
      icon: Bike,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Active Devices',
      value: currentMetrics.activeDevices,
      unit: 'devices',
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  if (connectionStatus === 'disconnected') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Connection
          </h3>
          <p className="text-gray-500 mb-4">
            Connect to the UltiBiker server to start monitoring your sensors.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">
            Real-time monitoring of your cycling sensors
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500' : 
            connectionStatus === 'connecting' ? 'bg-yellow-500' : 
            'bg-red-500'
          }`} />
          <span className="text-sm text-gray-600 capitalize">
            {connectionStatus}
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {metricCards.map((metric) => (
          <Card key={metric.title} className="p-4">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                <metric.icon className={`w-6 h-6 ${metric.color}`} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{metric.title}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {metric.value}
                  <span className="text-sm font-normal text-gray-500 ml-1">
                    {metric.unit}
                  </span>
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Heart Rate</h3>
          </CardHeader>
          <CardContent>
            <RealtimeChart
              dataKey="heartRate"
              color="#dc2626"
              unit="bpm"
              maxDataPoints={60}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Power</h3>
          </CardHeader>
          <CardContent>
            <RealtimeChart
              dataKey="power"
              color="#ca8a04"
              unit="W"
              maxDataPoints={60}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Speed & Cadence</h3>
          </CardHeader>
          <CardContent>
            <RealtimeChart
              dataKey="speed"
              secondaryDataKey="cadence"
              color="#2563eb"
              secondaryColor="#16a34a"
              unit="km/h"
              secondaryUnit="rpm"
              maxDataPoints={60}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Connected Devices</h3>
          </CardHeader>
          <CardContent>
            <DeviceList />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}