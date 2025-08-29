// FIXME: Frontend JavaScript improvements needed:
// 1. Migrate from vanilla JS to modern framework (React/Vue/Svelte)
// 2. Add TypeScript for better type safety and developer experience
// 3. Implement proper state management (Redux/Zustand/Pinia)
// 4. Add unit tests for UI components and business logic
// 5. Implement proper error boundaries and fallback UI
// 6. Add service worker for offline functionality
// 7. Optimize bundle size with tree shaking and code splitting
// 8. Add proper accessibility (ARIA labels, keyboard navigation)
// 9. Implement PWA capabilities for mobile app experience
// 10. Add end-to-end testing with Playwright/Cypress

// UltiBiker Dashboard JavaScript

// FIXME: Replace with proper error handling library (e.g., Sentry Browser SDK)
// Error Handler Class
class ErrorHandler {
    constructor() {
        this.toastId = 0;
        this.setupErrorDialogHandlers();
        this.setupGlobalErrorHandlers();
        this.setupNotificationBatching();
    }

    setupNotificationBatching() {
        // Modern notification coalescing system based on 2025 UX research
        this.activeToasts = new Map(); // id -> toast reference
        this.coalescingQueue = new Map(); // signature -> notification data
        this.coalescingTimers = new Map(); // signature -> timer id
        this.lastShown = new Map(); // signature -> timestamp
        
        // Configuration based on UX research
        this.coalescingDelay = 800; // Optimal delay from UX research
        this.duplicateSuppressionWindow = 5000; // 5s window to prevent duplicates
        this.maxToastsVisible = 4; // Limit visible toasts (UX best practice)
        this.toastAutoHideDelay = 6000; // Auto-hide delay
        
        // Message grouping patterns
        this.messagePatterns = new Map(); // For intelligent grouping
        this.setupCoalescingPatterns();
    }

    setupCoalescingPatterns() {
        // Define common notification patterns for intelligent grouping
        this.coalescingRules = [
            {
                name: 'connection',
                pattern: /connect|disconnect|link|unlink/i,
                group: 'connectivity',
                priority: 'high'
            },
            {
                name: 'sensor',
                pattern: /sensor|device|reading|data/i,
                group: 'sensors',
                priority: 'medium'
            },
            {
                name: 'error',
                pattern: /error|fail|problem|issue/i,
                group: 'errors',
                priority: 'high'
            },
            {
                name: 'permission',
                pattern: /permission|access|grant|deny/i,
                group: 'permissions',
                priority: 'high'
            }
        ];
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
            // Report to server
            this.reportErrorToServer({
                message: event.message,
                stack: event.error?.stack,
                url: event.filename,
                severity: 'high',
                context: { 
                    type: 'javascript-error',
                    line: event.lineno,
                    column: event.colno
                }
            });

            this.handleError({
                type: 'JavaScript Error',
                message: event.message,
                details: `File: ${event.filename}\nLine: ${event.lineno}:${event.colno}\nError: ${event.error?.stack || event.message}`,
                showReload: true
            });
        });

        // Unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            // Report to server
            this.reportErrorToServer({
                message: `Unhandled Promise Rejection: ${event.reason}`,
                stack: event.reason?.stack,
                severity: 'high',
                context: { type: 'promise-rejection' }
            });

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
                const response = await originalFetch.apply(window, args);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response;
            } catch (error) {
                this.handleNetworkError(error, args[0]);
                // Report error to server for logging
                this.reportErrorToServer({
                    message: `Network Error: ${error.message}`,
                    stack: error.stack,
                    url: args[0],
                    severity: 'high',
                    context: { type: 'network-error', fetchUrl: args[0] }
                });
                throw error;
            }
        };
    }

    // Report errors to server for logging
    async reportErrorToServer(errorData) {
        try {
            // Use original fetch to avoid recursion
            const originalFetch = window.fetch.__original || window.fetch;
            await originalFetch('/api/errors/report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...errorData,
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent,
                    url: window.location.href
                })
            });
        } catch (reportingError) {
            console.warn('Failed to report error to server:', reportingError);
        }
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

    showToast(message, type = 'info', description = null, duration = 5000, skipCoalescing = false) {
        if (skipCoalescing) {
            return this.showImmediateToast(message, type, description, duration);
        }

        return this.coalesceNotification(message, type, description, duration);
    }

    // Generate signature for notification coalescing
    generateNotificationSignature(message, type, description) {
        // Find matching pattern for intelligent grouping
        const matchedRule = this.coalescingRules.find(rule => 
            rule.pattern.test(message) || (description && rule.pattern.test(description))
        );
        
        if (matchedRule) {
            // Group by semantic meaning
            return `${type}:${matchedRule.group}`;
        }
        
        // Fallback to exact message matching
        const messageKey = message.toLowerCase().replace(/\d+/g, 'N'); // Replace numbers
        return `${type}:${messageKey}`;
    }

    coalesceNotification(message, type, description, duration) {
        const signature = this.generateNotificationSignature(message, type, description);
        const now = Date.now();
        
        // Check for recent duplicate (duplicate suppression)
        const lastShownTime = this.lastShown.get(signature);
        if (lastShownTime && (now - lastShownTime) < this.duplicateSuppressionWindow) {
            // Update existing notification instead of showing duplicate
            this.updateExistingNotification(signature, message, description);
            return `coalesced-${signature}-${now}`;
        }
        
        // Add to coalescing queue
        if (!this.coalescingQueue.has(signature)) {
            this.coalescingQueue.set(signature, {
                messages: [],
                type: type,
                firstTimestamp: now,
                lastUpdated: now
            });
        }
        
        const queueData = this.coalescingQueue.get(signature);
        queueData.messages.push({ message, description, duration, timestamp: now });
        queueData.lastUpdated = now;
        
        // Clear existing timer
        if (this.coalescingTimers.has(signature)) {
            clearTimeout(this.coalescingTimers.get(signature));
        }
        
        // Set new timer with leading-edge debouncing
        const timer = setTimeout(() => {
            this.processCoalescedNotification(signature);
        }, this.coalescingDelay);
        
        this.coalescingTimers.set(signature, timer);
        
        // If queue is getting full or high priority, show immediately
        const matchedRule = this.coalescingRules.find(rule => 
            rule.pattern.test(message) || (description && rule.pattern.test(description))
        );
        
        if (queueData.messages.length >= 8 || (matchedRule && matchedRule.priority === 'high' && queueData.messages.length >= 3)) {
            clearTimeout(timer);
            this.processCoalescedNotification(signature);
        }
        
        return `coalesced-${signature}-${now}`;
    }
    
    updateExistingNotification(signature, message, description) {
        // Try to update existing toast if it's still visible
        const existingData = this.coalescingQueue.get(signature);
        if (existingData) {
            existingData.messages.push({ message, description, timestamp: Date.now() });
        }
        console.log(`Updated existing notification for signature: ${signature}`);
    }

    processCoalescedNotification(signature) {
        const queueData = this.coalescingQueue.get(signature);
        if (!queueData || queueData.messages.length === 0) return;
        
        const { messages, type } = queueData;
        const count = messages.length;
        
        // Enforce maximum visible toasts limit
        if (this.activeToasts.size >= this.maxToastsVisible) {
            // Remove oldest toast
            const oldestToast = this.activeToasts.values().next().value;
            if (oldestToast && oldestToast.hideToast) {
                oldestToast.hideToast();
            }
        }
        
        let displayMessage, displayDescription, displayDuration;
        
        if (count === 1) {
            // Single message - show normally but with coalescing delay
            const msg = messages[0];
            displayMessage = msg.message;
            displayDescription = msg.description;
            displayDuration = msg.duration || this.toastAutoHideDelay;
        } else {
            // Multiple messages - create intelligent summary
            const messageGroups = this.groupSimilarMessages(messages);
            
            if (messageGroups.size === 1) {
                // All messages are similar
                const [groupKey, groupData] = messageGroups.entries().next().value;
                displayMessage = `${groupData.representative.message} (${count}x)`;
                displayDescription = count > 1 ? `${count} similar notifications received` : groupData.representative.description;
            } else {
                // Mixed messages - use semantic grouping
                const semanticGroup = this.getSemanticGroup(signature);
                displayMessage = `${count} ${semanticGroup || type} notifications`;
                
                // Show top 3 unique messages
                const uniqueMessages = Array.from(messageGroups.keys()).slice(0, 3);
                displayDescription = uniqueMessages.join('\n');
                if (messageGroups.size > 3) {
                    displayDescription += `\n... and ${messageGroups.size - 3} more types`;
                }
            }
            
            // Longer duration for batched notifications
            displayDuration = Math.max(this.toastAutoHideDelay, count * 1500);
        }
        
        // Show the coalesced notification
        const toastId = this.showImmediateToast(displayMessage, type, displayDescription, displayDuration);
        
        // Track this notification
        this.lastShown.set(signature, Date.now());
        
        // Clean up
        this.coalescingQueue.delete(signature);
        this.coalescingTimers.delete(signature);
        
        return toastId;
    }
    
    groupSimilarMessages(messages) {
        const groups = new Map();
        
        messages.forEach(msg => {
            // Normalize message for grouping (remove numbers, timestamps, etc.)
            const normalizedKey = msg.message.toLowerCase()
                .replace(/\d+/g, 'N')
                .replace(/\b(at|on)\s+[\d:]+/g, 'at TIME')
                .trim();
            
            if (!groups.has(normalizedKey)) {
                groups.set(normalizedKey, {
                    representative: msg,
                    count: 0,
                    messages: []
                });
            }
            
            const group = groups.get(normalizedKey);
            group.count++;
            group.messages.push(msg);
        });
        
        return groups;
    }
    
    getSemanticGroup(signature) {
        const [type, group] = signature.split(':');
        const groupLabels = {
            'connectivity': 'connection',
            'sensors': 'sensor',
            'errors': 'error',
            'permissions': 'permission'
        };
        return groupLabels[group] || type;
    }

    showImmediateToast(message, type = 'info', description = null, duration = 5000) {
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
        this.lastPermissionState = null;
        this.permissionNotificationCount = 0;
        
        // Circuit breaker for server requests
        this.circuitBreaker = {
            state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
            failureCount: 0,
            failureThreshold: 3,
            timeout: 30000, // 30 seconds
            lastFailureTime: null,
            currentDelay: 15000, // Current polling delay
            baseDelay: 15000, // Base polling delay
            maxDelay: 300000, // Max 5 minutes
            backoffMultiplier: 2,
            lastErrorNotification: 0,
            errorNotificationCooldown: 60000 // 1 minute between error notifications
        };
        
        // Connectivity monitoring
        this.connectivity = {
            isOnline: navigator.onLine,
            serverConnected: false,
            internetBarDismissed: false,
            serverBarDismissed: false,
            lastServerCheck: 0,
            reconnectAttempts: 0,
            maxReconnectAttempts: 5
        };

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
        
        // Initialize connectivity monitoring
        this.setupConnectivityMonitoring();
        
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
            
            // Update connectivity monitoring
            this.connectivity.serverConnected = true;
            this.updateServerStatus();
            
            // Automatically dismiss any connection error dialogs when connection is restored
            console.log('🔌 Auto-dismissing connection error dialogs');
            errorHandler.hideErrorDialog();
            
            // Subscribe to events when we connect
            this.subscribeToEvents();
        });

        this.socket.on('disconnect', () => {
            console.log('🔌 Disconnected from UltiBiker server');
            this.updateConnectionStatus('disconnected');
            
            // Update connectivity monitoring
            this.connectivity.serverConnected = false;
            this.updateServerStatus();
            
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

        // Handle intelligent notifications from notification manager
        this.socket.on('intelligent-notification', (notification) => {
            console.log('🔔 Intelligent notification received:', notification);
            this.handleIntelligentNotification(notification);
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
        const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
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
            lastUpdateElement.textContent = this.lastUpdateTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }
        
        if (dataRateDisplayElement) {
            dataRateDisplayElement.textContent = this.dataRateCounter;
        }
    }
    
    updateRawDataStream(reading) {
        const rawDataElement = document.getElementById('rawDataStream');
        if (!rawDataElement) return;
        
        const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
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

    updateConnectedDevices() {
        // Update sensor category slots with connected devices
        this.updateSensorCategorySlots();
        
        // Also update available devices to hide connected ones
        this.updateDiscoveredDevices();
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
    
    resetSensorSlot(slotId) {
        const slot = document.getElementById(slotId);
        if (!slot) return;
        
        const deviceInfo = slot.querySelector('.sensor-device-info');
        const emptyState = slot.querySelector('.sensor-empty-state');
        
        if (deviceInfo) deviceInfo.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        
        slot.classList.remove('connected');
        slot.classList.add('empty');
    }
    
    populateSensorSlot(slotId, device) {
        const slot = document.getElementById(slotId);
        if (!slot) return;
        
        const deviceInfo = slot.querySelector('.sensor-device-info');
        const emptyState = slot.querySelector('.sensor-empty-state');
        const deviceName = slot.querySelector('.sensor-device-name');
        const deviceStatus = slot.querySelector('.sensor-device-status');
        const deviceValue = slot.querySelector('.sensor-device-value');
        
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
    
    formatSensorValue(deviceType, sensorData) {
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
    
    createDiscoveredDeviceElement(device) {
        const div = document.createElement('div');
        div.className = 'device-list-item discovered';
        div.id = `discovered-${device.deviceId}`;
        
        const typeIcon = this.getDeviceIcon(device.type);
        const protocolIcon = device.protocol === 'ant_plus' ? 'fas fa-satellite-dish' : 'fab fa-bluetooth';
        const signalClass = this.getSignalClass(device.signalStrength || 0);
        
        div.innerHTML = `
            <div class="d-flex justify-content-between align-items-center w-100">
                <div class="flex-grow-1">
                    <div class="fw-bold d-flex align-items-center mb-1">
                        <i class="${typeIcon} me-2"></i>
                        ${device.displayName || device.name || 'Unknown Device'}
                        ${device.manufacturer ? `<small class="text-muted ms-2">${device.manufacturer}</small>` : ''}
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
                <div class="d-flex align-items-center">
                    <button class="btn btn-sm btn-outline-primary" onclick="dashboard.connectDevice('${device.deviceId}')" title="Connect">
                        <i class="fas fa-plus"></i> Add
                    </button>
                </div>
            </div>
        `;
        
        return div;
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
        
        // Cycling relevance badge
        const getCyclingRelevanceBadge = (relevance) => {
            if (!relevance || relevance === 0) return '';
            if (relevance >= 90) return `<span class="badge bg-success me-1" title="High cycling relevance">🚴 High</span>`;
            if (relevance >= 60) return `<span class="badge bg-warning text-dark me-1" title="Medium cycling relevance">🚴 Medium</span>`;
            if (relevance >= 30) return `<span class="badge bg-info me-1" title="Low cycling relevance">🚴 Low</span>`;
            return `<span class="badge bg-light text-dark me-1" title="Unknown cycling relevance">🚴 Unknown</span>`;
        };
        const cyclingRelevanceInfo = getCyclingRelevanceBadge(device.cyclingRelevance);
        
        // Generate comprehensive device information
        const deviceDetails = this.generateDeviceDetailsHTML(device);
        
        div.innerHTML = `
            <div class="d-flex justify-content-between align-items-start w-100">
                <div class="flex-grow-1">
                    <!-- Main device info -->
                    <div class="fw-bold d-flex align-items-center mb-1">
                        <i class="${typeIcon} me-2 ${device.type}"></i>
                        ${device.displayName || device.name || 'Unknown Device'}
                        ${confidenceInfo}
                        <button class="btn btn-sm btn-link p-0 ms-2" onclick="dashboard.toggleDeviceDetails('${device.deviceId}')" title="Show device details">
                            <i class="fas fa-info-circle text-info"></i>
                        </button>
                    </div>
                    
                    <!-- Badge row -->
                    <div class="d-flex align-items-center flex-wrap mb-1">
                        ${cyclingRelevanceInfo}
                        ${manufacturerInfo}
                        ${categoryInfo}
                    </div>
                    
                    <!-- Connection info row -->
                    <div class="d-flex align-items-center justify-content-between mb-2">
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
                    
                    <!-- Expandable device details -->
                    <div id="device-details-${device.deviceId}" class="device-details-panel d-none">
                        ${deviceDetails}
                    </div>
                </div>
                
                <!-- Action buttons -->
                <div class="d-flex flex-column align-items-end">
                    ${isConnected 
                        ? `<button class="btn btn-sm btn-outline-danger mb-1" onclick="dashboard.disconnectDevice('${device.deviceId}')" title="Disconnect">
                             <i class="fas fa-unlink"></i>
                           </button>`
                        : `<button class="btn btn-sm btn-outline-primary mb-1" onclick="dashboard.connectDevice('${device.deviceId}')" title="Connect">
                             <i class="fas fa-link"></i> Add
                           </button>`
                    }
                    <small class="text-muted">${device.deviceId.slice(-4)}</small>
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

    handleIntelligentNotification(notification) {
        // Handle intelligent notifications from the notification manager
        if (!notification) return;
        
        console.log('🔔 Processing intelligent notification:', notification);
        
        // Handle batched notifications
        if (notification.type === 'batch') {
            this.handleBatchedNotification(notification);
        } else {
            // Handle individual notifications
            this.handleSingleNotification(notification);
        }
    }

    handleBatchedNotification(batchNotification) {
        const { batchType, count, summary, items, priority } = batchNotification;
        
        // Determine notification type based on batch type and priority
        let notificationType = 'info';
        if (priority >= 8) notificationType = 'error';
        else if (priority >= 6) notificationType = 'warning';
        else if (batchType === 'device-connection') notificationType = 'success';
        
        // Show batched notification with summary
        this.showNotification(summary, notificationType, {
            duration: 8000, // Longer duration for batched notifications
            details: items.length > 1 ? `${items.length} related events` : null
        });
        
        // Log individual items for debugging
        console.log(`📦 Batch notification processed: ${summary}`, items);
    }

    handleSingleNotification(notification) {
        const { type, priority, message, deviceName, data } = notification;
        
        // Determine notification type based on priority and type
        let notificationType = 'info';
        if (type === 'error' || priority >= 8) {
            notificationType = 'error';
        } else if (type === 'warning' || priority >= 6) {
            notificationType = 'warning';
        } else if (type === 'device-connection') {
            notificationType = 'success';
        }
        
        // Show the notification
        this.showNotification(message, notificationType, {
            duration: type === 'error' ? 10000 : 6000
        });
        
        console.log(`🔔 Single notification processed: ${message} (priority: ${priority})`);
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
        console.log(`🔄 updateSessionUI called: isActive=${isActive}, sessionId=${sessionId}, sessionName=${sessionName}`);
        
        const startBtn = document.getElementById('startSessionBtn');
        const stopBtn = document.getElementById('stopSessionBtn');
        const sessionStatus = document.getElementById('sessionStatus');
        const recordingStatus = document.getElementById('recordingStatus');
        const recordingIndicator = document.getElementById('recordingIndicator');
        const sessionControls = document.getElementById('sessionControls');
        const pauseBtn = document.getElementById('pauseSessionBtn');
        const exportBtn = document.getElementById('exportSessionBtn');
        
        // Debug: Log element availability
        const elements = { startBtn, stopBtn, sessionStatus, recordingStatus, recordingIndicator, sessionControls, pauseBtn, exportBtn };
        const missingElements = Object.entries(elements).filter(([name, el]) => !el).map(([name]) => name);
        if (missingElements.length > 0) {
            console.warn(`⚠️ Missing DOM elements: ${missingElements.join(', ')}`);
        }
        
        this.isRecording = isActive;
        this.currentSessionId = sessionId;
        
        // Helper function to reliably hide elements
        const forceHide = (element, elementName) => {
            if (element) {
                element.style.setProperty('display', 'none', 'important');
                element.classList.add('d-none');
                console.log(`✅ ${elementName} hidden with display: none !important and d-none class`);
            }
        };
        
        // Helper function to reliably show elements
        const forceShow = (element, displayType, elementName) => {
            if (element) {
                element.classList.remove('d-none');
                element.style.setProperty('display', displayType, 'important');
                console.log(`✅ ${elementName} shown with display: ${displayType} !important`);
            }
        };
        
        if (isActive) {
            console.log('🟢 Setting UI to active session state');
            forceHide(startBtn, 'startBtn');
            forceShow(stopBtn, 'inline-block', 'stopBtn');
            forceShow(sessionControls, 'flex', 'sessionControls');
            forceShow(pauseBtn, 'inline-block', 'pauseBtn');
            forceShow(exportBtn, 'inline-block', 'exportBtn');
            
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
            console.log('🔴 Setting UI to inactive session state - HIDING pause/export buttons');
            forceShow(startBtn, 'inline-block', 'startBtn');
            forceHide(stopBtn, 'stopBtn');
            forceHide(sessionControls, 'sessionControls');
            forceHide(pauseBtn, 'pauseBtn');
            forceHide(exportBtn, 'exportBtn');
            
            if (sessionStatus) {
                sessionStatus.innerHTML = '<span class="badge bg-secondary">No Active Session</span>';
            }
            if (recordingStatus) {
                recordingStatus.textContent = 'Waiting for Session';
                recordingStatus.className = 'fw-bold text-warning';
            }
            if (recordingIndicator) recordingIndicator.style.display = 'none';
        }
        
        // Verify the final state after a short delay to catch any race conditions
        setTimeout(() => {
            if (!isActive) {
                const finalSessionControls = document.getElementById('sessionControls');
                const finalPauseBtn = document.getElementById('pauseSessionBtn');
                const finalExportBtn = document.getElementById('exportSessionBtn');
                
                // Check if elements are properly hidden
                const isControlsVisible = finalSessionControls && window.getComputedStyle(finalSessionControls).display !== 'none';
                const isPauseVisible = finalPauseBtn && window.getComputedStyle(finalPauseBtn).display !== 'none';
                const isExportVisible = finalExportBtn && window.getComputedStyle(finalExportBtn).display !== 'none';
                
                if (isControlsVisible || isPauseVisible || isExportVisible) {
                    console.error('❌ SESSION UI BUG DETECTED: Buttons visible when session inactive!');
                    console.error(`   sessionControls visible: ${isControlsVisible}`);
                    console.error(`   pauseBtn visible: ${isPauseVisible}`);  
                    console.error(`   exportBtn visible: ${isExportVisible}`);
                    
                    // Force hide again with maximum specificity
                    if (finalSessionControls) {
                        finalSessionControls.style.setProperty('display', 'none', 'important');
                        finalSessionControls.classList.add('d-none');
                    }
                    if (finalPauseBtn) {
                        finalPauseBtn.style.setProperty('display', 'none', 'important');
                        finalPauseBtn.classList.add('d-none');
                    }
                    if (finalExportBtn) {
                        finalExportBtn.style.setProperty('display', 'none', 'important');
                        finalExportBtn.classList.add('d-none');
                    }
                } else {
                    console.log('✅ Session UI verified: All buttons properly hidden when inactive');
                }
            }
        }, 100);
    }

    startLiveTimeUpdate() {
        this.liveTimeInterval = setInterval(() => {
            const now = new Date();
            const timeElement = document.getElementById('liveTime');
            if (timeElement) {
                timeElement.textContent = now.toLocaleTimeString('en-US', { 
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
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

    shouldAttemptRequest() {
        const breaker = this.circuitBreaker;
        const now = Date.now();
        
        switch (breaker.state) {
            case 'CLOSED':
                return true;
            case 'OPEN':
                if (now - breaker.lastFailureTime >= breaker.timeout) {
                    breaker.state = 'HALF_OPEN';
                    console.log('🔄 Circuit breaker transitioning to HALF_OPEN');
                    return true;
                }
                return false;
            case 'HALF_OPEN':
                return true;
            default:
                return true;
        }
    }
    
    onRequestSuccess() {
        const breaker = this.circuitBreaker;
        if (breaker.state === 'HALF_OPEN' || breaker.failureCount > 0) {
            console.log('✅ Server connection restored, resetting circuit breaker');
            breaker.state = 'CLOSED';
            breaker.failureCount = 0;
            breaker.currentDelay = breaker.baseDelay;
            this.updatePollingInterval();
            
            // Update connectivity status
            this.connectivity.serverConnected = true;
            this.updateServerStatus();
            
            // Auto-dismiss connection error dialogs when circuit breaker recovers
            console.log('✅ Auto-dismissing connection error dialogs - circuit breaker recovered');
            errorHandler.hideErrorDialog();
        }
    }
    
    onRequestFailure(error) {
        const breaker = this.circuitBreaker;
        const now = Date.now();
        
        breaker.failureCount++;
        breaker.lastFailureTime = now;
        
        if (breaker.state === 'HALF_OPEN') {
            breaker.state = 'OPEN';
            console.log('❌ Circuit breaker opened - server still unavailable');
        } else if (breaker.failureCount >= breaker.failureThreshold) {
            breaker.state = 'OPEN';
            console.log(`❌ Circuit breaker opened after ${breaker.failureCount} failures`);
        }
        
        // Implement exponential backoff
        if (breaker.state === 'OPEN') {
            breaker.currentDelay = Math.min(
                breaker.currentDelay * breaker.backoffMultiplier,
                breaker.maxDelay
            );
            this.updatePollingInterval();
            console.log(`⏳ Polling interval increased to ${breaker.currentDelay / 1000}s`);
            
            // Update connectivity status when circuit breaker opens
            this.connectivity.serverConnected = false;
            this.updateServerStatus();
        }
        
        // Only show error notifications with cooldown
        if (now - breaker.lastErrorNotification >= breaker.errorNotificationCooldown) {
            breaker.lastErrorNotification = now;
            return true; // Show error notification
        }
        return false; // Skip error notification
    }
    
    updatePollingInterval() {
        // Update the permission checking intervals with new delay
        if (this.permissionUpdateInterval) {
            clearInterval(this.permissionUpdateInterval);
            this.permissionUpdateInterval = setInterval(() => {
                this.checkServerPermissions();
            }, this.circuitBreaker.currentDelay);
        }
        
        if (this.autoPermissionCheckInterval) {
            clearInterval(this.autoPermissionCheckInterval);
            this.autoPermissionCheckInterval = setInterval(() => {
                if (this.autoScanEnabled && this.currentTab === 'devices') {
                    this.checkServerPermissions();
                }
            }, Math.max(this.circuitBreaker.currentDelay * 0.7, 10000)); // Slightly more frequent for active tab
        }
    }

    hasPermissionStateChanged(newPermissions) {
        if (!this.lastPermissionState) {
            return true; // First check, always show
        }
        
        const lastState = this.lastPermissionState;
        
        // Check Bluetooth permission changes
        const bluetoothChanged = 
            newPermissions.bluetooth?.granted !== lastState.bluetooth?.granted ||
            newPermissions.bluetooth?.denied !== lastState.bluetooth?.denied ||
            newPermissions.bluetooth?.requiresUserAction !== lastState.bluetooth?.requiresUserAction;
            
        // Check USB permission changes
        const usbChanged = 
            newPermissions.usb?.granted !== lastState.usb?.granted ||
            newPermissions.usb?.denied !== lastState.usb?.denied;
        
        return bluetoothChanged || usbChanged;
    }

    async checkServerPermissions() {
        // Check circuit breaker before attempting request
        if (!this.shouldAttemptRequest()) {
            // Only log when circuit breaker is preventing requests every 10th attempt
            if (this.permissionNotificationCount % 10 === 0) {
                console.log(`🔒 Circuit breaker ${this.circuitBreaker.state} - skipping server check`);
            }
            this.permissionNotificationCount++;
            return;
        }
        
        // Only log every 10th check to reduce spam
        if (this.permissionNotificationCount % 10 === 0) {
            console.log('🔒 Checking server device permissions...');
        }
        this.permissionNotificationCount++;
        
        try {
            const response = await fetch('/api/permissions/status');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            const newPermissions = result.data?.permissions || result.permissions;
            
            // Request succeeded - notify circuit breaker
            this.onRequestSuccess();
            
            // Only update if permissions have actually changed
            if (this.hasPermissionStateChanged(newPermissions)) {
                console.log('🔒 Permission state changed, updating display:', newPermissions);
                
                // Store server permissions for device status display
                this.serverPermissions = newPermissions;
                this.lastPermissionState = JSON.parse(JSON.stringify(newPermissions)); // Deep copy
                
                this.updatePermissionDisplay(result);
                this.updateDeviceStatusDisplay(); // Update device indicators with real status
            } else {
                // Still update serverPermissions for other components that rely on it
                this.serverPermissions = newPermissions;
            }
        } catch (error) {
            console.error('❌ Failed to check server permissions:', error);
            
            // Handle failure through circuit breaker
            const shouldShowError = this.onRequestFailure(error);
            
            if (shouldShowError) {
                this.showPermissionError('Unable to check device permissions. Server connection issues detected.');
            }
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
        // Check permission status with circuit breaker delay
        this.permissionUpdateInterval = setInterval(() => {
            this.checkServerPermissions();
        }, this.circuitBreaker.currentDelay);

        console.log(`🔄 Started periodic permission status updates (${this.circuitBreaker.currentDelay / 1000}s interval)`);
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
    
    // Connectivity Monitoring
    setupConnectivityMonitoring() {
        // Set up internet connectivity monitoring
        window.addEventListener('online', () => {
            console.log('🌐 Internet connection restored');
            this.connectivity.isOnline = true;
            this.updateInternetStatus();
        });
        
        window.addEventListener('offline', () => {
            console.log('🌐 Internet connection lost');
            this.connectivity.isOnline = false;
            this.updateInternetStatus();
        });
        
        // Set up connectivity status bar event handlers
        this.setupConnectivityBarHandlers();
        
        // Initial status check
        this.updateInternetStatus();
        this.updateServerStatus();
        
        console.log('🔗 Connectivity monitoring initialized');
    }
    
    setupConnectivityBarHandlers() {
        // Internet bar dismiss button
        const dismissInternetBtn = document.getElementById('dismissInternetBar');
        if (dismissInternetBtn) {
            dismissInternetBtn.addEventListener('click', () => {
                this.dismissInternetBar();
            });
        }
        
        // Server bar dismiss button
        const dismissServerBtn = document.getElementById('dismissServerBar');
        if (dismissServerBtn) {
            dismissServerBtn.addEventListener('click', () => {
                this.dismissServerBar();
            });
        }
        
        // Reconnect button
        const reconnectBtn = document.getElementById('reconnectServer');
        if (reconnectBtn) {
            reconnectBtn.addEventListener('click', () => {
                this.attemptServerReconnect();
            });
        }
    }
    
    updateInternetStatus() {
        const internetBar = document.getElementById('internetStatusBar');
        const internetText = document.getElementById('internetStatusText');
        
        if (!this.connectivity.isOnline && !this.connectivity.internetBarDismissed) {
            // Show offline bar
            if (internetText) {
                internetText.textContent = 'No internet connection - Some features may be limited';
            }
            this.showConnectivityBar(internetBar);
        } else if (this.connectivity.isOnline) {
            // Hide offline bar when online - always hide regardless of dismissal
            console.log('🌐 Internet connected - auto-hiding connectivity bar');
            this.connectivity.internetBarDismissed = false; // Reset dismissal
            
            // Force hide the bar even if it was manually dismissed
            if (internetBar && !internetBar.classList.contains('d-none')) {
                this.hideConnectivityBar(internetBar);
            }
        }
    }
    
    updateServerStatus() {
        const serverBar = document.getElementById('serverStatusBar');
        const serverText = document.getElementById('serverStatusText');
        const reconnectBtn = document.getElementById('reconnectServer');
        
        if (!this.connectivity.serverConnected && !this.connectivity.serverBarDismissed) {
            // Show disconnected bar
            if (serverText) {
                if (this.connectivity.reconnectAttempts > 0) {
                    serverText.textContent = `Reconnecting to server... (attempt ${this.connectivity.reconnectAttempts}/${this.connectivity.maxReconnectAttempts})`;
                    serverBar.classList.add('reconnecting');
                    if (reconnectBtn) {
                        reconnectBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Reconnecting...';
                        reconnectBtn.disabled = true;
                    }
                } else {
                    serverText.textContent = 'Disconnected from UltiBiker server - Sensor data unavailable';
                    serverBar.classList.remove('reconnecting');
                    if (reconnectBtn) {
                        reconnectBtn.innerHTML = '<i class="fas fa-sync-alt me-1"></i>Reconnect';
                        reconnectBtn.disabled = false;
                    }
                }
            }
            this.showConnectivityBar(serverBar);
        } else if (this.connectivity.serverConnected) {
            // Hide disconnected bar when connected - always hide regardless of dismissal
            console.log('🔗 Server connected - auto-hiding connectivity bar');
            this.connectivity.serverBarDismissed = false; // Reset dismissal
            this.connectivity.reconnectAttempts = 0; // Reset attempts
            
            // Force hide the bar even if it was manually dismissed
            if (serverBar && !serverBar.classList.contains('d-none')) {
                this.hideConnectivityBar(serverBar);
            }
        }
    }
    
    showConnectivityBar(barElement) {
        if (!barElement) return;
        
        barElement.classList.remove('d-none', 'hiding');
        // Trigger reflow to ensure animation plays
        barElement.offsetHeight;
    }
    
    hideConnectivityBar(barElement) {
        if (!barElement || barElement.classList.contains('d-none')) return;
        
        barElement.classList.add('hiding');
        setTimeout(() => {
            barElement.classList.add('d-none');
            barElement.classList.remove('hiding');
        }, 300); // Match animation duration
    }
    
    dismissInternetBar() {
        const internetBar = document.getElementById('internetStatusBar');
        this.connectivity.internetBarDismissed = true;
        this.hideConnectivityBar(internetBar);
        
        // Auto-show again after 5 minutes if still offline
        setTimeout(() => {
            if (!this.connectivity.isOnline) {
                this.connectivity.internetBarDismissed = false;
                this.updateInternetStatus();
            }
        }, 300000); // 5 minutes
    }
    
    dismissServerBar() {
        const serverBar = document.getElementById('serverStatusBar');
        console.log('🔗 User manually dismissed server connectivity bar');
        this.connectivity.serverBarDismissed = true;
        this.hideConnectivityBar(serverBar);
        
        // Auto-show again after 2 minutes if still disconnected
        setTimeout(() => {
            if (!this.connectivity.serverConnected) {
                console.log('🔗 Auto-showing server connectivity bar after 2 minutes');
                this.connectivity.serverBarDismissed = false;
                this.updateServerStatus();
            }
        }, 120000); // 2 minutes
    }
    
    async attemptServerReconnect() {
        if (this.connectivity.reconnectAttempts >= this.connectivity.maxReconnectAttempts) {
            console.log('🔗 Max reconnection attempts reached');
            return;
        }
        
        this.connectivity.reconnectAttempts++;
        this.updateServerStatus(); // Update UI to show reconnecting state
        
        try {
            // Force socket reconnection
            if (this.socket) {
                this.socket.disconnect();
                setTimeout(() => {
                    this.socket.connect();
                }, 1000);
            }
            
            // Also try a direct server health check
            const response = await fetch('/health');
            if (response.ok) {
                console.log('🔗 Server reconnection successful');
                this.connectivity.serverConnected = true;
                this.connectivity.reconnectAttempts = 0;
                this.updateServerStatus();
                
                // Auto-dismiss connection error dialogs when manual reconnection succeeds
                console.log('🔗 Auto-dismissing connection error dialogs - manual reconnection succeeded');
                errorHandler.hideErrorDialog();
            }
        } catch (error) {
            console.log(`🔗 Reconnection attempt ${this.connectivity.reconnectAttempts} failed:`, error);
            
            if (this.connectivity.reconnectAttempts >= this.connectivity.maxReconnectAttempts) {
                // Reset after 5 minutes
                setTimeout(() => {
                    this.connectivity.reconnectAttempts = 0;
                    this.updateServerStatus();
                }, 300000);
            }
        }
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
        
        // Check permissions with circuit breaker aware interval when on devices tab
        const interval = Math.max(this.circuitBreaker.currentDelay * 0.7, 10000);
        this.autoPermissionCheckInterval = setInterval(() => {
            if (this.autoScanEnabled && this.currentTab === 'devices') {
                this.checkServerPermissions();
            }
        }, interval);
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
    
    generateDeviceDetailsHTML(device) {
        if (!device) return '<p class="text-muted">No device data available</p>';
        
        let html = '<div class="device-details-content">';
        
        // Basic device information section
        html += '<div class="detail-section">';
        html += '<h6 class="detail-section-title"><i class="fas fa-info-circle me-1"></i>Device Information</h6>';
        html += '<div class="detail-grid">';
        html += `<div class="detail-item"><strong>Device ID:</strong> <code>${device.deviceId}</code></div>`;
        html += `<div class="detail-item"><strong>Name:</strong> ${device.name || 'Unknown'}</div>`;
        if (device.displayName && device.displayName !== device.name) {
            html += `<div class="detail-item"><strong>Display Name:</strong> ${device.displayName}</div>`;
        }
        html += `<div class="detail-item"><strong>Type:</strong> <span class="badge bg-primary">${device.type || 'unknown'}</span></div>`;
        html += `<div class="detail-item"><strong>Protocol:</strong> <span class="badge bg-info">${device.protocol || 'unknown'}</span></div>`;
        if (device.manufacturer) {
            html += `<div class="detail-item"><strong>Manufacturer:</strong> ${device.manufacturer}</div>`;
        }
        if (device.model) {
            html += `<div class="detail-item"><strong>Model:</strong> ${device.model}</div>`;
        }
        if (device.category) {
            html += `<div class="detail-item"><strong>Category:</strong> ${device.category}</div>`;
        }
        if (device.confidence) {
            html += `<div class="detail-item"><strong>ID Confidence:</strong> <span class="badge ${device.confidence >= 80 ? 'bg-success' : device.confidence >= 50 ? 'bg-warning' : 'bg-danger'}">${device.confidence}%</span></div>`;
        }
        html += '</div></div>';
        
        // Connection information section
        html += '<div class="detail-section">';
        html += '<h6 class="detail-section-title"><i class="fas fa-wifi me-1"></i>Connection Details</h6>';
        html += '<div class="detail-grid">';
        html += `<div class="detail-item"><strong>Connected:</strong> <span class="badge ${device.isConnected ? 'bg-success' : 'bg-secondary'}">${device.isConnected ? 'Yes' : 'No'}</span></div>`;
        html += `<div class="detail-item"><strong>Signal Strength:</strong> <span class="badge ${device.signalStrength >= 80 ? 'bg-success' : device.signalStrength >= 60 ? 'bg-warning' : 'bg-danger'}">${device.signalStrength || 0}%</span></div>`;
        if (device.batteryLevel) {
            html += `<div class="detail-item"><strong>Battery Level:</strong> <span class="badge bg-success">${device.batteryLevel}%</span></div>`;
        }
        if (device.cyclingRelevance) {
            html += `<div class="detail-item"><strong>Cycling Relevance:</strong> <span class="badge ${device.cyclingRelevance >= 80 ? 'bg-success' : device.cyclingRelevance >= 50 ? 'bg-warning' : 'bg-info'}">${device.cyclingRelevance}/100</span></div>`;
        }
        html += '</div></div>';
        
        // Firmware/Hardware information
        if (device.firmwareVersion || device.metadata?.hardwareRevision || device.metadata?.firmwareRevision || device.metadata?.softwareRevision) {
            html += '<div class="detail-section">';
            html += '<h6 class="detail-section-title"><i class="fas fa-microchip me-1"></i>Firmware & Hardware</h6>';
            html += '<div class="detail-grid">';
            if (device.firmwareVersion) {
                html += `<div class="detail-item"><strong>Firmware Version:</strong> ${device.firmwareVersion}</div>`;
            }
            if (device.metadata?.hardwareRevision) {
                html += `<div class="detail-item"><strong>Hardware Rev:</strong> ${device.metadata.hardwareRevision}</div>`;
            }
            if (device.metadata?.firmwareRevision && device.metadata.firmwareRevision !== device.firmwareVersion) {
                html += `<div class="detail-item"><strong>Firmware Rev:</strong> ${device.metadata.firmwareRevision}</div>`;
            }
            if (device.metadata?.softwareRevision) {
                html += `<div class="detail-item"><strong>Software Rev:</strong> ${device.metadata.softwareRevision}</div>`;
            }
            if (device.metadata?.serialNumber) {
                html += `<div class="detail-item"><strong>Serial Number:</strong> <code>${device.metadata.serialNumber}</code></div>`;
            }
            html += '</div></div>';
        }
        
        // Services and Characteristics (for BLE devices)
        if (device.services && device.services.length > 0) {
            html += '<div class="detail-section">';
            html += '<h6 class="detail-section-title"><i class="fab fa-bluetooth me-1"></i>BLE Services</h6>';
            html += '<div class="services-list">';
            device.services.forEach(service => {
                html += `<div class="service-item">`;
                html += `<strong>${service.name}</strong> <code class="text-muted">${service.uuid}</code>`;
                if (service.description) {
                    html += `<br><small class="text-muted">${service.description}</small>`;
                }
                html += `</div>`;
            });
            html += '</div></div>';
        }
        
        // Capabilities
        if (device.capabilities && device.capabilities.length > 0) {
            html += '<div class="detail-section">';
            html += '<h6 class="detail-section-title"><i class="fas fa-cogs me-1"></i>Capabilities</h6>';
            html += '<div class="capabilities-list">';
            device.capabilities.forEach(capability => {
                html += `<span class="badge bg-light text-dark me-1 mb-1">${capability}</span>`;
            });
            html += '</div></div>';
        }
        
        // Raw advertisement data (if available)
        if (device.metadata?.rawAdvertisement) {
            const rawData = device.metadata.rawAdvertisement;
            html += '<div class="detail-section">';
            html += '<h6 class="detail-section-title"><i class="fas fa-code me-1"></i>Raw Advertisement Data</h6>';
            html += '<div class="raw-data-container">';
            
            if (rawData.address) {
                html += `<div class="detail-item"><strong>Address:</strong> <code>${rawData.address}</code></div>`;
            }
            if (rawData.addressType) {
                html += `<div class="detail-item"><strong>Address Type:</strong> ${rawData.addressType}</div>`;
            }
            if (rawData.connectable !== undefined) {
                html += `<div class="detail-item"><strong>Connectable:</strong> <span class="badge ${rawData.connectable ? 'bg-success' : 'bg-warning'}">${rawData.connectable ? 'Yes' : 'No'}</span></div>`;
            }
            
            // Manufacturer data
            if (rawData.manufacturerData && Object.keys(rawData.manufacturerData).length > 0) {
                html += '<div class="manufacturer-data">';
                html += '<strong>Manufacturer Data:</strong>';
                Object.entries(rawData.manufacturerData).forEach(([companyId, data]) => {
                    html += `<div class="ms-2"><code>Company ID ${companyId}:</code> ${Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' ')}</div>`;
                });
                html += '</div>';
            }
            
            // Service data
            if (rawData.serviceData && Object.keys(rawData.serviceData).length > 0) {
                html += '<div class="service-data">';
                html += '<strong>Service Data:</strong>';
                Object.entries(rawData.serviceData).forEach(([serviceUuid, data]) => {
                    html += `<div class="ms-2"><code>${serviceUuid}:</code> ${Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' ')}</div>`;
                });
                html += '</div>';
            }
            
            // TX Power Level
            if (rawData.txPowerLevel !== undefined) {
                html += `<div class="detail-item"><strong>TX Power Level:</strong> ${rawData.txPowerLevel} dBm</div>`;
            }
            
            // Service UUIDs
            if (rawData.serviceUuids && rawData.serviceUuids.length > 0) {
                html += '<div class="service-uuids">';
                html += '<strong>Advertised Service UUIDs:</strong>';
                rawData.serviceUuids.forEach(uuid => {
                    html += `<div class="ms-2"><code>${uuid}</code></div>`;
                });
                html += '</div>';
            }
            
            html += '</div></div>';
        }
        
        html += '</div>';
        return html;
    }
    
    toggleDeviceDetails(deviceId) {
        const detailsPanel = document.getElementById(`device-details-${deviceId}`);
        const toggleButton = document.querySelector(`#device-${deviceId} .btn-link i`);
        
        if (!detailsPanel || !toggleButton) {
            console.warn(`Device details panel or toggle button not found for device: ${deviceId}`);
            return;
        }
        
        const isExpanded = !detailsPanel.classList.contains('d-none');
        
        if (isExpanded) {
            // Collapse
            detailsPanel.classList.add('d-none');
            toggleButton.className = 'fas fa-info-circle text-info';
            toggleButton.parentElement.title = 'Show device details';
        } else {
            // Expand
            detailsPanel.classList.remove('d-none');
            toggleButton.className = 'fas fa-info-circle text-warning';
            toggleButton.parentElement.title = 'Hide device details';
        }
    }

    // Apple Watch setup and management
    showAppleWatchSetup() {
        const setupDiv = document.getElementById('appleWatchSetup');
        if (setupDiv) {
            setupDiv.style.display = 'block';
            setupDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    hideAppleWatchSetup() {
        const setupDiv = document.getElementById('appleWatchSetup');
        if (setupDiv) {
            setupDiv.style.display = 'none';
        }
    }

    async showAppleWatchGuide() {
        try {
            // Fetch Apple Watch setup instructions from API
            const response = await fetch('/api/permissions/apple-watch-setup');
            const data = await response.json();
            
            if (data.success) {
                const instructions = data.data;
                this.displayAppleWatchModal(instructions);
            } else {
                throw new Error(data.error || 'Failed to load Apple Watch setup instructions');
            }
        } catch (error) {
            console.error('Error loading Apple Watch guide:', error);
            this.showNotification('Failed to load Apple Watch setup guide', 'error');
        }
    }

    displayAppleWatchModal(instructions) {
        // Create modal content
        const modalContent = `
            <div class="modal fade" id="appleWatchModal" tabindex="-1" aria-labelledby="appleWatchModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title" id="appleWatchModalLabel">
                                <span class="me-2">🍎</span>${instructions.title}
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <p class="lead">${instructions.description}</p>
                            
                            <div class="row">
                                <div class="col-md-8">
                                    <h6><strong>Setup Steps:</strong></h6>
                                    <ol class="mb-4">
                                        ${instructions.steps.map(step => `<li>${step}</li>`).join('')}
                                    </ol>
                                    
                                    <h6><strong>Recommended Apps:</strong></h6>
                                    <ul class="mb-4">
                                        ${instructions.requiredApps.map(app => `<li>${app}</li>`).join('')}
                                    </ul>
                                    
                                    <div class="alert alert-warning">
                                        <h6><strong>Limitations:</strong></h6>
                                        <ul class="mb-0">
                                            ${instructions.limitations.map(limitation => `<li>${limitation}</li>`).join('')}
                                        </ul>
                                    </div>
                                    
                                    <div class="alert alert-info">
                                        <h6><strong>Troubleshooting:</strong></h6>
                                        <ul class="mb-0">
                                            ${instructions.troubleshooting.map(tip => `<li>${tip}</li>`).join('')}
                                        </ul>
                                    </div>
                                </div>
                                <div class="col-md-4 text-center">
                                    <div style="font-size: 5rem; margin: 2rem 0;">⌚️</div>
                                    <p class="text-muted">Apple Watch + iPhone</p>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close Guide</button>
                            <button type="button" class="btn btn-primary" onclick="dashboard.startDeviceScanning(); bootstrap.Modal.getInstance(document.getElementById('appleWatchModal')).hide();">
                                🔍 Start Device Scan
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if present
        const existingModal = document.getElementById('appleWatchModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to DOM
        document.body.insertAdjacentHTML('beforeend', modalContent);

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('appleWatchModal'));
        modal.show();

        // Clean up modal when hidden
        document.getElementById('appleWatchModal').addEventListener('hidden.bs.modal', () => {
            document.getElementById('appleWatchModal').remove();
        });
    }

    // Auto-detect macOS and show Apple Watch setup hint
    checkForAppleWatchSupport() {
        // Check if running on macOS (best Apple Watch support)
        const isMacOS = navigator.platform.toLowerCase().includes('mac');
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        
        if (isMacOS || isIOS) {
            // Show hint for Apple Watch users
            setTimeout(() => {
                if (!localStorage.getItem('apple-watch-hint-shown')) {
                    this.showNotification(
                        '🍎 Apple Watch detected! Set up heart rate monitoring for cycling sessions.',
                        'info',
                        { 
                            duration: 8000,
                            onclick: () => this.showAppleWatchSetup()
                        }
                    );
                    localStorage.setItem('apple-watch-hint-shown', 'true');
                }
            }, 3000);
        }
    }
}

// Initialize dashboard when page loads
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new UltiBikerDashboard();
    
    // Make dashboard globally accessible for error handler
    window.dashboard = dashboard;
    
    // Check for Apple Watch support on Apple platforms
    dashboard.checkForAppleWatchSupport();
    
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