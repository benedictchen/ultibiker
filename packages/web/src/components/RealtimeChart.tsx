import { useEffect, useState, useCallback, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useSensorStore, useAppStore } from '@ultibiker/shared';
import { format } from 'date-fns';

interface RealtimeChartProps {
  dataKey: string;
  secondaryDataKey?: string;
  color: string;
  secondaryColor?: string;
  unit: string;
  secondaryUnit?: string;
  maxDataPoints?: number;
  height?: number;
}

interface DataPoint {
  timestamp: number;
  time: string;
  [key: string]: number | string;
}

export function RealtimeChart({
  dataKey,
  secondaryDataKey,
  color,
  secondaryColor = '#16a34a',
  unit,
  secondaryUnit,
  maxDataPoints = 100,
  height = 300,
}: RealtimeChartProps) {
  const [chartData, setChartData] = useState<DataPoint[]>([]);
  const { sensorData } = useSensorStore();
  const { settings } = useAppStore();

  // Aggregate data from all connected sensors
  const aggregatedData = useMemo(() => {
    const data: { [key: string]: number } = {};
    
    Object.values(sensorData).forEach(sensor => {
      if (sensor && sensor[dataKey as keyof typeof sensor] !== undefined) {
        const value = sensor[dataKey as keyof typeof sensor] as number;
        if (!data[dataKey] || value > data[dataKey]) {
          data[dataKey] = value;
        }
      }
      
      if (secondaryDataKey && sensor && sensor[secondaryDataKey as keyof typeof sensor] !== undefined) {
        const value = sensor[secondaryDataKey as keyof typeof sensor] as number;
        if (!data[secondaryDataKey] || value > data[secondaryDataKey]) {
          data[secondaryDataKey] = value;
        }
      }
    });

    return data;
  }, [sensorData, dataKey, secondaryDataKey]);

  const updateChartData = useCallback(() => {
    const now = Date.now();
    const timeString = format(now, 'HH:mm:ss');

    const newPoint: DataPoint = {
      timestamp: now,
      time: timeString,
      [dataKey]: aggregatedData[dataKey] || 0,
    };

    if (secondaryDataKey) {
      newPoint[secondaryDataKey] = aggregatedData[secondaryDataKey] || 0;
    }

    setChartData(prev => {
      const updated = [...prev, newPoint];
      // Keep only the last maxDataPoints
      return updated.slice(-maxDataPoints);
    });
  }, [aggregatedData, dataKey, secondaryDataKey, maxDataPoints]);

  useEffect(() => {
    // Only update if we have data
    if (Object.keys(aggregatedData).length === 0) return;

    const interval = setInterval(updateChartData, settings.charts.updateInterval);
    return () => clearInterval(interval);
  }, [updateChartData, settings.charts.updateInterval, aggregatedData]);

  const formatTooltipValue = (value: number, name: string) => {
    const displayUnit = name === dataKey ? unit : secondaryUnit || '';
    return [`${value} ${displayUnit}`, name];
  };

  const formatXAxisTick = (tickItem: string) => {
    return tickItem.split(':').slice(-2).join(':'); // Show only MM:SS
  };

  const smoothData = (data: DataPoint[]) => {
    if (!settings.charts.smoothing || data.length < 3) return data;
    
    return data.map((point, index) => {
      if (index === 0 || index === data.length - 1) return point;
      
      const prev = data[index - 1];
      const next = data[index + 1];
      const smoothedPoint = { ...point };
      
      // Simple moving average smoothing
      if (typeof point[dataKey] === 'number') {
        smoothedPoint[dataKey] = (
          (prev[dataKey] as number) + 
          (point[dataKey] as number) + 
          (next[dataKey] as number)
        ) / 3;
      }
      
      if (secondaryDataKey && typeof point[secondaryDataKey] === 'number') {
        smoothedPoint[secondaryDataKey] = (
          (prev[secondaryDataKey] as number) + 
          (point[secondaryDataKey] as number) + 
          (next[secondaryDataKey] as number)
        ) / 3;
      }
      
      return smoothedPoint;
    });
  };

  const displayData = smoothData(chartData);

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={displayData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="time"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickFormatter={formatXAxisTick}
            interval="preserveStartEnd"
          />
          <YAxis 
            tick={{ fontSize: 12, fill: '#6b7280' }}
            width={60}
          />
          <Tooltip
            formatter={formatTooltipValue}
            labelStyle={{ color: '#374151' }}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '12px',
            }}
          />
          {secondaryDataKey && <Legend />}
          
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={false}
            name={dataKey}
            connectNulls={false}
            animationDuration={settings.charts.updateInterval / 2}
          />
          
          {secondaryDataKey && (
            <Line
              type="monotone"
              dataKey={secondaryDataKey}
              stroke={secondaryColor}
              strokeWidth={2}
              dot={false}
              name={secondaryDataKey}
              connectNulls={false}
              animationDuration={settings.charts.updateInterval / 2}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}