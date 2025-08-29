import { useAppStore } from '@ultibiker/shared';
import { Card, CardHeader, CardContent, Button } from '@ultibiker/shared';
import { Save, RotateCcw, Bell, Palette, Globe, BarChart3 } from 'lucide-react';

export function SettingsPage() {
  const { settings, updateSettings, resetSettings } = useAppStore();

  const handleSave = () => {
    // Settings are automatically persisted via Zustand middleware
    console.log('Settings saved:', settings);
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      resetSettings();
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500">
            Customize your UltiBiker experience
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={handleReset} variant="secondary" className="flex items-center space-x-2">
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </Button>
          <Button onClick={handleSave} className="flex items-center space-x-2">
            <Save className="w-4 h-4" />
            <span>Save</span>
          </Button>
        </div>
      </div>

      {/* Appearance Settings */}
      <Card>
        <CardHeader className="flex flex-row items-center space-x-3">
          <Palette className="w-5 h-5 text-primary-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Appearance</h3>
            <p className="text-sm text-gray-500">Customize the visual appearance</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Theme
            </label>
            <select
              value={settings.theme}
              onChange={(e) => updateSettings({ theme: e.target.value as any })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Language
            </label>
            <select
              value={settings.language}
              onChange={(e) => updateSettings({ language: e.target.value })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader className="flex flex-row items-center space-x-3">
          <Bell className="w-5 h-5 text-primary-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
            <p className="text-sm text-gray-500">Control notification preferences</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Enable Notifications
              </label>
              <p className="text-xs text-gray-500">Receive alerts and updates</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifications.enabled}
              onChange={(e) => updateSettings({
                notifications: { ...settings.notifications, enabled: e.target.checked }
              })}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Sound Alerts
              </label>
              <p className="text-xs text-gray-500">Play sounds for notifications</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifications.sound}
              onChange={(e) => updateSettings({
                notifications: { ...settings.notifications, sound: e.target.checked }
              })}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Desktop Notifications
              </label>
              <p className="text-xs text-gray-500">Show system notifications</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifications.desktop}
              onChange={(e) => updateSettings({
                notifications: { ...settings.notifications, desktop: e.target.checked }
              })}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Chart Settings */}
      <Card>
        <CardHeader className="flex flex-row items-center space-x-3">
          <BarChart3 className="w-5 h-5 text-primary-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Charts & Data</h3>
            <p className="text-sm text-gray-500">Configure chart behavior and data display</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Update Interval (ms)
            </label>
            <select
              value={settings.charts.updateInterval}
              onChange={(e) => updateSettings({
                charts: { ...settings.charts, updateInterval: Number(e.target.value) }
              })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="500">500ms (2 fps)</option>
              <option value="1000">1000ms (1 fps)</option>
              <option value="2000">2000ms (0.5 fps)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Data Points
            </label>
            <input
              type="number"
              min="50"
              max="1000"
              step="50"
              value={settings.charts.maxDataPoints}
              onChange={(e) => updateSettings({
                charts: { ...settings.charts, maxDataPoints: Number(e.target.value) }
              })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Data Smoothing
              </label>
              <p className="text-xs text-gray-500">Apply smoothing to chart data</p>
            </div>
            <input
              type="checkbox"
              checked={settings.charts.smoothing}
              onChange={(e) => updateSettings({
                charts: { ...settings.charts, smoothing: e.target.checked }
              })}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Unit Settings */}
      <Card>
        <CardHeader className="flex flex-row items-center space-x-3">
          <Globe className="w-5 h-5 text-primary-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Units</h3>
            <p className="text-sm text-gray-500">Set your preferred measurement units</p>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Speed
            </label>
            <select
              value={settings.units.speed}
              onChange={(e) => updateSettings({
                units: { ...settings.units, speed: e.target.value as any }
              })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="kmh">km/h</option>
              <option value="mph">mph</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Distance
            </label>
            <select
              value={settings.units.distance}
              onChange={(e) => updateSettings({
                units: { ...settings.units, distance: e.target.value as any }
              })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="km">Kilometers</option>
              <option value="mi">Miles</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Temperature
            </label>
            <select
              value={settings.units.temperature}
              onChange={(e) => updateSettings({
                units: { ...settings.units, temperature: e.target.value as any }
              })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="c">Celsius (°C)</option>
              <option value="f">Fahrenheit (°F)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Weight
            </label>
            <select
              value={settings.units.weight}
              onChange={(e) => updateSettings({
                units: { ...settings.units, weight: e.target.value as any }
              })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="kg">Kilograms</option>
              <option value="lbs">Pounds</option>
            </select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}