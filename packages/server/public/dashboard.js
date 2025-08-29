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
        // Use Toastify.js for better toast notifications
        const iconMap = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        const colorMap = {
            success: 'linear-gradient(to right, #00b09b, #96c93d)',
            error: 'linear-gradient(to right, #ff5f6d, #ffc371)',
            warning: 'linear-gradient(to right, #f093fb 0%, #f5576c 100%)',
            info: 'linear-gradient(to right, #4facfe 0%, #00f2fe 100%)'
        };

        // Format message with icon and description
        let displayText = `${iconMap[type]} ${message}`;
        if (description) {
            displayText += `\n${description}`;
        }

        Toastify({
            text: displayText,
            duration: duration,
            close: true,
            gravity: "top",
            position: "right",
            stopOnFocus: true,
            style: {
                background: colorMap[type] || colorMap.info,
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "500",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
            },
            onClick: function() {
                // Optional click handler
            }
        }).showToast();

        // Keep the toastId for compatibility
        return `toastify-${++this.toastId}`;
    }

    removeToast(toastId) {
        // Toastify.js handles removal automatically
        // This method kept for backwards compatibility
        console.log(`Toast removal handled by Toastify.js: ${toastId}`);
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

// FIXME: Consider modern frontend libraries for better performance and maintainability:
// - React/Vue/Svelte: Component-based architecture instead of vanilla JS
// - Socket.io-client: Already used, but consider upgrading to latest version
// - Chart.js alternatives: ApexCharts, D3.js, or Recharts for React
// - Tailwind CSS: Utility-first CSS framework instead of Bootstrap
// - Alpine.js: Lightweight reactive framework as minimal upgrade path
// - TypeScript: Type safety for frontend code
// - Vite: Modern build tool for faster development
// - PWA libraries: Workbox for offline support and caching

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
        
        // Device Connection tab auto-scanning
        this.autoScanEnabled = false;
        this.autoScanInterval = null;
        this.autoPermissionCheckInterval = null;
        this.lastUserActivity = Date.now();
        this.idleThreshold = 60000; // 1 minute idle time
        this.normalScanRate = 5000; // 5 seconds normal
        this.idleScanRate = 15000; // 15 seconds when idle
        
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
        
        // Initialize session UI in the correct state (no active session)
        this.updateSessionUI(false);
        
        // Set up permission UI handlers
        this.setupPermissionHandlers();
        
        // Set up user activity tracking for idle detection
        this.setupUserActivityTracking();
        
        // Check permissions after initialization (both browser and server)
        setTimeout(() => {
            this.checkPermissions(); // Browser permissions
            this.checkServerPermissions(); // Server permissions
        }, 1000);

        // Start periodic permission status updates
        this.startPermissionStatusUpdates();
        
        // Start auto-scanning if we're on the devices tab
        if (this.currentTab === 'devices') {
            this.startAutoScanning();
        }
        
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

        // Pause and Export buttons
        const pauseSessionBtn = document.getElementById('pauseSessionBtn');
        const exportSessionBtn = document.getElementById('exportSessionBtn');
        
        if (pauseSessionBtn) {
            pauseSessionBtn.addEventListener('click', () => {
                this.togglePauseSession();
            });
        }
        
        if (exportSessionBtn) {
            exportSessionBtn.addEventListener('click', () => {
                this.exportSessionData();
            });
        }
    }
    
    setupTabSystem() {
        // Tab switching functionality
        const tabButtons = document.querySelectorAll('#mainTabs .nav-link');
        
        tabButtons.forEach(button => {
            button.addEventListener('shown.bs.tab', (e) => {
                const targetTab = e.target.getAttribute('data-bs-target');
                const previousTab = this.currentTab;
                this.currentTab = targetTab.includes('devices') ? 'devices' : 'data';
                
                // Handle tab-specific logic
                if (this.currentTab === 'devices') {
                    // Start auto-scanning when switching to devices tab
                    this.startAutoScanning();
                    
                    // Initialize chart when switching to data tab
                } else if (this.currentTab === 'data') {
                    // Stop auto-scanning when leaving devices tab
                    this.stopAutoScanning();
                    
                    if (!this.chart) {
                        // Small delay to ensure tab content is visible
                        setTimeout(() => {
                            this.initializeChart();
                        }, 100);
                    } else {
                        // Resize chart when switching back to data tab
                        setTimeout(() => {
                            this.resizeChart();
                        }, 100);
                    }
                }
                
                console.log(`📑 Switched from ${previousTab} to ${this.currentTab} tab`);
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
        // Wait for Chart.js to load
        if (typeof Chart === 'undefined') {
            console.log('📊 Chart.js not yet loaded, waiting...');
            setTimeout(() => this.initializeChart(), 100);
            return;
        }
        
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
        
        // Update device list sensor data display
        this.updateDeviceListSensorData(reading.deviceId);
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
        const now = dateFns.format(new Date(), 'HH:mm:ss');
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
            lastUpdateElement.textContent = dateFns.format(this.lastUpdateTime, 'HH:mm:ss');
        }
        
        if (dataRateDisplayElement) {
            dataRateDisplayElement.textContent = this.dataRateCounter;
        }
    }
    
    updateRawDataStream(reading) {
        const rawDataElement = document.getElementById('rawDataStream');
        if (!rawDataElement) return;
        
        const timestamp = dateFns.format(new Date(), 'HH:mm:ss');
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
            return this.formatDeviceName(connectedDevice);
        }
        
        // Check discovered devices
        const discoveredDevice = this.discoveredDevices.get(deviceId);
        if (discoveredDevice) {
            return this.formatDeviceName(discoveredDevice);
        }
        
        // Try to extract meaningful info from deviceId patterns
        const friendlyName = this.generateFriendlyDeviceName(deviceId);
        if (friendlyName !== deviceId) {
            return friendlyName;
        }
        
        // Return shortened ID as fallback
        return deviceId.length > 8 ? deviceId.substring(0, 8) + '...' : deviceId;
    }
    
    formatDeviceName(device) {
        // Use displayName if available (highest priority)
        if (device.displayName && device.displayName !== device.id) {
            return device.displayName;
        }
        
        // Use name if available and meaningful
        if (device.name && device.name !== device.id) {
            return device.name;
        }
        
        // Try to build a meaningful name from available data
        let name = '';
        
        // Add manufacturer if available
        if (device.manufacturer) {
            name = device.manufacturer;
        }
        
        // Add device type/model
        if (device.type && device.type !== 'unknown') {
            const typeNames = {
                'heart_rate': 'Heart Rate Monitor',
                'power': 'Power Meter',
                'cadence': 'Cadence Sensor',
                'speed': 'Speed Sensor',
                'fitness_machine': 'Fitness Machine',
                'trainer': 'Smart Trainer'
            };
            const typeName = typeNames[device.type] || this.capitalizeWords(device.type.replace(/_/g, ' '));
            name = name ? `${name} ${typeName}` : typeName;
        }
        
        // If we built a meaningful name, return it
        if (name) {
            return name;
        }
        
        // Fallback to generating friendly name from ID
        return this.generateFriendlyDeviceName(device.id);
    }
    
    generateFriendlyDeviceName(deviceId) {
        // Common device ID patterns and their friendly names
        const patterns = [
            // ANT+ device patterns
            { regex: /^ant_(\d+)_(\d+)$/, format: (match) => `ANT+ Device ${match[2]} (${match[1]})` },
            
            // Bluetooth device patterns
            { regex: /^([0-9A-F]{2}[:-]){5}[0-9A-F]{2}$/i, format: () => `Bluetooth Device` },
            
            // Wahoo device patterns
            { regex: /wahoo/i, format: () => 'Wahoo Device' },
            { regex: /kickr/i, format: () => 'Wahoo KICKR' },
            { regex: /elemnt/i, format: () => 'Wahoo ELEMNT' },
            
            // Garmin device patterns
            { regex: /garmin/i, format: () => 'Garmin Device' },
            { regex: /edge/i, format: () => 'Garmin Edge' },
            { regex: /fenix/i, format: () => 'Garmin Fenix' },
            { regex: /forerunner/i, format: () => 'Garmin Forerunner' },
            
            // Polar device patterns
            { regex: /polar/i, format: () => 'Polar Device' },
            { regex: /h10/i, format: () => 'Polar H10' },
            { regex: /h9/i, format: () => 'Polar H9' },
            
            // Suunto device patterns
            { regex: /suunto/i, format: () => 'Suunto Device' },
            
            // Zwift device patterns
            { regex: /zwift/i, format: () => 'Zwift Device' },
            
            // Stages device patterns
            { regex: /stages/i, format: () => 'Stages Power Meter' },
            
            // Tacx device patterns
            { regex: /tacx/i, format: () => 'Tacx Trainer' },
            
            // Elite device patterns
            { regex: /elite/i, format: () => 'Elite Trainer' },
            
            // Cycleops device patterns
            { regex: /cycleops|saris/i, format: () => 'Saris/CycleOps Device' },
            
            // Generic patterns based on common prefixes
            { regex: /^hr[_-]/i, format: () => 'Heart Rate Monitor' },
            { regex: /^power[_-]/i, format: () => 'Power Meter' },
            { regex: /^speed[_-]/i, format: () => 'Speed Sensor' },
            { regex: /^cadence[_-]/i, format: () => 'Cadence Sensor' },
            { regex: /^trainer[_-]/i, format: () => 'Smart Trainer' }
        ];
        
        // Check each pattern
        for (const pattern of patterns) {
            const match = deviceId.match(pattern.regex);
            if (match) {
                return pattern.format(match);
            }
        }
        
        // If no pattern matches, return the original ID
        return deviceId;
    }
    
    capitalizeWords(str) {
        return str.replace(/\w\S*/g, (txt) => 
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
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
        div.id = `device-${device.deviceId}`;
        div.setAttribute('data-testid', isConnected ? 'connected-device' : 'discovered-device');
        
        const typeIcon = this.getDeviceIcon(device.type);
        const protocolIcon = device.protocol === 'ant_plus' ? 'fas fa-satellite-dish' : 'fab fa-bluetooth';
        const signalClass = this.getSignalClass(device.signalStrength || 0);
        
        // Get real-time sensor data if connected
        const sensorData = this.deviceMetrics.get(device.deviceId);
        const sensorDataDisplay = this.formatSensorDataDisplay(sensorData, device.type);
        
        // Enhanced device display with comprehensive details
        const manufacturerInfo = device.manufacturer ? `<span class="badge bg-secondary me-1">${device.manufacturer}</span>` : '';
        const categoryInfo = device.category ? `<small class="text-muted">${device.category}</small>` : '';
        const confidenceInfo = device.confidence && device.confidence < 100 ? 
            `<span class="badge bg-warning text-dark ms-1" title="Identification Confidence">${device.confidence}%</span>` : '';
        
        div.innerHTML = `
            <div class="d-flex justify-content-between align-items-center w-100">
                <div class="flex-grow-1">
                    <div class="fw-bold d-flex align-items-center mb-1">
                        <i class="${typeIcon} me-2 ${device.type}"></i>
                        ${device.displayName || device.name || 'Unknown Device'}
                        ${confidenceInfo}
                    </div>
                    <div class="d-flex align-items-center flex-wrap mb-1">
                        ${manufacturerInfo}
                        ${categoryInfo}
                    </div>
                    <div class="d-flex align-items-center justify-content-between">
                        <div class="d-flex align-items-center">
                            <small class="text-muted me-2">
                                <i class="${protocolIcon} me-1"></i>
                                ${(device.protocol || 'unknown').toUpperCase()}
                            </small>
                            <div class="signal-indicator ${signalClass}" data-testid="signal-strength">
                                <div class="signal-bar"></div>
                                <div class="signal-bar"></div>
                                <div class="signal-bar"></div>
                                <div class="signal-bar"></div>
                            </div>
                            <small class="text-muted ms-2">${device.signalStrength || 0}%</small>
                            ${device.batteryLevel ? `<span class="badge bg-info ms-2" data-testid="battery-level">🔋 ${device.batteryLevel}%</span>` : ''}
                        </div>
                        <div class="sensor-data-display" id="sensor-data-${device.deviceId}">
                            ${sensorDataDisplay}
                        </div>
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

    formatSensorDataDisplay(sensorData, deviceType) {
        if (!sensorData || !sensorData.lastValue) return '';
        
        const value = sensorData.lastValue;
        const timeSinceUpdate = dateFns.differenceInSeconds(new Date(), new Date(sensorData.lastUpdate));
        const isStale = timeSinceUpdate > 5; // 5 seconds
        
        const staleClass = isStale ? 'text-muted' : 'text-success';
        const icon = this.getSensorDataIcon(sensorData.metricType);
        const unit = this.getSensorDataUnit(sensorData.metricType);
        
        // Add relative time display for data freshness
        const relativeTime = this.getRelativeTimeDisplay(sensorData.lastUpdate);
        
        return `
            <small class="sensor-live-data ${staleClass}">
                <i class="${icon} me-1"></i>
                ${Math.round(value)}${unit}
                <span class="text-muted ms-2">(${relativeTime})</span>
            </small>
        `;
    }

    getSensorDataIcon(metricType) {
        const icons = {
            'heart_rate': 'fas fa-heartbeat',
            'power': 'fas fa-bolt',
            'cadence': 'fas fa-sync-alt',
            'speed': 'fas fa-tachometer-alt'
        };
        return icons[metricType] || 'fas fa-circle';
    }

    getSensorDataUnit(metricType) {
        const units = {
            'heart_rate': ' BPM',
            'power': 'W',
            'cadence': ' RPM',
            'speed': ' km/h'
        };
        return units[metricType] || '';
    }

    updateDeviceListSensorData(deviceId) {
        const sensorDataElement = document.getElementById(`sensor-data-${deviceId}`);
        if (sensorDataElement) {
            const sensorData = this.deviceMetrics.get(deviceId);
            const device = this.connectedDevices.find(d => d.deviceId === deviceId) ||
                          this.discoveredDevices.find(d => d.deviceId === deviceId);
            
            if (sensorData) {
                const sensorDataDisplay = this.formatSensorDataDisplay(sensorData, device?.type);
                sensorDataElement.innerHTML = sensorDataDisplay;
            }
        }
    }

    createConnectedDeviceElement(device) {
        const div = document.createElement('div');
        div.className = 'device-list-item bg-success bg-opacity-10 border-success';
        div.id = `device-${device.deviceId}`;
        
        const typeIcon = this.getDeviceIcon(device.type);
        const signalClass = this.getSignalClass(device.signalStrength || 0);
        
        // Get real-time sensor data
        const sensorData = this.deviceMetrics.get(device.deviceId);
        const sensorDataDisplay = this.formatSensorDataDisplay(sensorData, device.type);
        
        // Enhanced device display with comprehensive details
        const manufacturerInfo = device.manufacturer ? `<span class="badge bg-secondary me-1">${device.manufacturer}</span>` : '';
        const categoryInfo = device.category ? `<small class="text-muted">${device.category}</small>` : '';
        
        div.innerHTML = `
            <div class="d-flex justify-content-between align-items-center w-100">
                <div class="flex-grow-1">
                    <div class="fw-bold d-flex align-items-center mb-1">
                        <i class="${typeIcon} me-2 ${device.type}"></i>
                        ${device.displayName || device.name || 'Unknown Device'}
                    </div>
                    <div class="d-flex align-items-center flex-wrap mb-1">
                        ${manufacturerInfo}
                        ${categoryInfo}
                    </div>
                    <div class="d-flex align-items-center justify-content-between">
                        <div class="d-flex align-items-center">
                            <small class="text-success me-2" data-testid="connection-status">
                                <i class="fas fa-check-circle me-1"></i>
                                Connected
                            </small>
                            <div class="signal-indicator ${signalClass}" data-testid="signal-strength">
                                <div class="signal-bar"></div>
                                <div class="signal-bar"></div>
                                <div class="signal-bar"></div>
                                <div class="signal-bar"></div>
                            </div>
                            <small class="text-muted ms-2">${device.signalStrength || 0}%</small>
                            ${device.batteryLevel ? `<span class="badge bg-info ms-2" data-testid="battery-level">🔋 ${device.batteryLevel}%</span>` : ''}
                        </div>
                        <div class="sensor-data-display" id="sensor-data-${device.deviceId}">
                            ${sensorDataDisplay}
                        </div>
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
        const sessionName = prompt('Enter session name (optional):', `Ride ${dateFns.format(new Date(), 'yyyy-MM-dd')}`);
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

    // Session pause/resume functionality
    // Based on WebSocket pause/resume patterns from GitHub research
    togglePauseSession() {
        if (!this.currentSessionId) {
            this.showNotification('No active session to pause', 'warning');
            return;
        }

        const isPaused = this.isSessionPaused || false;
        const action = isPaused ? 'resume' : 'pause';
        
        this.socket.emit(`${action}-session`, { sessionId: this.currentSessionId }, (response) => {
            if (response && response.success) {
                this.isSessionPaused = !isPaused;
                this.updatePauseButtonState();
                
                const message = isPaused ? 'Session resumed' : 'Session paused';
                const type = isPaused ? 'success' : 'info';
                this.showNotification(message, type);
                
                console.log(`${isPaused ? '▶️' : '⏸️'} Session ${action}d successfully`);
            } else {
                const error = response?.error || `Failed to ${action} session`;
                this.showNotification(`Failed to ${action} session: ${error}`, 'error');
                console.error(`❌ Failed to ${action} session:`, error);
            }
        });
        
        console.log(`${isPaused ? '▶️' : '⏸️'} ${isPaused ? 'Resuming' : 'Pausing'} workout session...`);
    }

    updatePauseButtonState() {
        const pauseBtn = document.getElementById('pauseSessionBtn');
        if (!pauseBtn) return;
        
        const isPaused = this.isSessionPaused || false;
        const icon = pauseBtn.querySelector('i');
        const text = pauseBtn.childNodes[pauseBtn.childNodes.length - 1];
        
        if (isPaused) {
            if (icon) icon.className = 'fas fa-play';
            if (text) text.textContent = ' Resume';
            pauseBtn.className = 'btn btn-sm btn-success';
            pauseBtn.title = 'Resume session';
        } else {
            if (icon) icon.className = 'fas fa-pause';
            if (text) text.textContent = ' Pause';
            pauseBtn.className = 'btn btn-sm btn-outline-warning';
            pauseBtn.title = 'Pause session';
        }
    }

    // Session data export functionality
    // Using vanilla JavaScript for CSV export (could use json2csv or export-to-csv libraries)
    async exportSessionData() {
        if (!this.currentSessionId) {
            this.showNotification('No active session to export', 'warning');
            return;
        }

        try {
            this.showNotification('Preparing export data...', 'info');
            
            // Fetch session data from server
            const response = await fetch(`/api/sessions/${this.currentSessionId}/export`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const sessionData = await response.json();
            
            // Show export options
            this.showExportDialog(sessionData);
            
        } catch (error) {
            console.error('❌ Failed to fetch session data for export:', error);
            errorHandler.showErrorDialog({
                type: 'error',
                title: 'Export Failed',
                message: 'Unable to fetch session data for export. Please try again.',
                details: error.message || 'Unknown export error',
                showRetry: true,
                retryAction: () => this.exportSessionData()
            });
        }
    }

    // Export dialog with multiple format options
    showExportDialog(sessionData) {
        // Create modal dialog for export options
        // In production, could use Bootstrap modal or similar component library
        const dialogHtml = `
            <div class="modal fade" id="exportModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Export Session Data</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p>Export session "${sessionData.name}" (${sessionData.dataPoints} data points)</p>
                            <div class="d-grid gap-2">
                                <button class="btn btn-primary" onclick="dashboard.downloadExport('csv', ${JSON.stringify(sessionData).replace(/"/g, '&quot;')})">
                                    <i class="fas fa-file-csv"></i> Download CSV
                                </button>
                                <button class="btn btn-outline-secondary" onclick="dashboard.downloadExport('json', ${JSON.stringify(sessionData).replace(/"/g, '&quot;')})">
                                    <i class="fas fa-file-code"></i> Download JSON
                                </button>
                                <button class="btn btn-outline-info" onclick="dashboard.downloadExport('gpx', ${JSON.stringify(sessionData).replace(/"/g, '&quot;')})">
                                    <i class="fas fa-map-marked-alt"></i> Download GPX
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to page if not exists
        let modal = document.getElementById('exportModal');
        if (!modal) {
            document.body.insertAdjacentHTML('beforeend', dialogHtml);
            modal = document.getElementById('exportModal');
        }
        
        // Show modal using Bootstrap
        if (window.bootstrap) {
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();
        } else {
            // Fallback without Bootstrap
            modal.style.display = 'block';
            modal.classList.add('show');
        }
    }

    // Download exported data in various formats
    // Vanilla implementation - could be replaced with export-to-csv, tcx-js, etc.
    downloadExport(format, sessionData) {
        try {
            let content, filename, mimeType;
            
            switch (format) {
                case 'csv':
                    content = this.convertToCSV(sessionData);
                    filename = `${sessionData.name || 'session'}_${sessionData.id}.csv`;
                    mimeType = 'text/csv';
                    break;
                    
                case 'json':
                    content = JSON.stringify(sessionData, null, 2);
                    filename = `${sessionData.name || 'session'}_${sessionData.id}.json`;
                    mimeType = 'application/json';
                    break;
                    
                case 'gpx':
                    content = this.convertToGPX(sessionData);
                    filename = `${sessionData.name || 'session'}_${sessionData.id}.gpx`;
                    mimeType = 'application/gpx+xml';
                    break;
                    
                default:
                    throw new Error('Unsupported export format');
            }
            
            // Create and trigger download
            // Using modern File API - could be enhanced with FileSaver.js library
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showNotification(`Exported ${format.toUpperCase()} successfully`, 'success');
            console.log(`📄 Exported session data as ${format.toUpperCase()}: ${filename}`);
            
            // Close export modal
            const modal = document.getElementById('exportModal');
            if (modal && window.bootstrap) {
                const bsModal = bootstrap.Modal.getInstance(modal);
                if (bsModal) bsModal.hide();
            }
            
        } catch (error) {
            console.error('❌ Export failed:', error);
            this.showNotification(`Export failed: ${error.message}`, 'error');
        }
    }

    // CSV conversion - could be replaced with json2csv library
    convertToCSV(sessionData) {
        if (!sessionData.sensorReadings || sessionData.sensorReadings.length === 0) {
            return 'No sensor data available for export';
        }
        
        // Create CSV headers
        const headers = ['timestamp', 'deviceId', 'deviceName', 'metricType', 'value', 'unit', 'sessionId'];
        let csv = headers.join(',') + '\n';
        
        // Add data rows
        sessionData.sensorReadings.forEach(reading => {
            const row = [
                reading.timestamp || '',
                reading.deviceId || '',
                reading.deviceName || '',
                reading.metricType || '',
                reading.value || '',
                reading.unit || '',
                reading.sessionId || ''
            ].map(field => `"${field}"`).join(',');
            
            csv += row + '\n';
        });
        
        return csv;
    }

    // GPX conversion for fitness apps - could use gpx-builder library
    convertToGPX(sessionData) {
        const sessionName = sessionData.name || 'UltiBiker Session';
        const startTime = new Date(sessionData.startTime || Date.now()).toISOString();
        
        let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="UltiBiker" xmlns="http://www.topografix.com/GPX/1/1">
    <metadata>
        <name>${sessionName}</name>
        <time>${startTime}</time>
    </metadata>
    <trk>
        <name>${sessionName}</name>
        <trkseg>`;
        
        // Add trackpoints from sensor data
        if (sessionData.sensorReadings) {
            sessionData.sensorReadings.forEach(reading => {
                if (reading.metricType === 'heart_rate' || reading.metricType === 'power') {
                    const timestamp = new Date(reading.timestamp || Date.now()).toISOString();
                    gpx += `
            <trkpt lat="0" lon="0">
                <time>${timestamp}</time>
                <extensions>
                    <${reading.metricType}>${reading.value}</${reading.metricType}>
                </extensions>
            </trkpt>`;
                }
            });
        }
        
        gpx += `
        </trkseg>
    </trk>
</gpx>`;
        
        return gpx;
    }
    
    updateSessionUI(isActive, sessionId = null, sessionName = null) {
        const startBtn = document.getElementById('startSessionBtn');
        const stopBtn = document.getElementById('stopSessionBtn');
        const sessionStatus = document.getElementById('sessionStatus');
        const recordingStatus = document.getElementById('recordingStatus');
        const recordingIndicator = document.getElementById('recordingIndicator');
        const sessionControls = document.getElementById('sessionControls');
        
        this.isRecording = isActive;
        this.currentSessionId = sessionId;
        
        if (isActive) {
            if (startBtn) startBtn.style.display = 'none';
            if (stopBtn) stopBtn.style.display = 'inline-block';
            if (sessionControls) sessionControls.style.display = 'flex';
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
            if (sessionControls) sessionControls.style.display = 'none';
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
                timeElement.textContent = dateFns.format(now, 'HH:mm:ss');
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
        } else if (status.hasOwnProperty('activeSession')) {
            // Explicitly check if activeSession is null/undefined to avoid false positives
            this.currentSessionId = null;
            this.updateSessionUI(false);
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

    async requestNativeBluetoothPermission() {
        console.log('🔒 Requesting native OS Bluetooth permission...');
        
        try {
            const response = await fetch('/api/permissions/request-bluetooth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('🔒 Native permission request result:', result);
            
            if (result.success && result.data.permission.granted) {
                // Show success message
                window.showToast('success', '✅ Bluetooth Permission Granted!', 'You can now scan for Bluetooth devices.');
                
                // Refresh permission status
                await this.checkServerPermissions();
                
                // Hide permission alert if visible
                const permissionAlert = document.getElementById('permission-alert');
                if (permissionAlert) {
                    permissionAlert.style.display = 'none';
                }
                
            } else if (result.success && !result.data.permission.granted) {
                // Permission was denied
                const message = result.data.message || 'Bluetooth permission was not granted';
                const nextSteps = result.data.nextSteps || result.data.permission.instructions || [];
                
                let toastMessage = message;
                if (nextSteps.length > 0) {
                    toastMessage += '\n\nNext steps:\n• ' + nextSteps.join('\n• ');
                }
                
                window.showToast('warning', '⚠️ Permission Not Granted', toastMessage, 8000);
                
            } else {
                throw new Error(result.error || 'Unknown error occurred');
            }
            
        } catch (error) {
            console.error('❌ Failed to request native Bluetooth permission:', error);
            
            let errorMessage = 'Failed to request Bluetooth permission from the system.';
            
            if (error.message.includes('HTTP 500')) {
                errorMessage += ' The server encountered an error. Check the console for details.';
            } else if (error.message.includes('Failed to fetch')) {
                errorMessage += ' Could not connect to the server.';
            } else {
                errorMessage += ` Error: ${error.message}`;
            }
            
            window.showToast('error', '❌ Permission Request Failed', errorMessage, 8000);
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
                await this.requestNativeBluetoothPermission();
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
    
    setupUserActivityTracking() {
        // Track user activity for idle detection
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        
        const updateActivity = () => {
            this.lastUserActivity = Date.now();
        };
        
        activityEvents.forEach(event => {
            document.addEventListener(event, updateActivity, true);
        });
        
        console.log('👤 User activity tracking initialized');
    }
    
    isUserIdle() {
        return (Date.now() - this.lastUserActivity) > this.idleThreshold;
    }
    
    startAutoScanning() {
        if (this.autoScanEnabled) {
            console.log('🔍 Auto-scanning already enabled');
            return;
        }
        
        this.autoScanEnabled = true;
        console.log('🔍 Starting automatic device scanning for Device Connection tab');
        
        // Start initial scan immediately
        this.performAutoScan();
        
        // Set up periodic scanning with dynamic rate based on idle status
        this.autoScanInterval = setInterval(() => {
            this.performAutoScan();
        }, this.getCurrentScanRate());
        
        // Start continuous permission checking
        this.startAutoPermissionChecking();
        
        this.showNotification('Auto-scanning enabled for Device Connection tab', 'info', 'Devices will be scanned automatically while this tab is open');
    }
    
    stopAutoScanning() {
        if (!this.autoScanEnabled) {
            return;
        }
        
        this.autoScanEnabled = false;
        console.log('⏹️ Stopping automatic device scanning');
        
        // Clear scanning interval
        if (this.autoScanInterval) {
            clearInterval(this.autoScanInterval);
            this.autoScanInterval = null;
        }
        
        // Stop auto permission checking
        this.stopAutoPermissionChecking();
        
        // Stop any ongoing scan
        if (this.isScanning) {
            this.stopScan();
        }
        
        this.showNotification('Auto-scanning disabled', 'info');
    }
    
    getCurrentScanRate() {
        return this.isUserIdle() ? this.idleScanRate : this.normalScanRate;
    }
    
    performAutoScan() {
        if (!this.autoScanEnabled || this.currentTab !== 'devices') {
            return;
        }
        
        const rate = this.getCurrentScanRate();
        const idleStatus = this.isUserIdle() ? ' (idle mode)' : '';
        
        console.log(`🔍 Auto-scan triggered - next scan in ${rate/1000}s${idleStatus}`);
        
        // Start a scan if not already scanning
        if (!this.isScanning) {
            this.startScan();
        }
        
        // Update scan interval based on current idle status
        if (this.autoScanInterval) {
            clearInterval(this.autoScanInterval);
            this.autoScanInterval = setInterval(() => {
                this.performAutoScan();
            }, this.getCurrentScanRate());
        }
    }
    
    startAutoPermissionChecking() {
        if (this.autoPermissionCheckInterval) {
            return;
        }
        
        console.log('🔒 Starting continuous permission checking');
        
        // Check permissions every 10 seconds when on devices tab
        this.autoPermissionCheckInterval = setInterval(() => {
            if (this.autoScanEnabled && this.currentTab === 'devices') {
                this.checkServerPermissions();
            }
        }, 10000);
    }
    
    stopAutoPermissionChecking() {
        if (this.autoPermissionCheckInterval) {
            clearInterval(this.autoPermissionCheckInterval);
            this.autoPermissionCheckInterval = null;
            console.log('🔒 Stopped continuous permission checking');
        }
    }
    
    // Date/Time Utility Methods
    getRelativeTimeDisplay(timestamp) {
        if (!timestamp) return 'unknown';
        
        const now = new Date();
        const date = new Date(timestamp);
        
        const seconds = dateFns.differenceInSeconds(now, date);
        
        if (seconds < 1) return 'now';
        if (seconds < 60) return `${seconds}s ago`;
        
        const minutes = dateFns.differenceInMinutes(now, date);
        if (minutes < 60) return `${minutes}m ago`;
        
        const hours = dateFns.differenceInHours(now, date);
        if (hours < 24) return `${hours}h ago`;
        
        return dateFns.formatDistanceToNow(date, { addSuffix: true });
    }
    
    formatSessionTimestamp(timestamp) {
        if (!timestamp) return 'Unknown';
        return dateFns.format(new Date(timestamp), 'MMM dd, yyyy HH:mm:ss');
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
        if (dashboard.autoScanInterval) {
            clearInterval(dashboard.autoScanInterval);
        }
        if (dashboard.autoPermissionCheckInterval) {
            clearInterval(dashboard.autoPermissionCheckInterval);
        }
        
        // Stop auto-scanning cleanly
        if (dashboard.autoScanEnabled) {
            dashboard.stopAutoScanning();
        }
    }
});