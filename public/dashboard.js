// UltiBiker Dashboard JavaScript

// Error Handler Class
class ErrorHandler {
    constructor() {
        this.toastId = 0;
        this.setupErrorDialogHandlers();
        this.setupGlobalErrorHandlers();
    }

    setupErrorDialogHandlers() {
        const overlay = document.getElementById('errorOverlay');
        const closeBtn = document.getElementById('errorCloseBtn');
        const okBtn = document.getElementById('errorOkBtn');
        const retryBtn = document.getElementById('errorRetryBtn');
        const reloadBtn = document.getElementById('errorReloadBtn');
        const toggleDetailsBtn = document.getElementById('errorToggleDetails');
        const detailsDiv = document.getElementById('errorDetails');

        // Close dialog handlers
        const closeDialog = () => this.hideErrorDialog();
        
        if (closeBtn) closeBtn.addEventListener('click', closeDialog);
        if (okBtn) okBtn.addEventListener('click', closeDialog);
        
        // Click outside to close
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeDialog();
            });
        }

        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlay && overlay.classList.contains('show')) {
                closeDialog();
            }
        });

        // Retry button
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                if (this.currentRetryAction) {
                    this.currentRetryAction();
                }
                closeDialog();
            });
        }

        // Reload button
        if (reloadBtn) {
            reloadBtn.addEventListener('click', () => {
                window.location.reload();
            });
        }

        // Toggle details button
        if (toggleDetailsBtn) {
            toggleDetailsBtn.addEventListener('click', () => {
                if (detailsDiv) {
                    const isShowing = detailsDiv.classList.contains('show');
                    detailsDiv.classList.toggle('show');
                    toggleDetailsBtn.textContent = isShowing ? 'Show technical details' : 'Hide technical details';
                }
            });
        }
    }

    setupGlobalErrorHandlers() {
        // Global JavaScript errors
        window.addEventListener('error', (event) => {
            this.handleError({
                type: 'JavaScript Error',
                message: event.message,
                details: `File: ${event.filename}\nLine: ${event.lineno}:${event.colno}\nError: ${event.error?.stack || event.message}`,
                showReload: true
            });
        });

        // Unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError({
                type: 'Unhandled Promise Rejection',
                message: 'An unexpected error occurred in the application',
                details: event.reason?.stack || event.reason?.toString() || 'Unknown promise rejection',
                showReload: true
            });
        });

        // Network errors (for fetch requests)
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            try {
                const response = await originalFetch.apply(this, args);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response;
            } catch (error) {
                this.handleNetworkError(error, args[0]);
                throw error;
            }
        };
    }

    handleNetworkError(error, url) {
        let message = 'Network connection failed';
        let details = error.message;

        if (error.message.includes('Failed to fetch')) {
            message = 'Unable to connect to the server';
            details = `Connection failed to: ${url}\n\nThis could be due to:\n• Server is not running\n• Network connectivity issues\n• Firewall blocking the connection`;
        } else if (error.message.includes('HTTP 404')) {
            message = 'Resource not found';
            details = `The requested resource was not found: ${url}`;
        } else if (error.message.includes('HTTP 500')) {
            message = 'Server error occurred';
            details = `Internal server error when requesting: ${url}`;
        }

        this.showToast(message, 'error');
    }

    showErrorDialog(config) {
        const {
            type = 'error',
            title = 'Error',
            message = 'An unexpected error occurred',
            details = null,
            showRetry = false,
            showReload = false,
            retryAction = null
        } = config;

        // Store retry action
        this.currentRetryAction = retryAction;

        // Update dialog content
        const overlay = document.getElementById('errorOverlay');
        const icon = document.getElementById('errorIcon');
        const titleEl = document.getElementById('errorTitle');
        const messageEl = document.getElementById('errorMessage');
        const detailsEl = document.getElementById('errorDetails');
        const toggleDetailsBtn = document.getElementById('errorToggleDetails');
        const retryBtn = document.getElementById('errorRetryBtn');
        const reloadBtn = document.getElementById('errorReloadBtn');

        // Set icon and type
        if (icon) {
            icon.className = `error-icon ${type}`;
            const iconMap = {
                error: 'fas fa-exclamation-triangle',
                warning: 'fas fa-exclamation-circle',
                info: 'fas fa-info-circle',
                success: 'fas fa-check-circle'
            };
            icon.innerHTML = `<i class="${iconMap[type] || iconMap.error}"></i>`;
        }

        // Set content
        if (titleEl) titleEl.textContent = title;
        if (messageEl) messageEl.textContent = message;

        // Handle details
        if (details && detailsEl && toggleDetailsBtn) {
            detailsEl.textContent = details;
            toggleDetailsBtn.style.display = 'block';
            detailsEl.classList.remove('show');
            toggleDetailsBtn.textContent = 'Show technical details';
        } else if (toggleDetailsBtn) {
            toggleDetailsBtn.style.display = 'none';
        }

        // Show/hide action buttons
        if (retryBtn) {
            retryBtn.style.display = showRetry ? 'inline-flex' : 'none';
        }
        if (reloadBtn) {
            reloadBtn.style.display = showReload ? 'inline-flex' : 'none';
        }

        // Show dialog
        if (overlay) {
            overlay.classList.add('show');
        }
    }

    hideErrorDialog() {
        const overlay = document.getElementById('errorOverlay');
        if (overlay) {
            overlay.classList.remove('show');
        }
        this.currentRetryAction = null;
    }

    showToast(message, type = 'info', description = null, duration = 5000) {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toastId = `toast-${++this.toastId}`;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.id = toastId;

        const iconMap = {
            success: 'fas fa-check',
            error: 'fas fa-exclamation-triangle',
            warning: 'fas fa-exclamation-circle',
            info: 'fas fa-info-circle'
        };

        toast.innerHTML = `
            <div class="toast-icon">
                <i class="${iconMap[type] || iconMap.info}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-message">${message}</div>
                ${description ? `<div class="toast-description">${description}</div>` : ''}
            </div>
            <button class="toast-close" onclick="errorHandler.removeToast('${toastId}')">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(toast);

        // Show with animation
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                this.removeToast(toastId);
            }, duration);
        }

        return toastId;
    }

    removeToast(toastId) {
        const toast = document.getElementById(toastId);
        if (toast) {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    }

    // Convenience methods
    handleError(config) {
        console.error('Error handled:', config);
        this.showErrorDialog(config);
    }

    handleConnectionError(retryAction = null) {
        this.showErrorDialog({
            type: 'error',
            title: 'Connection Error',
            message: 'Unable to connect to the UltiBiker server. Please check that the server is running and try again.',
            details: 'Connection failed to ws://localhost:3000\n\nTroubleshooting steps:\n1. Ensure the UltiBiker server is running\n2. Check if port 3000 is accessible\n3. Verify no firewall is blocking the connection\n4. Try refreshing the page',
            showRetry: !!retryAction,
            showReload: true,
            retryAction
        });
    }

    handleSensorError(error, deviceName = 'sensor') {
        this.showErrorDialog({
            type: 'warning',
            title: 'Sensor Connection Issue',
            message: `There was a problem connecting to ${deviceName}. This might be due to hardware permissions or device compatibility.`,
            details: error.stack || error.message,
            showRetry: true,
            retryAction: () => {
                // Trigger sensor retry logic
                if (window.dashboard && window.dashboard.startScan) {
                    window.dashboard.startScan();
                }
            }
        });
    }

    handlePermissionError(permission, instructions = '') {
        this.showErrorDialog({
            type: 'warning',
            title: 'Permission Required',
            message: `${permission} permission is required for UltiBiker to work properly.`,
            details: instructions || `Please grant ${permission} permission and try again.\n\nOn most browsers, you can find this in:\n• Chrome: Settings > Privacy & Security > Site Settings\n• Firefox: Settings > Privacy & Security > Permissions`,
            showReload: true
        });
    }

    handleServerError(error) {
        this.showErrorDialog({
            type: 'error',
            title: 'Server Error',
            message: 'The UltiBiker server encountered an error while processing your request.',
            details: error.message || 'Unknown server error',
            showReload: true
        });
    }
}

// Initialize global error handler
const errorHandler = new ErrorHandler();

class UltiBikerDashboard {
    constructor() {
        this.socket = io();
        this.isScanning = false;
        this.connectedDevices = new Map();
        this.discoveredDevices = new Map();
        this.dataPoints = 0;
        this.lastUpdateTime = null;
        this.dataRateCounter = 0;
        this.dataRateTimer = null;

        // Server permission status
        this.serverPermissions = null;

        // Screen and layout management
        this.screenHeight = window.innerHeight;
        this.screenWidth = window.innerWidth;
        this.layoutMode = this.calculateLayoutMode();
        this.resizeObserver = null;

        // Tab system
        this.currentTab = 'devices';
        this.rawDataBuffer = [];
        this.maxRawDataLines = 50;
        
        // Session management
        this.currentSessionId = null;
        this.isRecording = false;
        this.liveTimeInterval = null;
        this.deviceMetrics = new Map();
        this.permissionUpdateInterval = null;

        // Chart setup
        this.chart = null;
        this.chartData = {
            heart_rate: [],
            power: [],
            cadence: [],
            speed: []
        };
        this.maxDataPoints = 50;

        this.init();
    }

    init() {
        this.setupSocketHandlers();
        this.setupEventListeners();
        this.setupResponsiveLayout();
        this.setupTabSystem();
        this.initializeChart();
        this.startDataRateCalculation();
        this.startLiveTimeUpdate();
        
        // Set up permission UI handlers
        this.setupPermissionHandlers();
        
        // Check permissions after initialization (both browser and server)
        setTimeout(() => {
            this.checkPermissions(); // Browser permissions
            this.checkServerPermissions(); // Server permissions
        }, 1000);

        // Start periodic permission status updates
        this.startPermissionStatusUpdates();
        
        console.log('🚴 UltiBiker Dashboard initialized');
        console.log(`📐 Screen: ${this.screenWidth}x${this.screenHeight}, Layout: ${this.layoutMode}`);
    }

    setupSocketHandlers() {
        // Connection status
        this.socket.on('connect', () => {
            console.log('🔌 Connected to UltiBiker server');
            this.updateConnectionStatus('connected');
            
            // Subscribe to events when we connect
            this.subscribeToEvents();
        });

        this.socket.on('disconnect', () => {
            console.log('🔌 Disconnected from UltiBiker server');
            this.updateConnectionStatus('disconnected');
            errorHandler.handleConnectionError(() => {
                window.location.reload();
            });
        });

        // Device events - corrected event names to match backend
        this.socket.on('device-list', (data) => {
            console.log('📱 Received device list:', data);
            this.updateDeviceList(data.discovered, data.connected);
            this.updateLiveDeviceCount();
        });

        // Listen for device discovery events
        this.socket.on('device-event', (event) => {
            console.log('📱 Device event received:', event);
            if (event.type === 'scan-result') {
                console.log('🔍 Device discovered:', event.device);
                this.discoveredDevices.set(event.device.deviceId, event.device);
                this.updateDiscoveredDevices();
            } else if (event.type === 'device-status') {
                console.log('📱 Device status update:', event);
                this.handleDeviceStatusUpdate(event);
                this.updateLiveDeviceCount();
                this.updateDeviceStatusDisplay();
            }
        });

        // Backward compatibility for device-discovered events
        this.socket.on('device-discovered', (device) => {
            console.log('🔍 Device discovered (legacy):', device);
            this.discoveredDevices.set(device.deviceId, device);
            this.updateDiscoveredDevices();
        });

        // Backward compatibility for device-status events
        this.socket.on('device-status', (event) => {
            console.log('📱 Device status update (legacy):', event);
            this.handleDeviceStatusUpdate(event);
            this.updateLiveDeviceCount();
            this.updateDeviceStatusDisplay();
        });

        // Sensor data
        this.socket.on('sensor-data', (reading) => {
            console.log('📊 Sensor data received:', reading);
            this.handleSensorData(reading);
        });

        // Scan status
        this.socket.on('scan-status', (status) => {
            console.log('📡 Scan status:', status);
            this.isScanning = status.scanning;
            this.updateScanUI();
        });

        // Session events
        this.socket.on('session-started', (data) => {
            console.log('🚴 Session started:', data);
            this.updateSessionUI(true, data.sessionId, data.sessionName);
            this.showNotification(`Session started: ${data.sessionName}`, 'success');
        });
        
        this.socket.on('session-stopped', (data) => {
            console.log('⏹️ Session stopped:', data);
            this.updateSessionUI(false);
            this.showNotification('Session stopped', 'info');
        });

        // Error handling
        this.socket.on('error', (error) => {
            console.error('❌ Socket error:', error);
            errorHandler.handleServerError(error);
        });

        // Connection error handling
        this.socket.on('connect_error', (error) => {
            console.error('❌ Connection error:', error);
            errorHandler.handleConnectionError(() => {
                this.socket.connect();
            });
        });
    }

    // Subscribe to all necessary events
    subscribeToEvents() {
        console.log('📡 Subscribing to WebSocket events...');
        
        // Subscribe to device events
        this.socket.emit('subscribe-device-events', (response) => {
            if (response.success) {
                console.log('✅ Subscribed to device events');
            } else {
                console.error('❌ Failed to subscribe to device events');
            }
        });

        // Subscribe to sensor data
        this.socket.emit('subscribe-sensor-data', (response) => {
            if (response.success) {
                console.log('✅ Subscribed to sensor data');
            } else {
                console.error('❌ Failed to subscribe to sensor data');
            }
        });

        // Subscribe to session events
        this.socket.emit('subscribe-session-events', (response) => {
            if (response.success) {
                console.log('✅ Subscribed to session events');
            } else {
                console.error('❌ Failed to subscribe to session events');
            }
        });

        // Request current status
        this.socket.emit('get-status', (response) => {
            if (response.success) {
                console.log('📊 Current system status:', response.status);
                this.updateSystemStatus(response.status);
            } else {
                console.error('❌ Failed to get system status');
            }
        });
    }

    setupEventListeners() {
        // Scan buttons
        const scanBtn = document.getElementById('scanBtn');
        const stopScanBtn = document.getElementById('stopScanBtn');
        
        if (scanBtn) {
            scanBtn.addEventListener('click', () => {
                this.startScan();
            });
        }

        if (stopScanBtn) {
            stopScanBtn.addEventListener('click', () => {
                this.stopScan();
            });
        }
        
        // Session management buttons
        const startSessionBtn = document.getElementById('startSessionBtn');
        const stopSessionBtn = document.getElementById('stopSessionBtn');
        
        if (startSessionBtn) {
            startSessionBtn.addEventListener('click', () => {
                this.startSession();
            });
        }
        
        if (stopSessionBtn) {
            stopSessionBtn.addEventListener('click', () => {
                this.stopSession();
            });
        }
    }
    
    setupTabSystem() {
        // Tab switching functionality
        const tabButtons = document.querySelectorAll('#mainTabs .nav-link');
        
        tabButtons.forEach(button => {
            button.addEventListener('shown.bs.tab', (e) => {
                const targetTab = e.target.getAttribute('data-bs-target');
                this.currentTab = targetTab.includes('devices') ? 'devices' : 'data';
                
                // Initialize chart when switching to data tab
                if (this.currentTab === 'data' && !this.chart) {
                    // Small delay to ensure tab content is visible
                    setTimeout(() => {
                        this.initializeChart();
                    }, 100);
                } else if (this.currentTab === 'data' && this.chart) {
                    // Resize chart when switching back to data tab
                    setTimeout(() => {
                        this.resizeChart();
                    }, 100);
                }
                
                console.log(`📑 Switched to ${this.currentTab} tab`);
            });
        });
    }

    calculateLayoutMode() {
        const height = window.innerHeight;
        const width = window.innerWidth;
        
        // Define layout modes based on screen dimensions
        if (height < 600) {
            return 'compact';
        } else if (height < 800) {
            return 'normal';
        } else if (height >= 1200) {
            return 'expanded';
        } else {
            return 'standard';
        }
    }

    setupResponsiveLayout() {
        // Initial layout application
        this.applyLayoutMode();
        
        // Window resize handler
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // Optional: Use ResizeObserver for more precise detection
        if (window.ResizeObserver) {
            this.resizeObserver = new ResizeObserver(() => {
                this.handleResize();
            });
            this.resizeObserver.observe(document.body);
        }

        // Detect orientation changes on mobile
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleResize();
            }, 100); // Small delay to ensure dimensions are updated
        });
    }

    handleResize() {
        const oldLayoutMode = this.layoutMode;
        this.screenHeight = window.innerHeight;
        this.screenWidth = window.innerWidth;
        this.layoutMode = this.calculateLayoutMode();

        if (oldLayoutMode !== this.layoutMode) {
            console.log(`📐 Layout mode changed: ${oldLayoutMode} → ${this.layoutMode}`);
            this.applyLayoutMode();
            this.resizeChart();
        }
    }

    applyLayoutMode() {
        const body = document.body;
        const container = document.querySelector('.container-fluid');
        
        // Remove existing layout classes
        body.classList.remove('layout-compact', 'layout-normal', 'layout-standard', 'layout-expanded');
        
        // Apply new layout class
        body.classList.add(`layout-${this.layoutMode}`);
        
        // Apply layout-specific configurations
        switch (this.layoutMode) {
            case 'compact':
                this.applyCompactLayout();
                break;
            case 'normal':
                this.applyNormalLayout();
                break;
            case 'standard':
                this.applyStandardLayout();
                break;
            case 'expanded':
                this.applyExpandedLayout();
                break;
        }
    }

    applyCompactLayout() {
        // For small screens (< 600px height)
        console.log('📱 Applying compact layout for small screens');
        
        // Reduce chart height significantly
        this.setChartHeight(200);
        
        // Stack metrics in single row on mobile
        const metricsRow = document.querySelector('.row.g-3.mb-4');
        if (metricsRow) {
            metricsRow.classList.add('metrics-compact');
        }

        // Hide data stream info on very small screens
        const dataStreamCard = document.querySelector('.card.device-card:last-child');
        if (dataStreamCard && this.screenHeight < 500) {
            dataStreamCard.style.display = 'none';
        }
    }

    applyNormalLayout() {
        // For medium screens (600-800px height)
        console.log('💻 Applying normal layout for medium screens');
        
        this.setChartHeight(250);
        
        // Show essential elements
        const dataStreamCard = document.querySelector('.card.device-card:last-child');
        if (dataStreamCard) {
            dataStreamCard.style.display = 'block';
        }
    }

    applyStandardLayout() {
        // For standard screens (800-1200px height)
        console.log('🖥️ Applying standard layout for desktop screens');
        
        this.setChartHeight(360);
        
        // Standard layout - all elements visible
        const metricsRow = document.querySelector('.row.g-3.mb-4');
        if (metricsRow) {
            metricsRow.classList.remove('metrics-compact');
        }
    }

    applyExpandedLayout() {
        // For large screens (>= 1200px height)
        console.log('🖨️ Applying expanded layout for large screens');
        
        this.setChartHeight(480);
        
        // Could add additional elements or larger spacing for big screens
        const chartContainer = document.querySelector('.chart-container');
        if (chartContainer) {
            chartContainer.style.marginTop = '30px';
        }
    }

    setChartHeight(height) {
        const chartContainer = document.querySelector('.chart-container');
        const canvas = document.getElementById('liveChart');
        
        if (chartContainer) {
            chartContainer.style.height = `${height + 40}px`;
            chartContainer.style.maxHeight = `${height + 40}px`;
        }
        
        if (canvas && canvas.parentNode) {
            canvas.parentNode.style.height = `${height}px`;
            canvas.parentNode.style.maxHeight = `${height}px`;
        }

        // Store the current height for chart resize
        this.currentChartHeight = height;
    }

    resizeChart() {
        if (this.chart) {
            // Force chart resize
            this.chart.resize();
            this.chart.update('none');
        }
    }

    initializeChart() {
        const ctx = document.getElementById('liveChart').getContext('2d');
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Heart Rate (BPM)',
                        data: [],
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4
                    },
                    {
                        label: 'Power (W)',
                        data: [],
                        borderColor: '#f97316',
                        backgroundColor: 'rgba(249, 115, 22, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4,
                        yAxisID: 'y1'
                    },
                    {
                        label: 'Cadence (RPM)',
                        data: [],
                        borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4
                    },
                    {
                        label: 'Speed (km/h)',
                        data: [],
                        borderColor: '#06b6d4',
                        backgroundColor: 'rgba(6, 182, 212, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 10,
                        bottom: 10,
                        left: 10,
                        right: 10
                    }
                },
                interaction: {
                    intersect: false,
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Time'
                        },
                        ticks: {
                            maxTicksLimit: 10
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'BPM / RPM'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Power (W) / Speed (km/h)'
                        },
                        grid: {
                            drawOnChartArea: false,
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    title: {
                        display: false
                    }
                },
                animation: {
                    duration: 0
                },
                elements: {
                    point: {
                        radius: 2,
                        hoverRadius: 4
                    }
                }
            }
        });
        
        this.chart.canvas.parentNode.style.height = '360px';
        this.chart.canvas.parentNode.style.maxHeight = '360px';
    }

    startDataRateCalculation() {
        this.dataRateTimer = setInterval(() => {
            const rate = this.dataRateCounter;
            const dataRateElement = document.getElementById('dataRate');
            if (dataRateElement) {
                dataRateElement.textContent = `${rate} Hz`;
            }
            this.dataRateCounter = 0;
        }, 1000);
    }

    updateConnectionStatus(status) {
        const statusElement = document.getElementById('connectionStatus');
        
        if (statusElement) {
            if (status === 'connected') {
                statusElement.innerHTML = '<span class="status-indicator status-connected"></span><span>Connected</span>';
            } else {
                statusElement.innerHTML = '<span class="status-indicator status-disconnected"></span><span>Disconnected</span>';
            }
        }
    }

    handleSensorData(reading) {
        this.dataPoints++;
        this.dataRateCounter++;
        this.lastUpdateTime = new Date();
        
        // Track device metrics
        this.deviceMetrics.set(reading.deviceId, {
            lastValue: reading.value,
            lastUpdate: new Date(),
            metricType: reading.metricType
        });
        
        // Update metric displays
        this.updateMetricDisplay(reading.metricType, reading.value, reading.unit, reading.deviceId);
        
        // Update chart
        this.updateChart(reading);
        
        // Update info panel
        this.updateInfoPanel();
        
        // Update raw data stream
        this.updateRawDataStream(reading);
    }

    updateMetricDisplay(metricType, value, unit, deviceId = null) {
        let elementId, deviceElementId;
        let displayValue = Math.round(value * 10) / 10; // Round to 1 decimal place
        
        switch (metricType) {
            case 'heart_rate':
                elementId = 'heartRate';
                deviceElementId = 'heartRateDevice';
                displayValue = Math.round(value); // Whole numbers for heart rate
                break;
            case 'power':
                elementId = 'power';
                deviceElementId = 'powerDevice';
                displayValue = Math.round(value);
                break;
            case 'cadence':
                elementId = 'cadence';
                deviceElementId = 'cadenceDevice';
                displayValue = Math.round(value);
                break;
            case 'speed':
                elementId = 'speed';
                deviceElementId = 'speedDevice';
                break;
            default:
                return;
        }
        
        const element = document.getElementById(elementId);
        const deviceElement = document.getElementById(deviceElementId);
        
        if (element) {
            element.textContent = displayValue;
            
            // Update device attribution
            if (deviceElement && deviceId) {
                const deviceName = this.getDeviceName(deviceId);
                deviceElement.textContent = deviceName;
            }
            
            // Add a subtle flash effect
            element.parentElement.parentElement.classList.add('border-primary');
            setTimeout(() => {
                element.parentElement.parentElement.classList.remove('border-primary');
            }, 200);
        }
    }

    updateChart(reading) {
        const now = new Date().toLocaleTimeString();
        const datasets = this.chart.data.datasets;
        const labels = this.chart.data.labels;
        
        // Add timestamp
        labels.push(now);
        if (labels.length > this.maxDataPoints) {
            labels.shift();
        }
        
        // Update dataset based on metric type
        let datasetIndex;
        switch (reading.metricType) {
            case 'heart_rate':
                datasetIndex = 0;
                break;
            case 'power':
                datasetIndex = 1;
                break;
            case 'cadence':
                datasetIndex = 2;
                break;
            case 'speed':
                datasetIndex = 3;
                break;
            default:
                return;
        }
        
        // Ensure all datasets have the same length
        datasets.forEach((dataset, index) => {
            if (index === datasetIndex) {
                dataset.data.push(reading.value);
            } else {
                dataset.data.push(null); // Add null for other datasets
            }
            
            if (dataset.data.length > this.maxDataPoints) {
                dataset.data.shift();
            }
        });
        
        this.chart.update('none'); // Update without animation
    }

    updateInfoPanel() {
        const dataPointsElement = document.getElementById('dataPointsCount');
        const lastUpdateElement = document.getElementById('lastUpdate');
        const dataRateDisplayElement = document.getElementById('dataRateDisplay');
        
        if (dataPointsElement) {
            dataPointsElement.textContent = this.dataPoints;
        }
        
        if (lastUpdateElement && this.lastUpdateTime) {
            lastUpdateElement.textContent = this.lastUpdateTime.toLocaleTimeString();
        }
        
        if (dataRateDisplayElement) {
            dataRateDisplayElement.textContent = this.dataRateCounter;
        }
    }
    
    updateRawDataStream(reading) {
        const rawDataElement = document.getElementById('rawDataStream');
        if (!rawDataElement) return;
        
        const timestamp = new Date().toLocaleTimeString();
        const deviceName = this.getDeviceName(reading.deviceId) || reading.deviceId;
        const dataLine = `${timestamp} | ${deviceName}: ${reading.value} ${reading.unit || ''}`;
        
        // Add to buffer
        this.rawDataBuffer.unshift(dataLine);
        
        // Limit buffer size
        if (this.rawDataBuffer.length > this.maxRawDataLines) {
            this.rawDataBuffer.pop();
        }
        
        // Update display
        if (this.rawDataBuffer.length > 0) {
            rawDataElement.innerHTML = this.rawDataBuffer
                .map(line => `<div class="text-dark">${line}</div>`)
                .join('');
        }
        
        // Auto-scroll to top (newest data)
        rawDataElement.scrollTop = 0;
    }
    
    getDeviceName(deviceId) {
        // Check connected devices first
        const connectedDevice = this.connectedDevices.get(deviceId);
        if (connectedDevice) {
            return connectedDevice.name;
        }
        
        // Check discovered devices
        const discoveredDevice = this.discoveredDevices.get(deviceId);
        if (discoveredDevice) {
            return discoveredDevice.name;
        }
        
        // Return shortened ID as fallback
        return deviceId.length > 8 ? deviceId.substring(0, 8) + '...' : deviceId;
    }

    async startScan() {
        console.log('🔍 Starting device scan...');
        
        // Check if we have Web Bluetooth permission first
        const hasPermissions = await this.checkPermissions();
        if (!hasPermissions && navigator.bluetooth) {
            console.log('🔒 Web Bluetooth permission needed - requesting now');
            
            // Show info about permission request
            this.showNotification('Requesting Bluetooth access for device scanning...', 'info');
            
            // Request permission
            const granted = await this.requestBluetoothPermission();
            if (!granted) {
                console.log('❌ Bluetooth permission not granted - scan cancelled');
                return;
            }
        }
        
        this.socket.emit('start-scanning', (response) => {
            if (response && response.success) {
                this.isScanning = true;
                this.updateScanUI();
                this.showNotification('Device scan started successfully', 'success');
                
                // Clear discovered devices to show fresh results
                this.discoveredDevices.clear();
                this.updateDiscoveredDevices();
            } else {
                const error = response?.error || 'Unknown scan error';
                console.error('❌ Failed to start scan:', error);
                
                // Show detailed error dialog for scan failures
                errorHandler.showErrorDialog({
                    type: 'warning',
                    title: 'Scan Failed',
                    message: 'Unable to start device scanning. This might be due to missing permissions or hardware issues.',
                    details: `Error: ${error}\n\nCommon causes:\n• Bluetooth not enabled\n• Missing device permissions\n• ANT+ USB stick not connected\n• Browser security restrictions`,
                    showRetry: true,
                    retryAction: () => this.startScan()
                });
            }
        });
    }

    stopScan() {
        console.log('⏹️ Stopping device scan...');
        this.socket.emit('stop-scanning', (response) => {
            if (response.success) {
                this.isScanning = false;
                this.updateScanUI();
                this.showNotification('Device scan stopped', 'info');
            } else {
                console.error('❌ Failed to stop scan:', response.error);
                this.showNotification(`Failed to stop scan: ${response.error}`, 'error');
            }
        });
    }

    updateScanUI() {
        const scanBtn = document.getElementById('scanBtn');
        const stopScanBtn = document.getElementById('stopScanBtn');
        const scanStatus = document.getElementById('scanStatus');
        
        if (!scanBtn || !stopScanBtn || !scanStatus) return;
        
        if (this.isScanning) {
            scanBtn.style.display = 'none';
            stopScanBtn.style.display = 'inline-block';
            scanStatus.textContent = 'Scanning...';
            scanStatus.className = 'badge bg-warning align-self-center';
        } else {
            scanBtn.style.display = 'inline-block';
            stopScanBtn.style.display = 'none';
            scanStatus.textContent = 'Idle';
            scanStatus.className = 'badge bg-secondary align-self-center';
        }
    }

    updateDeviceList(discovered, connected) {
        // Update internal maps
        discovered.forEach(device => {
            this.discoveredDevices.set(device.deviceId, device);
        });
        
        connected.forEach(device => {
            this.connectedDevices.set(device.deviceId, device);
        });
        
        this.updateDiscoveredDevices();
        this.updateConnectedDevices();
    }

    updateDiscoveredDevices() {
        const container = document.getElementById('discoveredDevices');
        if (!container) return;
        
        if (this.discoveredDevices.size === 0) {
            container.innerHTML = `
                <div class="text-center py-5 text-muted">
                    <i class="fas fa-search fa-3x mb-3 opacity-50"></i>
                    <p class="mb-0">Click "Start Scan" to find sensors</p>
                    <small>ANT+ and Bluetooth devices will appear here</small>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        
        this.discoveredDevices.forEach(device => {
            const isConnected = this.connectedDevices.has(device.deviceId);
            const deviceElement = this.createDeviceElement(device, isConnected);
            container.appendChild(deviceElement);
        });
    }

    updateConnectedDevices() {
        const container = document.getElementById('connectedDevices');
        if (!container) return;
        
        if (this.connectedDevices.size === 0) {
            container.innerHTML = `
                <div class="text-center py-5 text-muted">
                    <i class="fas fa-unlink fa-2x mb-2 opacity-50"></i>
                    <p class="mb-0 small">No devices connected</p>
                    <small>Connected sensors will stream data automatically</small>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        
        this.connectedDevices.forEach(device => {
            const deviceElement = this.createConnectedDeviceElement(device);
            container.appendChild(deviceElement);
        });
    }

    createDeviceElement(device, isConnected) {
        const div = document.createElement('div');
        div.className = 'device-list-item';
        
        const typeIcon = this.getDeviceIcon(device.type);
        const protocolIcon = device.protocol === 'ant_plus' ? 'fas fa-satellite-dish' : 'fab fa-bluetooth';
        const signalClass = this.getSignalClass(device.signalStrength || 0);
        
        div.innerHTML = `
            <div class="d-flex justify-content-between align-items-center w-100">
                <div class="flex-grow-1">
                    <div class="fw-bold d-flex align-items-center mb-1">
                        <i class="${typeIcon} me-2 ${device.type}"></i>
                        ${device.name || 'Unknown Device'}
                    </div>
                    <div class="d-flex align-items-center">
                        <small class="text-muted me-2">
                            <i class="${protocolIcon} me-1"></i>
                            ${(device.protocol || 'unknown').toUpperCase()}
                        </small>
                        <div class="signal-indicator ${signalClass}">
                            <div class="signal-bar"></div>
                            <div class="signal-bar"></div>
                            <div class="signal-bar"></div>
                            <div class="signal-bar"></div>
                        </div>
                        <small class="text-muted ms-2">${device.signalStrength || 0}%</small>
                    </div>
                </div>
                <div>
                    ${isConnected 
                        ? `<button class="btn btn-sm btn-outline-danger" onclick="dashboard.disconnectDevice('${device.deviceId}')" title="Disconnect">
                             <i class="fas fa-unlink"></i>
                           </button>`
                        : `<button class="btn btn-sm btn-outline-primary" onclick="dashboard.connectDevice('${device.deviceId}')" title="Connect">
                             <i class="fas fa-link"></i> Add
                           </button>`
                    }
                </div>
            </div>
        `;
        
        return div;
    }
    
    getSignalClass(strength) {
        if (strength >= 80) return 'signal-excellent';
        if (strength >= 60) return 'signal-good';
        if (strength >= 40) return 'signal-fair';
        return 'signal-poor';
    }

    createConnectedDeviceElement(device) {
        const div = document.createElement('div');
        div.className = 'device-list-item bg-success bg-opacity-10 border-success';
        
        const typeIcon = this.getDeviceIcon(device.type);
        const signalClass = this.getSignalClass(device.signalStrength || 0);
        
        div.innerHTML = `
            <div class="d-flex justify-content-between align-items-center w-100">
                <div class="flex-grow-1">
                    <div class="fw-bold d-flex align-items-center mb-1">
                        <i class="${typeIcon} me-2 ${device.type}"></i>
                        ${device.name || 'Unknown Device'}
                    </div>
                    <div class="d-flex align-items-center">
                        <small class="text-success me-2">
                            <i class="fas fa-check-circle me-1"></i>
                            Connected
                        </small>
                        <div class="signal-indicator ${signalClass}">
                            <div class="signal-bar"></div>
                            <div class="signal-bar"></div>
                            <div class="signal-bar"></div>
                            <div class="signal-bar"></div>
                        </div>
                        <small class="text-muted ms-2">${device.signalStrength || 0}%</small>
                    </div>
                </div>
                <div>
                    <button class="btn btn-sm btn-outline-danger" onclick="dashboard.disconnectDevice('${device.deviceId}')" title="Remove">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
        
        return div;
    }

    getDeviceIcon(type) {
        const icons = {
            'heart_rate': 'fas fa-heartbeat',
            'power': 'fas fa-bolt',
            'cadence': 'fas fa-sync-alt',
            'speed': 'fas fa-tachometer-alt',
            'trainer': 'fas fa-dumbbell'
        };
        return icons[type] || 'fas fa-question-circle';
    }

    connectDevice(deviceId) {
        const device = this.discoveredDevices.get(deviceId);
        const deviceName = device?.name || 'device';
        
        this.socket.emit('connect-device', deviceId, (response) => {
            if (response && response.success) {
                this.showNotification(`Successfully connected to ${deviceName}`, 'success');
            } else {
                const error = response?.error || 'Unknown connection error';
                errorHandler.showErrorDialog({
                    type: 'warning',
                    title: 'Device Connection Failed',
                    message: `Unable to connect to ${deviceName}. This might be due to device compatibility or connection issues.`,
                    details: `Error: ${error}\n\nTroubleshooting:\n• Make sure device is in pairing mode\n• Check device battery level\n• Verify device compatibility\n• Try moving closer to device`,
                    showRetry: true,
                    retryAction: () => this.connectDevice(deviceId)
                });
            }
        });
        
        this.showNotification(`Connecting to ${deviceName}...`, 'info');
    }

    disconnectDevice(deviceId) {
        const device = this.connectedDevices.get(deviceId);
        const deviceName = device?.name || 'device';
        
        this.socket.emit('disconnect-device', deviceId, (response) => {
            if (response && response.success) {
                this.showNotification(`Disconnected from ${deviceName}`, 'info');
            } else {
                const error = response?.error || 'Unknown disconnection error';
                this.showNotification(`Failed to disconnect from ${deviceName}: ${error}`, 'error');
            }
        });
        
        this.showNotification(`Disconnecting from ${deviceName}...`, 'info');
    }

    handleDeviceStatusUpdate(event) {
        const { deviceId, status, device } = event;
        
        if (status === 'connected') {
            this.connectedDevices.set(deviceId, device);
            this.showNotification(`Connected to ${device.name}`, 'success');
        } else if (status === 'disconnected') {
            this.connectedDevices.delete(deviceId);
            this.showNotification(`Disconnected from ${device?.name || deviceId}`, 'info');
        }
        
        this.updateDiscoveredDevices();
        this.updateConnectedDevices();
        this.updateLiveDeviceCount();
        this.updateDeviceStatusDisplay();
        
        // Update permission status when device status changes
        if (status === 'connected' || status === 'disconnected') {
            this.checkServerPermissions();
        }
    }

    // Session Management
    startSession() {
        const sessionName = prompt('Enter session name (optional):', `Ride ${new Date().toLocaleDateString()}`);
        if (sessionName === null) return; // User cancelled
        
        this.socket.emit('start-session', { name: sessionName || undefined }, (response) => {
            if (response && response.success) {
                console.log('🚴 Session started successfully');
            } else {
                const error = response?.error || 'Unknown session error';
                errorHandler.showErrorDialog({
                    type: 'error',
                    title: 'Session Start Failed',
                    message: 'Unable to start the workout session. There might be an issue with the server connection.',
                    details: `Error: ${error}\n\nThis could be caused by:\n• Server connection issues\n• Database problems\n• Active session conflicts`,
                    showRetry: true,
                    retryAction: () => this.startSession()
                });
            }
        });
        
        console.log('🚴 Starting workout session...');
    }
    
    stopSession() {
        if (!this.currentSessionId) {
            this.showNotification('No active session to stop', 'warning');
            return;
        }
        
        if (confirm('Are you sure you want to stop the current session?')) {
            this.socket.emit('stop-session', { sessionId: this.currentSessionId });
            console.log('⏹️ Stopping workout session...');
        }
    }
    
    updateSessionUI(isActive, sessionId = null, sessionName = null) {
        const startBtn = document.getElementById('startSessionBtn');
        const stopBtn = document.getElementById('stopSessionBtn');
        const sessionStatus = document.getElementById('sessionStatus');
        const recordingStatus = document.getElementById('recordingStatus');
        const recordingIndicator = document.getElementById('recordingIndicator');
        
        this.isRecording = isActive;
        this.currentSessionId = sessionId;
        
        if (isActive) {
            if (startBtn) startBtn.style.display = 'none';
            if (stopBtn) stopBtn.style.display = 'inline-block';
            if (sessionStatus) {
                sessionStatus.innerHTML = `<span class="badge bg-success">Active Session</span>`;
                if (sessionName) {
                    sessionStatus.innerHTML += `<br><small class="text-muted">${sessionName}</small>`;
                }
            }
            if (recordingStatus) {
                recordingStatus.textContent = 'Recording Data';
                recordingStatus.className = 'fw-bold text-success';
            }
            if (recordingIndicator) recordingIndicator.style.display = 'inline';
        } else {
            if (startBtn) startBtn.style.display = 'inline-block';
            if (stopBtn) stopBtn.style.display = 'none';
            if (sessionStatus) {
                sessionStatus.innerHTML = '<span class="badge bg-secondary">No Active Session</span>';
            }
            if (recordingStatus) {
                recordingStatus.textContent = 'Waiting for Session';
                recordingStatus.className = 'fw-bold text-warning';
            }
            if (recordingIndicator) recordingIndicator.style.display = 'none';
        }
    }

    startLiveTimeUpdate() {
        this.liveTimeInterval = setInterval(() => {
            const now = new Date();
            const timeElement = document.getElementById('liveTime');
            if (timeElement) {
                timeElement.textContent = now.toLocaleTimeString();
            }
        }, 1000);
    }
    
    updateLiveDeviceCount() {
        const liveDeviceCountElement = document.getElementById('liveDeviceCount');
        const deviceCountElement = document.getElementById('deviceCount');
        const count = this.connectedDevices.size;
        
        if (liveDeviceCountElement) {
            liveDeviceCountElement.textContent = count;
        }
        
        if (deviceCountElement) {
            deviceCountElement.textContent = `${count} connected`;
        }
    }
    
    updateDeviceStatusDisplay() {
        const antStatus = document.getElementById('antStatus');
        const bleStatus = document.getElementById('bleStatus');
        
        // Check if we have any ANT+ devices connected
        const hasAntDevices = Array.from(this.connectedDevices.values())
            .some(device => device.protocol === 'ant_plus');
        
        // Check if we have any BLE devices connected  
        const hasBleDevices = Array.from(this.connectedDevices.values())
            .some(device => device.protocol === 'bluetooth');
            
        // Update ANT+ status based on actual hardware availability
        if (antStatus) {
            if (hasAntDevices) {
                antStatus.className = 'badge bg-success';
                antStatus.textContent = 'Connected ✅';
            } else if (this.serverPermissions?.usb?.granted) {
                antStatus.className = 'badge bg-info';
                antStatus.textContent = 'Available 📡';
            } else if (this.serverPermissions?.usb?.denied) {
                antStatus.className = 'badge bg-danger';
                antStatus.textContent = 'Blocked ❌';
            } else {
                antStatus.className = 'badge bg-secondary';
                antStatus.textContent = 'No Stick 📡';
            }
        }
        
        // Update Bluetooth status based on actual hardware availability  
        if (bleStatus) {
            if (hasBleDevices) {
                bleStatus.className = 'badge bg-success';
                bleStatus.textContent = 'Connected ✅';
            } else if (this.serverPermissions?.bluetooth?.granted) {
                bleStatus.className = 'badge bg-info';
                bleStatus.textContent = 'Available 📶';
            } else if (this.serverPermissions?.bluetooth?.denied) {
                bleStatus.className = 'badge bg-danger';
                bleStatus.textContent = 'Denied ❌';
            } else if (this.serverPermissions?.bluetooth?.requiresUserAction) {
                bleStatus.className = 'badge bg-warning';
                bleStatus.textContent = 'Setup Needed ⚠️';
            } else {
                bleStatus.className = 'badge bg-secondary';
                bleStatus.textContent = 'Checking... 📶';
            }
        }
    }

    updateSystemStatus(status) {
        console.log('📊 Updating system status:', status);
        
        // Update any discovered/connected device counts from server
        if (status.discoveredDevices !== undefined) {
            const discoveredElement = document.getElementById('discoveredCount');
            if (discoveredElement) {
                discoveredElement.textContent = status.discoveredDevices;
            }
        }
        
        if (status.connectedDevices !== undefined) {
            const connectedElement = document.getElementById('connectedCount');
            if (connectedElement) {
                connectedElement.textContent = status.connectedDevices;
            }
            this.updateLiveDeviceCount();
        }
        
        // Update active session status
        if (status.activeSession) {
            this.currentSessionId = status.activeSession;
            this.updateSessionUI(true, status.activeSession, 'Active Session');
        }
    }

    showNotification(message, type = 'info', description = null, duration = 5000) {
        // Use the global error handler for notifications
        errorHandler.showToast(message, type, description, duration);
        
        // Keep console logging for debugging
        const emoji = {
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'info': 'ℹ️'
        };
        
        console.log(`${emoji[type] || 'ℹ️'} ${message}`);
    }

    // Widget Editing System
    setupWidgetEditingSystem() {
        // Edit mode toggle button
        const editModeToggle = document.getElementById('editModeToggle');
        if (editModeToggle) {
            editModeToggle.addEventListener('click', () => {
                this.toggleEditMode();
            });
        }

        // Apply saved widget layouts
        this.applyWidgetLayouts();
    }

    toggleEditMode() {
        this.editMode = !this.editMode;
        const body = document.body;
        const editBtn = document.getElementById('editModeToggle');

        if (this.editMode) {
            body.classList.add('edit-mode');
            editBtn.innerHTML = '<i class="fas fa-save"></i> Save Layout';
            editBtn.classList.remove('btn-primary');
            editBtn.classList.add('btn-success');
            this.enableDragDrop();
            this.showNotification('Edit mode enabled - drag widgets to rearrange', 'info');
        } else {
            body.classList.remove('edit-mode');
            editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit Layout';
            editBtn.classList.remove('btn-success');
            editBtn.classList.add('btn-primary');
            this.disableDragDrop();
            this.saveWidgetLayouts();
            this.showNotification('Layout saved!', 'success');
        }
    }

    enableDragDrop() {
        const widgets = document.querySelectorAll('.widget');
        
        widgets.forEach(widget => {
            // Add drag event listeners
            widget.addEventListener('dragstart', (e) => {
                this.handleDragStart(e);
            });

            widget.addEventListener('dragend', (e) => {
                this.handleDragEnd(e);
            });

            // Add drop zone capabilities
            widget.addEventListener('dragover', (e) => {
                this.handleDragOver(e);
            });

            widget.addEventListener('drop', (e) => {
                this.handleDrop(e);
            });
        });

        // Container drop zones
        const container = document.getElementById('dashboardContainer');
        container.addEventListener('dragover', (e) => {
            this.handleDragOver(e);
        });
        container.addEventListener('drop', (e) => {
            this.handleContainerDrop(e);
        });
    }

    disableDragDrop() {
        const widgets = document.querySelectorAll('.widget');
        
        widgets.forEach(widget => {
            widget.classList.remove('dragging');
            widget.removeAttribute('draggable');
            
            // Reset draggable attribute after a delay to prevent issues
            setTimeout(() => {
                widget.setAttribute('draggable', 'true');
            }, 100);
        });
    }

    handleDragStart(e) {
        this.draggedWidget = e.target.closest('.widget');
        this.draggedWidget.classList.add('dragging');
        
        // Store widget data for transfer
        const widgetId = this.draggedWidget.dataset.widgetId;
        e.dataTransfer.setData('text/plain', widgetId);
        e.dataTransfer.effectAllowed = 'move';
        
        console.log(`📦 Started dragging widget: ${widgetId}`);
    }

    handleDragEnd(e) {
        if (this.draggedWidget) {
            this.draggedWidget.classList.remove('dragging');
            this.draggedWidget = null;
        }

        // Remove any drop zone highlights
        document.querySelectorAll('.drop-zone').forEach(zone => {
            zone.classList.remove('drag-over');
        });
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const dropZone = e.target.closest('.drop-zone, .widget');
        if (dropZone && dropZone !== this.draggedWidget) {
            dropZone.classList.add('drag-over');
        }
    }

    handleDrop(e) {
        e.preventDefault();
        const dropTarget = e.target.closest('.widget');
        const draggedWidgetId = e.dataTransfer.getData('text/plain');
        
        if (dropTarget && this.draggedWidget && dropTarget !== this.draggedWidget) {
            this.swapWidgets(this.draggedWidget, dropTarget);
            console.log(`🔄 Swapped widgets: ${draggedWidgetId} with ${dropTarget.dataset.widgetId}`);
        }

        // Remove drag over effects
        document.querySelectorAll('.widget, .drop-zone').forEach(element => {
            element.classList.remove('drag-over');
        });
    }

    handleContainerDrop(e) {
        e.preventDefault();
        // Handle dropping widget into main container area
        console.log('📍 Widget dropped in container area');
    }

    swapWidgets(widget1, widget2) {
        // Get parent containers
        const parent1 = widget1.parentNode;
        const parent2 = widget2.parentNode;
        const sibling1 = widget1.nextSibling;
        const sibling2 = widget2.nextSibling;

        // Swap the widgets
        parent1.insertBefore(widget2, sibling1);
        parent2.insertBefore(widget1, sibling2);

        // Update positions in layout tracking
        this.updateWidgetPosition(widget1.dataset.widgetId, parent2, sibling2);
        this.updateWidgetPosition(widget2.dataset.widgetId, parent1, sibling1);
    }

    updateWidgetPosition(widgetId, newParent, nextSibling) {
        // Update internal layout tracking
        this.widgetLayouts[widgetId] = {
            parent: newParent.id || newParent.className,
            position: Array.from(newParent.children).indexOf(newParent.querySelector(`[data-widget-id="${widgetId}"]`))
        };
    }

    resizeWidget(widgetId, action) {
        const widget = document.querySelector(`[data-widget-id="${widgetId}"]`);
        if (!widget) return;

        const currentSizeClass = Array.from(widget.classList).find(cls => cls.startsWith('widget-'));
        const sizeOptions = ['widget-small', 'widget-medium', 'widget-large', 'widget-full'];
        
        if (action === 'toggle') {
            if (currentSizeClass) {
                widget.classList.remove(currentSizeClass);
                const currentIndex = sizeOptions.indexOf(currentSizeClass);
                const nextIndex = (currentIndex + 1) % sizeOptions.length;
                widget.classList.add(sizeOptions[nextIndex]);
            } else {
                widget.classList.add('widget-medium');
            }
        }

        this.showNotification(`Widget ${widgetId} resized`, 'info');
        
        // Trigger chart resize if needed
        if (widgetId === 'chart' && this.chart) {
            setTimeout(() => {
                this.chart.resize();
            }, 300);
        }
    }

    hideWidget(widgetId) {
        const widget = document.querySelector(`[data-widget-id="${widgetId}"]`);
        if (widget) {
            widget.style.display = widget.style.display === 'none' ? 'block' : 'none';
            const isHidden = widget.style.display === 'none';
            this.showNotification(`Widget ${widgetId} ${isHidden ? 'hidden' : 'shown'}`, 'info');
            
            // Update layout tracking
            this.widgetLayouts[widgetId] = this.widgetLayouts[widgetId] || {};
            this.widgetLayouts[widgetId].hidden = isHidden;
        }
    }

    saveWidgetLayouts() {
        const layouts = {};
        document.querySelectorAll('.widget').forEach(widget => {
            const widgetId = widget.dataset.widgetId;
            layouts[widgetId] = {
                parent: widget.parentNode.id || widget.parentNode.className,
                position: Array.from(widget.parentNode.children).indexOf(widget),
                hidden: widget.style.display === 'none',
                sizeClass: Array.from(widget.classList).find(cls => cls.startsWith('widget-'))
            };
        });
        
        localStorage.setItem('ultibiker-widget-layouts', JSON.stringify(layouts));
        console.log('💾 Widget layouts saved', layouts);
    }

    loadWidgetLayouts() {
        const saved = localStorage.getItem('ultibiker-widget-layouts');
        return saved ? JSON.parse(saved) : {};
    }

    applyWidgetLayouts() {
        // Apply saved widget layouts on page load
        Object.keys(this.widgetLayouts).forEach(widgetId => {
            const layout = this.widgetLayouts[widgetId];
            const widget = document.querySelector(`[data-widget-id="${widgetId}"]`);
            
            if (widget && layout) {
                // Apply visibility
                if (layout.hidden) {
                    widget.style.display = 'none';
                }
                
                // Apply size class
                if (layout.sizeClass) {
                    widget.classList.add(layout.sizeClass);
                }
            }
        });
    }

    resetWidgetLayouts() {
        localStorage.removeItem('ultibiker-widget-layouts');
        location.reload();
    }

    async checkPermissions() {
        console.log('🔒 Checking Bluetooth permissions...');
        
        try {
            // Check Web Bluetooth API availability
            if (!navigator.bluetooth) {
                console.warn('⚠️ Web Bluetooth API not available in this browser');
                errorHandler.handlePermissionError(
                    'Bluetooth', 
                    'Web Bluetooth is not supported in this browser. Please use Chrome, Edge, or Opera for Bluetooth sensor connectivity.'
                );
                return false;
            }

            // Check permissions using navigator.permissions API
            let bluetoothPermissionGranted = false;
            try {
                const permission = await navigator.permissions.query({ name: 'bluetooth' });
                bluetoothPermissionGranted = permission.state === 'granted';
                console.log(`🔒 Web Bluetooth permission: ${permission.state}`);
                
                if (permission.state === 'denied') {
                    errorHandler.handlePermissionError(
                        'Bluetooth', 
                        'Bluetooth permission has been denied. Please enable Bluetooth permissions in your browser settings and reload the page.'
                    );
                    return false;
                }
                
                if (permission.state === 'prompt') {
                    console.log('🔒 Bluetooth permission needs to be requested');
                    return false; // Will be requested when scanning starts
                }
            } catch (permError) {
                console.log('ℹ️ Could not query Bluetooth permission status:', permError.message);
            }

            // Check server-side permissions
            try {
                const response = await fetch('/api/permissions/status');
                if (response.ok) {
                    const serverPermissions = await response.json();
                    console.log('🔒 Server permissions:', serverPermissions);
                    
                    // Check if server has Bluetooth access
                    if (serverPermissions.bluetooth && !serverPermissions.bluetooth.granted) {
                        const guide = serverPermissions.bluetooth.guide || 'Please check system settings to grant Bluetooth access to this application.';
                        errorHandler.handlePermissionError('System Bluetooth', guide);
                        return false;
                    }
                    
                    // Check ANT+ permissions if available
                    if (serverPermissions.ant && !serverPermissions.ant.granted) {
                        console.warn('⚠️ ANT+ access not available - this is normal if no ANT+ stick is connected');
                    }
                } else {
                    console.warn('⚠️ Could not check server permissions:', response.statusText);
                }
            } catch (serverError) {
                console.warn('⚠️ Could not connect to server for permission check:', serverError.message);
            }

            console.log('✅ Permission check completed');
            return true;
            
        } catch (error) {
            console.error('❌ Error during permission check:', error);
            errorHandler.handlePermissionError(
                'Permission Check', 
                'An error occurred while checking permissions. Please reload the page and try again.'
            );
            return false;
        }
    }

    async requestBluetoothPermission() {
        console.log('🔒 Requesting Web Bluetooth permission...');
        
        try {
            // Check if Web Bluetooth is available
            if (!navigator.bluetooth) {
                throw new Error('Web Bluetooth is not available in this browser');
            }

            // Request permission by attempting to get devices
            // This will trigger the permission prompt
            const devices = await navigator.bluetooth.requestDevice({
                filters: [
                    { services: ['heart_rate'] },
                    { services: ['cycling_power'] },
                    { services: ['cycling_speed_and_cadence'] },
                    { services: [0x1816] }, // Cycling Speed and Cadence
                    { services: [0x1818] }, // Cycling Power
                    { services: [0x180D] }, // Heart Rate
                    { namePrefix: 'HR' },
                    { namePrefix: 'Wahoo' },
                    { namePrefix: 'Garmin' },
                    { namePrefix: 'Polar' },
                    { namePrefix: 'KICKR' },
                    { namePrefix: 'Edge' }
                ],
                optionalServices: [
                    'battery_service',
                    'device_information',
                    'generic_access',
                    'generic_attribute'
                ]
            });

            console.log('✅ Bluetooth permission granted via device selection:', devices);
            
            // Show success message
            this.showNotification('Bluetooth permission granted successfully!', 'success');
            
            return true;
            
        } catch (error) {
            console.error('❌ Failed to request Bluetooth permission:', error);
            
            if (error.name === 'NotFoundError') {
                // User cancelled the device selection
                this.showNotification('Device selection cancelled - Bluetooth permission not granted', 'warning');
            } else if (error.name === 'NotAllowedError') {
                // Permission was explicitly denied
                errorHandler.handlePermissionError(
                    'Bluetooth',
                    'Bluetooth access was denied. Please enable Bluetooth permissions in your browser settings and try again.'
                );
            } else {
                // Other errors
                errorHandler.handlePermissionError(
                    'Bluetooth Request',
                    `Failed to request Bluetooth permission: ${error.message}`
                );
            }
            
            return false;
        }
    }

    // Permission System Methods
    setupPermissionHandlers() {
        const checkPermissionsBtn = document.getElementById('checkPermissionsBtn');
        const showPermissionGuideBtn = document.getElementById('showPermissionGuideBtn');
        const requestBluetoothBtn = document.getElementById('requestBluetoothBtn');
        
        if (checkPermissionsBtn) {
            checkPermissionsBtn.addEventListener('click', () => {
                this.checkServerPermissions();
            });
        }
        
        if (showPermissionGuideBtn) {
            showPermissionGuideBtn.addEventListener('click', () => {
                this.showPermissionGuide();
            });
        }
        
        if (requestBluetoothBtn) {
            requestBluetoothBtn.addEventListener('click', async () => {
                const granted = await this.requestBluetoothPermission();
                if (granted) {
                    // Recheck permissions after granting
                    this.checkPermissions();
                    this.checkServerPermissions();
                }
            });
        }
    }

    async checkServerPermissions() {
        console.log('🔒 Checking server device permissions...');
        
        try {
            const response = await fetch('/api/permissions/status');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('🔒 Server permission status received:', result);
            
            // Store server permissions for device status display
            this.serverPermissions = result.data?.permissions || result.permissions;
            
            this.updatePermissionDisplay(result);
            this.updateDeviceStatusDisplay(); // Update device indicators with real status
        } catch (error) {
            console.error('❌ Failed to check server permissions:', error);
            this.showPermissionError('Unable to check device permissions. Please ensure the server is running.');
        }
    }

    updatePermissionDisplay(result) {
        const permissions = result.data?.permissions || result.permissions || {};
        const permissionAlert = document.getElementById('permissionAlert');
        const bluetoothPermission = document.getElementById('bluetoothPermission');
        const usbPermission = document.getElementById('usbPermission');
        const bluetoothStatus = document.getElementById('bluetoothStatus');
        const usbStatus = document.getElementById('usbStatus');
        const bluetoothMessage = document.getElementById('bluetoothMessage');
        const usbMessage = document.getElementById('usbMessage');
        
        let hasPermissionIssues = false;
        
        // Update Bluetooth permission status
        if (permissions.bluetooth) {
            const bluetooth = permissions.bluetooth;
            if (bluetoothPermission) bluetoothPermission.style.display = 'flex';
            
            if (bluetoothStatus) {
                if (bluetooth.granted) {
                    bluetoothStatus.className = 'badge bg-success';
                    bluetoothStatus.textContent = '✅ Granted';
                } else if (bluetooth.denied) {
                    bluetoothStatus.className = 'badge bg-danger';
                    bluetoothStatus.textContent = '❌ Denied';
                    hasPermissionIssues = true;
                } else {
                    bluetoothStatus.className = 'badge bg-warning';
                    bluetoothStatus.textContent = '⚠️ Pending';
                    if (bluetooth.requiresUserAction) {
                        hasPermissionIssues = true;
                    }
                }
            }
            
            if (bluetoothMessage) bluetoothMessage.textContent = bluetooth.message || '';
        }
        
        // Update USB permission status
        if (permissions.usb) {
            const usb = permissions.usb;
            if (usbPermission) usbPermission.style.display = 'flex';
            
            if (usbStatus) {
                if (usb.granted) {
                    usbStatus.className = 'badge bg-success';
                    usbStatus.textContent = '✅ Available';
                } else if (usb.denied) {
                    usbStatus.className = 'badge bg-danger';
                    usbStatus.textContent = '❌ Blocked';
                    hasPermissionIssues = true;
                } else {
                    usbStatus.className = 'badge bg-secondary';
                    usbStatus.textContent = '📡 Not detected';
                    // USB device not being detected is not necessarily a permission issue for most users
                }
            }
            
            if (usbMessage) usbMessage.textContent = usb.message || '';
        }
        
        // Show or hide the permission alert based on issues found
        if (permissionAlert) {
            if (hasPermissionIssues) {
                permissionAlert.style.display = 'block';
                this.showNotification('Device permissions need attention', 'warning', 'Check the permission alert above for details');
            } else {
                permissionAlert.style.display = 'none';
                
                // Only show success if we actually have some devices available
                if (permissions.bluetooth?.granted || permissions.usb?.granted) {
                    this.showNotification('Device permissions are ready', 'success');
                }
            }
        }
    }

    async showPermissionGuide() {
        console.log('📖 Fetching permission setup guide...');
        
        try {
            const response = await fetch('/api/permissions/guide');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const guideMarkdown = await response.text();
            
            // Show the guide in a modal dialog
            errorHandler.showErrorDialog({
                type: 'info',
                title: 'Device Permission Setup Guide',
                message: 'Here are the step-by-step instructions for setting up device permissions on your system:',
                details: guideMarkdown,
                showRetry: false,
                showReload: false
            });
            
        } catch (error) {
            console.error('❌ Failed to fetch permission guide:', error);
            errorHandler.showErrorDialog({
                type: 'error',
                title: 'Setup Guide Unavailable',
                message: 'Unable to load the permission setup guide. Please check your server connection.',
                details: error.message,
                showRetry: true,
                retryAction: () => this.showPermissionGuide()
            });
        }
    }

    showPermissionError(message) {
        const permissionAlert = document.getElementById('permissionAlert');
        const bluetoothPermission = document.getElementById('bluetoothPermission');
        const usbPermission = document.getElementById('usbPermission');
        
        // Show the alert with generic error info
        permissionAlert.style.display = 'block';
        bluetoothPermission.style.display = 'none';
        usbPermission.style.display = 'none';
        
        // Show error toast
        this.showNotification(message, 'error');
    }

    startPermissionStatusUpdates() {
        // Check permission status every 15 seconds to keep status indicators accurate
        this.permissionUpdateInterval = setInterval(() => {
            this.checkServerPermissions();
        }, 15000);

        console.log('🔄 Started periodic permission status updates');
    }

    stopPermissionStatusUpdates() {
        if (this.permissionUpdateInterval) {
            clearInterval(this.permissionUpdateInterval);
            this.permissionUpdateInterval = null;
            console.log('⏹️ Stopped permission status updates');
        }
    }
}

// Initialize dashboard when page loads
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new UltiBikerDashboard();
    
    // Make dashboard globally accessible for error handler
    window.dashboard = dashboard;
    
    // Test error handling (remove in production)
    if (window.location.hash === '#test-errors') {
        setTimeout(() => {
            errorHandler.showToast('Welcome to UltiBiker!', 'success', 'Error handling system is now active');
        }, 1000);
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (dashboard) {
        if (dashboard.liveTimeInterval) {
            clearInterval(dashboard.liveTimeInterval);
        }
        if (dashboard.dataRateTimer) {
            clearInterval(dashboard.dataRateTimer);
        }
        if (dashboard.permissionUpdateInterval) {
            clearInterval(dashboard.permissionUpdateInterval);
        }
    }
});