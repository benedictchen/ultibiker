import { EventEmitter } from 'events';

/**
 * Intelligent notification management system for UltiBiker
 * Handles rate limiting, batching, and priority-based filtering
 */

export interface NotificationConfig {
  maxTokens: number;
  refillRate: number; 
  windowMs: number;
  batchingEnabled: boolean;
  maxBatchSize: number;
  maxWaitTime: number;
}

export interface SensorNotification {
  id: string;
  type: 'device-discovery' | 'device-connection' | 'sensor-data' | 'error' | 'warning';
  priority: number; // 1-10, higher = more important
  deviceId?: string;
  deviceName?: string;
  message: string;
  timestamp: number;
  data?: any;
  context?: 'scanning' | 'active-session' | 'setup' | 'maintenance';
}

export interface BatchedNotification {
  type: 'batch';
  batchType: string;
  count: number;
  summary: string;
  items: SensorNotification[];
  timestamp: number;
  priority: number;
}

class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private maxTokens: number,
    private refillRate: number,
    private windowMs: number
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  canConsume(): boolean {
    this.refill();
    if (this.tokens > 0) {
      this.tokens--;
      return true;
    }
    return false;
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = (timePassed / this.windowMs) * this.refillRate;
    
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}

class NotificationBatcher {
  private queues = new Map<string, SensorNotification[]>();
  private timers = new Map<string, NodeJS.Timeout>();
  private config: NotificationConfig;

  constructor(
    config: NotificationConfig,
    private onBatchReady: (batch: BatchedNotification) => void
  ) {
    this.config = config;
  }

  addNotification(notification: SensorNotification): void {
    const batchKey = this.getBatchKey(notification);
    
    if (!this.queues.has(batchKey)) {
      this.queues.set(batchKey, []);
    }

    const queue = this.queues.get(batchKey)!;
    queue.push(notification);

    // Clear existing timer
    const existingTimer = this.timers.get(batchKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer or check if we should send immediately
    if (queue.length >= this.config.maxBatchSize || this.shouldSendImmediately(notification)) {
      this.processBatch(batchKey);
    } else {
      const timer = setTimeout(() => {
        this.processBatch(batchKey);
      }, this.config.maxWaitTime);
      
      this.timers.set(batchKey, timer);
    }
  }

  private getBatchKey(notification: SensorNotification): string {
    // Group similar notifications together
    if (notification.type === 'device-discovery') {
      return `discovery-${notification.context || 'default'}`;
    }
    return `${notification.type}-${notification.context || 'default'}`;
  }

  private shouldSendImmediately(notification: SensorNotification): boolean {
    // High priority notifications bypass batching
    return notification.priority >= 8;
  }

  private processBatch(batchKey: string): void {
    const queue = this.queues.get(batchKey);
    if (!queue || queue.length === 0) return;

    const batch = this.createBatch(batchKey, queue);
    this.queues.delete(batchKey);
    
    const timer = this.timers.get(batchKey);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(batchKey);
    }

    this.onBatchReady(batch);
  }

  private createBatch(batchKey: string, notifications: SensorNotification[]): BatchedNotification {
    const [type, context] = batchKey.split('-');
    const count = notifications.length;
    const highestPriority = Math.max(...notifications.map(n => n.priority));
    
    let summary: string;
    let displayDevices: string[] = [];
    
    if (type === 'discovery') {
      const uniqueDeviceNames = new Set(notifications.map(n => n.deviceName).filter(Boolean));
      const deviceList = Array.from(uniqueDeviceNames);
      
      if (deviceList.length <= 3) {
        // Show device names if 3 or fewer
        displayDevices = deviceList.slice(0, 3).filter((name): name is string => name !== undefined);
        summary = `Found ${count} sensor${count > 1 ? 's' : ''}: ${displayDevices.join(', ')}`;
      } else {
        // Show count and first few devices for larger lists
        displayDevices = deviceList.slice(0, 2).filter((name): name is string => name !== undefined);
        summary = `Found ${count} sensor${count > 1 ? 's' : ''}: ${displayDevices.join(', ')} and ${deviceList.length - 2} more`;
      }
    } else if (type === 'device-connection') {
      const connectionTypes = notifications.reduce((acc, n) => {
        const status = n.data?.status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const statusSummary = Object.entries(connectionTypes)
        .map(([status, count]) => `${count} ${status}`)
        .join(', ');
      
      summary = `Device connections: ${statusSummary}`;
    } else {
      summary = `${count} ${type.replace('-', ' ')} notification${count > 1 ? 's' : ''}`;
    }

    return {
      type: 'batch',
      batchType: type,
      count,
      summary,
      items: notifications.map(n => this.sanitizeNotificationData(n)),
      timestamp: Date.now(),
      priority: Math.min(7, highestPriority) // Batched notifications get slightly lower priority
    };
  }

  /**
   * Sanitize notification data to prevent [object Object] display issues
   */
  private sanitizeNotificationData(notification: SensorNotification): SensorNotification {
    return {
      ...notification,
      data: notification.data ? this.sanitizeData(notification.data) : undefined
    };
  }

  /**
   * Recursively sanitize data objects to ensure they can be properly displayed
   */
  private sanitizeData(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }
    
    if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
      return data;
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }
    
    if (typeof data === 'object') {
      const sanitized: any = {};
      
      Object.keys(data).forEach(key => {
        const value = data[key];
        
        if (typeof value === 'object' && value !== null) {
          // Convert objects to string representation for display
          if (value.toString !== Object.prototype.toString) {
            sanitized[key] = value.toString();
          } else {
            // Create a readable string for objects
            sanitized[key] = JSON.stringify(value, null, 2);
          }
        } else {
          sanitized[key] = value;
        }
      });
      
      return sanitized;
    }
    
    return String(data);
  }
}

export class IntelligentNotificationManager extends EventEmitter {
  private rateLimiters = new Map<string, TokenBucket>();
  private batcher: NotificationBatcher;
  private userContext: string = 'scanning'; // Default context
  private config: NotificationConfig;

  // Default configuration optimized for cycling sensor dashboard
  private defaultConfig: NotificationConfig = {
    // Rate limiting: 12 notifications per minute for most events
    maxTokens: 12,
    refillRate: 12,
    windowMs: 60000,
    
    // Batching: enabled with smart timing
    batchingEnabled: true,
    maxBatchSize: 8,
    maxWaitTime: 3000 // 3 seconds max wait
  };

  private priorityThresholds = {
    'scanning': 4,      // During scanning, show medium+ priority
    'setup': 3,         // During setup, show more notifications
    'active-session': 6, // During riding, only high priority
    'maintenance': 5     // During maintenance, medium-high priority
  };

  constructor(config?: Partial<NotificationConfig>) {
    super();
    this.config = { ...this.defaultConfig, ...config };
    
    this.batcher = new NotificationBatcher(this.config, (batch) => {
      this.emit('notification', batch);
    });
  }

  /**
   * Process a notification through the intelligent filtering system
   */
  processNotification(notification: SensorNotification): void {
    // Add context if not provided
    if (!notification.context) {
      notification.context = this.userContext as any;
    }

    // Check priority threshold for current context
    const threshold = (this.priorityThresholds as any)[this.userContext] || 5;
    if (notification.priority < threshold) {
      // Low priority - either drop or add to low-priority batch
      if (notification.type === 'device-discovery') {
        this.addToLowPriorityBatch(notification);
      }
      return;
    }

    // Check rate limits
    const rateLimitKey = `${notification.type}-${this.userContext}`;
    if (!this.checkRateLimit(rateLimitKey, notification)) {
      // Rate limited - add to batch instead of dropping
      if (this.config.batchingEnabled && this.canBatch(notification)) {
        this.batcher.addNotification(notification);
        return;
      }
      // Drop the notification if it can't be batched
      return;
    }

    // High priority or not rate limited - decide whether to batch or send immediately
    if (this.shouldSendImmediately(notification)) {
      this.emit('notification', notification);
    } else if (this.config.batchingEnabled && this.canBatch(notification)) {
      this.batcher.addNotification(notification);
    } else {
      this.emit('notification', notification);
    }
  }

  /**
   * Update the current user context (scanning, active-session, etc.)
   */
  setContext(context: 'scanning' | 'active-session' | 'setup' | 'maintenance'): void {
    this.userContext = context;
    console.log(`🔔 Notification context changed to: ${context}`);
  }

  /**
   * Create a notification for device discovery with appropriate priority
   */
  createDeviceDiscoveryNotification(deviceName: string, deviceType: string, signalStrength: number): SensorNotification {
    // Calculate priority based on device relevance and signal strength
    let priority = 3; // Base priority for discovery
    
    // Boost priority for cycling-relevant devices
    if (deviceType.includes('heart_rate') || deviceType.includes('power') || deviceType.includes('cadence')) {
      priority += 2;
    }
    
    // Boost priority for strong signals
    if (signalStrength > 80) priority += 1;
    else if (signalStrength < 40) priority -= 1;
    
    return {
      id: `discovery-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'device-discovery',
      priority: Math.max(1, Math.min(10, priority)),
      deviceName,
      message: `Found ${deviceName} (${deviceType})`,
      timestamp: Date.now(),
      data: { deviceType, signalStrength },
      context: this.userContext as any
    };
  }

  /**
   * Create a notification for device connection events
   */
  createDeviceConnectionNotification(deviceName: string, status: 'connected' | 'disconnected' | 'error'): SensorNotification {
    const priorities = { connected: 7, disconnected: 6, error: 8 };
    const messages = {
      connected: `Connected to ${deviceName}`,
      disconnected: `Disconnected from ${deviceName}`,
      error: `Connection error: ${deviceName}`
    };

    return {
      id: `connection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'device-connection',
      priority: priorities[status],
      deviceName,
      message: messages[status],
      timestamp: Date.now(),
      data: { status },
      context: this.userContext as any
    };
  }

  private checkRateLimit(rateLimitKey: string, notification: SensorNotification): boolean {
    if (!this.rateLimiters.has(rateLimitKey)) {
      const bucket = new TokenBucket(
        this.config.maxTokens,
        this.config.refillRate,
        this.config.windowMs
      );
      this.rateLimiters.set(rateLimitKey, bucket);
    }

    const bucket = this.rateLimiters.get(rateLimitKey)!;
    return bucket.canConsume();
  }

  private shouldSendImmediately(notification: SensorNotification): boolean {
    // Critical notifications always sent immediately
    if (notification.priority >= 8) return true;
    
    // Connection events sent immediately during setup
    if (notification.type === 'device-connection' && this.userContext === 'setup') return true;
    
    // Errors always sent immediately
    if (notification.type === 'error') return true;
    
    return false;
  }

  private canBatch(notification: SensorNotification): boolean {
    // Don't batch critical notifications
    if (notification.priority >= 8) return false;
    
    // Don't batch errors
    if (notification.type === 'error') return false;
    
    // Can batch discovery and most other events
    return true;
  }

  private addToLowPriorityBatch(notification: SensorNotification): void {
    // Create a low-priority version that gets batched with longer delays
    const lowPriorityNotification = {
      ...notification,
      priority: 2 // Force low priority
    };
    
    this.batcher.addNotification(lowPriorityNotification);
  }

  /**
   * Force flush all pending batches (useful when context changes)
   */
  flushPendingNotifications(): void {
    // This would trigger the batcher to send all pending notifications
    // Implementation would depend on adding a flush method to NotificationBatcher
  }

  /**
   * Get statistics for monitoring notification system performance
   */
  getStats(): { rateLimiters: number; context: string; config: NotificationConfig } {
    return {
      rateLimiters: this.rateLimiters.size,
      context: this.userContext,
      config: this.config
    };
  }
}