import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { Card, CardHeader, CardContent } from './card';
import { Button } from './button';
import { clsx } from 'clsx';
import { Bluetooth, Radio, Battery, Signal, Heart, Gauge, Bike, Thermometer, Activity, MapPin, } from 'lucide-react';
export function SensorCard({ device, data, connected = false, onConnect, onDisconnect, className }) {
    const sensorIcon = useMemo(() => {
        switch (device.type) {
            case 'heart_rate':
                return _jsx(Heart, { className: "w-5 h-5" });
            case 'cadence':
            case 'speed_cadence':
                return _jsx(Gauge, { className: "w-5 h-5" });
            case 'power':
                return _jsx(Activity, { className: "w-5 h-5" });
            case 'speed':
                return _jsx(Bike, { className: "w-5 h-5" });
            case 'temperature':
                return _jsx(Thermometer, { className: "w-5 h-5" });
            case 'gps':
                return _jsx(MapPin, { className: "w-5 h-5" });
            default:
                return _jsx(Signal, { className: "w-5 h-5" });
        }
    }, [device.type]);
    const connectionIcon = useMemo(() => {
        if (device.protocol === 'bluetooth') {
            return _jsx(Bluetooth, { className: "w-4 h-4" });
        }
        return _jsx(Radio, { className: "w-4 h-4" });
    }, [device.protocol]);
    const handleToggleConnection = () => {
        if (connected) {
            onDisconnect?.(device.id);
        }
        else {
            onConnect?.(device.id);
        }
    };
    const formatSensorData = (data) => {
        const metrics = [];
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
    return (_jsxs(Card, { className: clsx('transition-all duration-200', connected && 'ring-2 ring-primary-500', className), children: [_jsx(CardHeader, { className: "pb-3", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("div", { className: clsx('p-2 rounded-lg', connected ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'), children: sensorIcon }), _jsxs("div", { children: [_jsx("h3", { className: "font-semibold text-gray-900", children: device.name || `${device.type} Sensor` }), _jsxs("div", { className: "flex items-center space-x-2 text-sm text-gray-500", children: [connectionIcon, _jsx("span", { className: "capitalize", children: device.protocol }), device.manufacturerName && (_jsxs(_Fragment, { children: [_jsx("span", { children: "\u2022" }), _jsx("span", { children: device.manufacturerName })] }))] })] })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [device.batteryLevel !== undefined && (_jsxs("div", { className: "flex items-center text-sm text-gray-500", children: [_jsx(Battery, { className: "w-4 h-4 mr-1" }), _jsxs("span", { children: [device.batteryLevel, "%"] })] })), _jsx("div", { className: clsx('w-3 h-3 rounded-full', connected ? 'bg-green-500' : 'bg-gray-400') })] })] }) }), _jsxs(CardContent, { className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-2 gap-4 text-sm", children: [device.deviceId && (_jsxs("div", { children: [_jsx("span", { className: "text-gray-500", children: "Device ID:" }), _jsx("div", { className: "font-mono text-xs bg-gray-100 px-2 py-1 rounded mt-1", children: device.deviceId })] })), device.rssi !== undefined && (_jsxs("div", { children: [_jsx("span", { className: "text-gray-500", children: "Signal:" }), _jsxs("div", { className: "font-semibold", children: [device.rssi, " dBm"] })] })), device.serviceUuids && device.serviceUuids.length > 0 && (_jsxs("div", { className: "col-span-2", children: [_jsx("span", { className: "text-gray-500", children: "Services:" }), _jsx("div", { className: "flex flex-wrap gap-1 mt-1", children: device.serviceUuids.map((uuid) => (_jsxs("span", { className: "text-xs bg-gray-100 px-2 py-1 rounded font-mono", children: [uuid.slice(0, 8), "..."] }, uuid))) })] }))] }), data && connected && (_jsxs("div", { className: "border-t pt-4", children: [_jsx("h4", { className: "font-medium text-gray-900 mb-3", children: "Live Data" }), _jsx("div", { className: "grid grid-cols-2 gap-3", children: formatSensorData(data).map(({ label, value, unit }) => (_jsxs("div", { className: "bg-gray-50 p-3 rounded-lg", children: [_jsx("div", { className: "text-sm text-gray-500", children: label }), _jsxs("div", { className: "text-xl font-bold text-gray-900", children: [value, unit && _jsx("span", { className: "text-sm font-normal text-gray-500 ml-1", children: unit })] })] }, label))) })] })), _jsx("div", { className: "border-t pt-4", children: _jsx(Button, { onClick: handleToggleConnection, variant: connected ? 'secondary' : 'primary', className: "w-full", children: connected ? 'Disconnect' : 'Connect' }) })] })] }));
}
