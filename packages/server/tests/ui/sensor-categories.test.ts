import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

// Mock DOM environment with sensor category cards
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<head><title>UltiBiker Sensor Categories Test</title></head>
<body>
  <!-- Sensor Category Slots -->
  <div class="row g-3">
    <!-- Heart Rate Slot -->
    <div class="col-md-6 col-lg-3">
      <div class="sensor-category-card empty" id="heartRateSlot">
        <div class="sensor-category-header">
          <div class="sensor-icon heart-rate">
            <i class="fas fa-heartbeat"></i>
          </div>
          <h6 class="mb-1">💓 Heart Rate</h6>
        </div>
        <div class="sensor-device-info" style="display: none;">
          <div class="sensor-device-name text-truncate"></div>
          <small class="sensor-device-status text-success"></small>
          <div class="sensor-device-value fw-bold text-primary"></div>
        </div>
        <div class="sensor-empty-state">
          <small class="text-muted">No heart rate monitor connected</small>
        </div>
      </div>
    </div>

    <!-- Power Slot -->
    <div class="col-md-6 col-lg-3">
      <div class="sensor-category-card empty" id="powerSlot">
        <div class="sensor-category-header">
          <div class="sensor-icon power">
            <i class="fas fa-bolt"></i>
          </div>
          <h6 class="mb-1">⚡ Power</h6>
        </div>
        <div class="sensor-device-info" style="display: none;">
          <div class="sensor-device-name text-truncate"></div>
          <small class="sensor-device-status text-success"></small>
          <div class="sensor-device-value fw-bold text-primary"></div>
        </div>
        <div class="sensor-empty-state">
          <small class="text-muted">No power meter connected</small>
        </div>
      </div>
    </div>

    <!-- Cadence Slot -->
    <div class="col-md-6 col-lg-3">
      <div class="sensor-category-card empty" id="cadenceSlot">
        <div class="sensor-category-header">
          <div class="sensor-icon cadence">
            <i class="fas fa-sync-alt"></i>
          </div>
          <h6 class="mb-1">🔄 Cadence</h6>
        </div>
        <div class="sensor-device-info" style="display: none;">
          <div class="sensor-device-name text-truncate"></div>
          <small class="sensor-device-status text-success"></small>
          <div class="sensor-device-value fw-bold text-primary"></div>
        </div>
        <div class="sensor-empty-state">
          <small class="text-muted">No cadence sensor connected</small>
        </div>
      </div>
    </div>

    <!-- Speed/Trainer Slot -->
    <div class="col-md-6 col-lg-3">
      <div class="sensor-category-card empty" id="speedSlot">
        <div class="sensor-category-header">
          <div class="sensor-icon speed">
            <i class="fas fa-tachometer-alt"></i>
          </div>
          <h6 class="mb-1">🏃 Speed/Trainer</h6>
        </div>
        <div class="sensor-device-info" style="display: none;">
          <div class="sensor-device-name text-truncate"></div>
          <small class="sensor-device-status text-success"></small>
          <div class="sensor-device-value fw-bold text-primary"></div>
        </div>
        <div class="sensor-empty-state">
          <small class="text-muted">No speed sensor or trainer connected</small>
        </div>
      </div>
    </div>
  </div>

  <!-- Available Devices Section -->
  <div id="availableDevices">
    <div class="text-center py-3 text-muted">
      <i class="fas fa-search fa-2x mb-2 opacity-50"></i>
      <p class="mb-0 small">No devices found</p>
      <small>Start scanning to find sensors</small>
    </div>
  </div>
</body>
</html>
`, { url: 'http://localhost:3002' });

// Set up global DOM
global.window = dom.window as any;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.Element = dom.window.Element;
global.Node = dom.window.Node;

// Mock Dashboard class with sensor category methods (simplified version for testing)
class MockDashboard {
    constructor() {
        this.connectedDevices = new Map();
        this.discoveredDevices = new Map();
        this.deviceMetrics = new Map();
    }

    updateSensorCategorySlots() {
        const categories = {
            'heart_rate': 'heartRateSlot',
            'power': 'powerSlot', 
            'cadence': 'cadenceSlot',
            'speed': 'speedSlot',
            'trainer': 'speedSlot' // Trainers go in speed slot
        };
        
        // Reset all slots to empty state
        Object.values(categories).forEach(slotId => {
            this.resetSensorSlot(slotId);
        });
        
        // Populate slots with connected devices
        this.connectedDevices.forEach(device => {
            const slotId = categories[device.type];
            if (slotId) {
                this.populateSensorSlot(slotId, device);
            }
        });
    }
    
    resetSensorSlot(slotId: string) {
        const slot = document.getElementById(slotId);
        if (!slot) return;
        
        const deviceInfo = slot.querySelector('.sensor-device-info') as HTMLElement;
        const emptyState = slot.querySelector('.sensor-empty-state') as HTMLElement;
        
        if (deviceInfo) deviceInfo.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        
        slot.classList.remove('connected');
        slot.classList.add('empty');
    }
    
    populateSensorSlot(slotId: string, device: any) {
        const slot = document.getElementById(slotId);
        if (!slot) return;
        
        const deviceInfo = slot.querySelector('.sensor-device-info') as HTMLElement;
        const emptyState = slot.querySelector('.sensor-empty-state') as HTMLElement;
        const deviceName = slot.querySelector('.sensor-device-name') as HTMLElement;
        const deviceStatus = slot.querySelector('.sensor-device-status') as HTMLElement;
        const deviceValue = slot.querySelector('.sensor-device-value') as HTMLElement;
        
        if (deviceInfo) {
            deviceInfo.style.display = 'block';
            deviceInfo.setAttribute('data-device-id', device.deviceId);
        }
        if (emptyState) emptyState.style.display = 'none';
        if (deviceName) deviceName.textContent = device.displayName || device.name;
        if (deviceStatus) deviceStatus.textContent = 'Connected';
        
        // Update with real-time sensor data if available
        const sensorData = this.deviceMetrics.get(device.deviceId);
        if (deviceValue && sensorData) {
            const formattedValue = this.formatSensorValue(device.type, sensorData);
            deviceValue.textContent = formattedValue;
        } else if (deviceValue) {
            deviceValue.textContent = 'No data';
        }
        
        slot.classList.remove('empty');
        slot.classList.add('connected');
    }
    
    formatSensorValue(deviceType: string, sensorData: any): string {
        if (!sensorData || !sensorData.lastValue) return 'No data';
        
        const value = sensorData.lastValue;
        const units = {
            'heart_rate': ' BPM',
            'power': ' W', 
            'cadence': ' RPM',
            'speed': ' km/h',
            'trainer': ' km/h'
        };
        
        return `${Math.round(value)}${units[deviceType] || ''}`;
    }

    updateDiscoveredDevices() {
        const container = document.getElementById('availableDevices');
        if (!container) return;
        
        if (this.discoveredDevices.size === 0) {
            container.innerHTML = `
                <div class="text-center py-3 text-muted">
                    <i class="fas fa-search fa-2x mb-2 opacity-50"></i>
                    <p class="mb-0 small">No devices found</p>
                    <small>Start scanning to find sensors</small>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        
        // Show only unconnected devices
        this.discoveredDevices.forEach(device => {
            if (!this.connectedDevices.has(device.deviceId)) {
                const deviceElement = this.createDiscoveredDeviceElement(device);
                container.appendChild(deviceElement);
            }
        });
        
        // Update sensor category slots with connected devices
        this.updateSensorCategorySlots();
    }

    createDiscoveredDeviceElement(device: any) {
        const div = document.createElement('div');
        div.className = 'device-list-item discovered';
        div.id = `discovered-${device.deviceId}`;
        
        div.innerHTML = `
            <div class="d-flex justify-content-between align-items-center w-100">
                <div class="flex-grow-1">
                    <div class="fw-bold d-flex align-items-center mb-1">
                        <i class="fas fa-heartbeat me-2"></i>
                        ${device.displayName || device.name || 'Unknown Device'}
                        ${device.manufacturer ? `<small class="text-muted ms-2">${device.manufacturer}</small>` : ''}
                    </div>
                </div>
            </div>
        `;
        
        return div;
    }
}

describe('Sensor Categories Implementation', () => {
    let dashboard: MockDashboard;

    beforeEach(() => {
        dashboard = new MockDashboard();
        // Reset DOM state
        document.body.innerHTML = dom.window.document.body.innerHTML;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Sensor Category Slots', () => {
        it('should have all sensor category slots present in DOM', () => {
            const heartRateSlot = document.getElementById('heartRateSlot');
            const powerSlot = document.getElementById('powerSlot');
            const cadenceSlot = document.getElementById('cadenceSlot');
            const speedSlot = document.getElementById('speedSlot');

            expect(heartRateSlot).toBeTruthy();
            expect(powerSlot).toBeTruthy();
            expect(cadenceSlot).toBeTruthy();
            expect(speedSlot).toBeTruthy();
        });

        it('should initialize all slots as empty', () => {
            const slots = ['heartRateSlot', 'powerSlot', 'cadenceSlot', 'speedSlot'];
            
            slots.forEach(slotId => {
                const slot = document.getElementById(slotId);
                expect(slot?.classList.contains('empty')).toBe(true);
                expect(slot?.classList.contains('connected')).toBe(false);
                
                const emptyState = slot?.querySelector('.sensor-empty-state') as HTMLElement;
                expect(emptyState?.style.display).not.toBe('none');
            });
        });

        it('should reset slots correctly', () => {
            const heartRateSlot = document.getElementById('heartRateSlot');
            
            // Simulate connected state
            heartRateSlot?.classList.add('connected');
            heartRateSlot?.classList.remove('empty');
            
            dashboard.resetSensorSlot('heartRateSlot');
            
            expect(heartRateSlot?.classList.contains('empty')).toBe(true);
            expect(heartRateSlot?.classList.contains('connected')).toBe(false);
            
            const deviceInfo = heartRateSlot?.querySelector('.sensor-device-info') as HTMLElement;
            const emptyState = heartRateSlot?.querySelector('.sensor-empty-state') as HTMLElement;
            
            expect(deviceInfo?.style.display).toBe('none');
            expect(emptyState?.style.display).toBe('block');
        });

        it('should populate slot with device data', () => {
            const mockDevice = {
                deviceId: 'hr-001',
                name: 'Polar H10',
                displayName: 'Polar H10 Heart Rate Monitor',
                type: 'heart_rate'
            };

            const mockSensorData = {
                lastValue: 75,
                lastUpdate: new Date().toISOString()
            };

            dashboard.deviceMetrics.set('hr-001', mockSensorData);
            dashboard.populateSensorSlot('heartRateSlot', mockDevice);

            const heartRateSlot = document.getElementById('heartRateSlot');
            const deviceInfo = heartRateSlot?.querySelector('.sensor-device-info') as HTMLElement;
            const emptyState = heartRateSlot?.querySelector('.sensor-empty-state') as HTMLElement;
            const deviceName = heartRateSlot?.querySelector('.sensor-device-name') as HTMLElement;
            const deviceStatus = heartRateSlot?.querySelector('.sensor-device-status') as HTMLElement;
            const deviceValue = heartRateSlot?.querySelector('.sensor-device-value') as HTMLElement;

            expect(heartRateSlot?.classList.contains('connected')).toBe(true);
            expect(heartRateSlot?.classList.contains('empty')).toBe(false);
            expect(deviceInfo?.style.display).toBe('block');
            expect(emptyState?.style.display).toBe('none');
            expect(deviceName?.textContent).toBe('Polar H10 Heart Rate Monitor');
            expect(deviceStatus?.textContent).toBe('Connected');
            expect(deviceValue?.textContent).toBe('75 BPM');
        });
    });

    describe('Device Category Mapping', () => {
        it('should map heart rate devices to heart rate slot', () => {
            const heartRateDevice = {
                deviceId: 'hr-001',
                name: 'Polar H10',
                type: 'heart_rate'
            };

            dashboard.connectedDevices.set('hr-001', heartRateDevice);
            dashboard.updateSensorCategorySlots();

            const heartRateSlot = document.getElementById('heartRateSlot');
            expect(heartRateSlot?.classList.contains('connected')).toBe(true);
        });

        it('should map power devices to power slot', () => {
            const powerDevice = {
                deviceId: 'pw-001',
                name: 'Stages Power Meter',
                type: 'power'
            };

            dashboard.connectedDevices.set('pw-001', powerDevice);
            dashboard.updateSensorCategorySlots();

            const powerSlot = document.getElementById('powerSlot');
            expect(powerSlot?.classList.contains('connected')).toBe(true);
        });

        it('should map trainer devices to speed slot', () => {
            const trainerDevice = {
                deviceId: 'tr-001',
                name: 'Wahoo KICKR',
                type: 'trainer'
            };

            dashboard.connectedDevices.set('tr-001', trainerDevice);
            dashboard.updateSensorCategorySlots();

            const speedSlot = document.getElementById('speedSlot');
            expect(speedSlot?.classList.contains('connected')).toBe(true);
        });
    });

    describe('Sensor Value Formatting', () => {
        it('should format heart rate values correctly', () => {
            const sensorData = { lastValue: 75.8 };
            const result = dashboard.formatSensorValue('heart_rate', sensorData);
            expect(result).toBe('76 BPM');
        });

        it('should format power values correctly', () => {
            const sensorData = { lastValue: 250.3 };
            const result = dashboard.formatSensorValue('power', sensorData);
            expect(result).toBe('250 W');
        });

        it('should format cadence values correctly', () => {
            const sensorData = { lastValue: 85.7 };
            const result = dashboard.formatSensorValue('cadence', sensorData);
            expect(result).toBe('86 RPM');
        });

        it('should format speed values correctly', () => {
            const sensorData = { lastValue: 32.4 };
            const result = dashboard.formatSensorValue('speed', sensorData);
            expect(result).toBe('32 km/h');
        });

        it('should handle missing sensor data', () => {
            const result = dashboard.formatSensorValue('heart_rate', null);
            expect(result).toBe('No data');
        });
    });

    describe('Available Devices Section', () => {
        it('should show empty state when no devices discovered', () => {
            dashboard.updateDiscoveredDevices();
            
            const availableDevices = document.getElementById('availableDevices');
            const emptyStateText = availableDevices?.querySelector('p');
            
            expect(emptyStateText?.textContent).toBe('No devices found');
        });

        it('should populate available devices section', () => {
            const mockDevice = {
                deviceId: 'hr-002',
                name: 'Garmin HRM',
                type: 'heart_rate'
            };

            dashboard.discoveredDevices.set('hr-002', mockDevice);
            dashboard.updateDiscoveredDevices();

            const availableDevices = document.getElementById('availableDevices');
            const deviceElement = availableDevices?.querySelector('.device-list-item');
            
            expect(deviceElement).toBeTruthy();
            expect(deviceElement?.id).toBe('discovered-hr-002');
        });

        it('should hide connected devices from available devices list', () => {
            const mockDevice = {
                deviceId: 'hr-003',
                name: 'Wahoo TICKR',
                type: 'heart_rate'
            };

            dashboard.discoveredDevices.set('hr-003', mockDevice);
            dashboard.connectedDevices.set('hr-003', mockDevice);
            dashboard.updateDiscoveredDevices();

            const availableDevices = document.getElementById('availableDevices');
            const deviceElement = availableDevices?.querySelector('#discovered-hr-003');
            
            expect(deviceElement).toBeFalsy();
        });
    });

    describe('Integration Tests', () => {
        it('should handle multiple devices across different categories', () => {
            const devices = [
                { deviceId: 'hr-001', name: 'Polar H10', type: 'heart_rate' },
                { deviceId: 'pw-001', name: 'Stages', type: 'power' },
                { deviceId: 'cd-001', name: 'Garmin Cadence', type: 'cadence' }
            ];

            devices.forEach(device => {
                dashboard.connectedDevices.set(device.deviceId, device);
            });

            dashboard.updateSensorCategorySlots();

            expect(document.getElementById('heartRateSlot')?.classList.contains('connected')).toBe(true);
            expect(document.getElementById('powerSlot')?.classList.contains('connected')).toBe(true);
            expect(document.getElementById('cadenceSlot')?.classList.contains('connected')).toBe(true);
            expect(document.getElementById('speedSlot')?.classList.contains('empty')).toBe(true);
        });
    });
});