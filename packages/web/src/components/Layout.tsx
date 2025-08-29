import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore, useSensorStore } from '@ultibiker/shared';
import { 
  Home, 
  Radio, 
  Settings, 
  Menu, 
  X,
  Wifi,
  WifiOff,
  AlertCircle,
} from 'lucide-react';
import { clsx } from 'clsx';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { sidebarOpen, setSidebarOpen } = useAppStore();
  const { connectionStatus, connectedDevices } = useSensorStore();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Devices', href: '/devices', icon: Radio },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const connectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="w-5 h-5 text-green-500" />;
      case 'connecting':
        return <Wifi className="w-5 h-5 text-yellow-500 animate-pulse" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <WifiOff className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={clsx(
        'fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">UltiBiker</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Connection Status */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {connectionStatusIcon()}
            <div>
              <div className="text-sm font-medium text-gray-900">
                {connectionStatus === 'connected' && 'Connected'}
                {connectionStatus === 'connecting' && 'Connecting...'}
                {connectionStatus === 'error' && 'Connection Error'}
                {connectionStatus === 'disconnected' && 'Disconnected'}
              </div>
              <div className="text-xs text-gray-500">
                {connectedDevices.length} device{connectedDevices.length !== 1 ? 's' : ''} connected
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-6 py-6">
          <ul className="space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={clsx(
                      'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                      isActive
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    )}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            UltiBiker v1.0.0
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 lg:hidden">
          <div className="flex items-center justify-between h-16 px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-md hover:bg-gray-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900">
              {navigation.find(nav => nav.href === location.pathname)?.name || 'UltiBiker'}
            </h2>
            <div className="w-9" /> {/* Spacer for centering */}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container py-6">
            {children}
          </div>
        </main>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-25 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}