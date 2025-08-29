import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { JSDOM } from 'jsdom';

// Mock DOM environment for testing
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
  <!-- Error Dialog -->
  <div id="errorOverlay" class="error-overlay">
    <div class="error-dialog">
      <div class="error-header">
        <div id="errorIcon" class="error-icon error">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <h3 id="errorTitle" class="error-title">Error</h3>
        <button id="errorCloseBtn" class="error-close"></button>
      </div>
      <div class="error-body">
        <p id="errorMessage" class="error-message">An error occurred</p>
        <button id="errorToggleDetails" class="error-toggle-details">Show details</button>
        <div id="errorDetails" class="error-details"></div>
        <div class="error-actions">
          <button id="errorRetryBtn" class="error-btn error-btn-secondary">Retry</button>
          <button id="errorReloadBtn" class="error-btn error-btn-secondary">Reload</button>
          <button id="errorOkBtn" class="error-btn error-btn-primary">OK</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Toast Container -->
  <div id="toastContainer" class="toast-container"></div>
</body>
</html>
`, { url: 'http://localhost:3000' });

// Set up global DOM
global.window = dom.window as any;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.Element = dom.window.Element;
global.Node = dom.window.Node;

// Mock fetch for network error testing
global.fetch = vi.fn();

// Error Handler Class (copied from dashboard.js for testing)
class ErrorHandler {
  toastId: number = 0;
  currentRetryAction: (() => void) | null = null;

  constructor() {
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

    const closeDialog = () => this.hideErrorDialog();
    
    closeBtn?.addEventListener('click', closeDialog);
    okBtn?.addEventListener('click', closeDialog);
    
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeDialog();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay && overlay.classList.contains('show')) {
        closeDialog();
      }
    });

    retryBtn?.addEventListener('click', () => {
      if (this.currentRetryAction) {
        this.currentRetryAction();
      }
      closeDialog();
    });

    reloadBtn?.addEventListener('click', () => {
      (window as any).location?.reload?.();
    });

    toggleDetailsBtn?.addEventListener('click', () => {
      if (detailsDiv) {
        const isShowing = detailsDiv.classList.contains('show');
        detailsDiv.classList.toggle('show');
        toggleDetailsBtn.textContent = isShowing ? 'Show technical details' : 'Hide technical details';
      }
    });
  }

  setupGlobalErrorHandlers() {
    // Mock global error handlers for testing
  }

  showErrorDialog(config: {
    type?: string;
    title?: string;
    message?: string;
    details?: string | null;
    showRetry?: boolean;
    showReload?: boolean;
    retryAction?: (() => void) | null;
  }) {
    const {
      type = 'error',
      title = 'Error',
      message = 'An unexpected error occurred',
      details = null,
      showRetry = false,
      showReload = false,
      retryAction = null
    } = config;

    this.currentRetryAction = retryAction;

    const overlay = document.getElementById('errorOverlay');
    const icon = document.getElementById('errorIcon');
    const titleEl = document.getElementById('errorTitle');
    const messageEl = document.getElementById('errorMessage');
    const detailsEl = document.getElementById('errorDetails');
    const toggleDetailsBtn = document.getElementById('errorToggleDetails');
    const retryBtn = document.getElementById('errorRetryBtn');
    const reloadBtn = document.getElementById('errorReloadBtn');

    if (icon) {
      icon.className = `error-icon ${type}`;
      const iconMap = {
        error: 'fas fa-exclamation-triangle',
        warning: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle',
        success: 'fas fa-check-circle'
      };
      icon.innerHTML = `<i class="${(iconMap as any)[type] || iconMap.error}"></i>`;
    }

    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;

    if (details && detailsEl && toggleDetailsBtn) {
      detailsEl.textContent = details;
      toggleDetailsBtn.style.display = 'block';
      detailsEl.classList.remove('show');
      toggleDetailsBtn.textContent = 'Show technical details';
    } else if (toggleDetailsBtn) {
      toggleDetailsBtn.style.display = 'none';
    }

    if (retryBtn) {
      retryBtn.style.display = showRetry ? 'inline-flex' : 'none';
    }
    if (reloadBtn) {
      reloadBtn.style.display = showReload ? 'inline-flex' : 'none';
    }

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

  showToast(message: string, type: string = 'info', description: string | null = null, duration: number = 5000) {
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
        <i class="${(iconMap as any)[type] || iconMap.info}"></i>
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

    setTimeout(() => {
      toast.classList.add('show');
    }, 100);

    if (duration > 0) {
      setTimeout(() => {
        this.removeToast(toastId);
      }, duration);
    }

    return toastId;
  }

  removeToast(toastId: string) {
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

  handleError(config: any) {
    console.error('Error handled:', config);
    this.showErrorDialog(config);
  }

  handleConnectionError(retryAction: (() => void) | null = null) {
    this.showErrorDialog({
      type: 'error',
      title: 'Connection Error',
      message: 'Unable to connect to the UltiBiker server. Please check that the server is running and try again.',
      details: 'Connection failed to ws://localhost:3000\\n\\nTroubleshooting steps:\\n1. Ensure the UltiBiker server is running\\n2. Check if port 3000 is accessible\\n3. Verify no firewall is blocking the connection\\n4. Try refreshing the page',
      showRetry: !!retryAction,
      showReload: true,
      retryAction
    });
  }

  handleSensorError(error: Error, deviceName: string = 'sensor') {
    this.showErrorDialog({
      type: 'warning',
      title: 'Sensor Connection Issue',
      message: `There was a problem connecting to ${deviceName}. This might be due to hardware permissions or device compatibility.`,
      details: error.stack || error.message,
      showRetry: true,
      retryAction: () => {
        if ((window as any).dashboard && (window as any).dashboard.startScan) {
          (window as any).dashboard.startScan();
        }
      }
    });
  }

  handlePermissionError(permission: string, instructions: string = '') {
    this.showErrorDialog({
      type: 'warning',
      title: 'Permission Required',
      message: `${permission} permission is required for UltiBiker to work properly.`,
      details: instructions || `Please grant ${permission} permission and try again.\\n\\nOn most browsers, you can find this in:\\n• Chrome: Settings > Privacy & Security > Site Settings\\n• Firefox: Settings > Privacy & Security > Permissions`,
      showReload: true
    });
  }

  handleServerError(error: Error) {
    this.showErrorDialog({
      type: 'error',
      title: 'Server Error',
      message: 'The UltiBiker server encountered an error while processing your request.',
      details: error.message || 'Unknown server error',
      showReload: true
    });
  }
}

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    // Reset DOM state
    document.getElementById('errorOverlay')?.classList.remove('show');
    document.getElementById('toastContainer')!.innerHTML = '';
    
    // Create new error handler
    errorHandler = new ErrorHandler();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Error Dialog', () => {
    it('should show error dialog with basic configuration', () => {
      errorHandler.showErrorDialog({
        title: 'Test Error',
        message: 'This is a test error message'
      });

      const overlay = document.getElementById('errorOverlay');
      const title = document.getElementById('errorTitle');
      const message = document.getElementById('errorMessage');

      expect(overlay?.classList.contains('show')).toBe(true);
      expect(title?.textContent).toBe('Test Error');
      expect(message?.textContent).toBe('This is a test error message');
    });

    it('should show error dialog with details', () => {
      const details = 'Stack trace: Error at line 123';
      
      errorHandler.showErrorDialog({
        title: 'Test Error',
        message: 'Error with details',
        details
      });

      const detailsEl = document.getElementById('errorDetails');
      const toggleBtn = document.getElementById('errorToggleDetails');

      expect(detailsEl?.textContent).toBe(details);
      expect(toggleBtn?.style.display).toBe('block');
    });

    it('should show retry button when requested', () => {
      errorHandler.showErrorDialog({
        message: 'Retryable error',
        showRetry: true,
        retryAction: vi.fn()
      });

      const retryBtn = document.getElementById('errorRetryBtn');
      expect(retryBtn?.style.display).toBe('inline-flex');
    });

    it('should show reload button when requested', () => {
      errorHandler.showErrorDialog({
        message: 'Error requiring reload',
        showReload: true
      });

      const reloadBtn = document.getElementById('errorReloadBtn');
      expect(reloadBtn?.style.display).toBe('inline-flex');
    });

    it('should hide error dialog', () => {
      errorHandler.showErrorDialog({ message: 'Test' });
      
      const overlay = document.getElementById('errorOverlay');
      expect(overlay?.classList.contains('show')).toBe(true);

      errorHandler.hideErrorDialog();
      expect(overlay?.classList.contains('show')).toBe(false);
    });

    it('should execute retry action and close dialog', () => {
      const retryAction = vi.fn();
      
      errorHandler.showErrorDialog({
        message: 'Test',
        showRetry: true,
        retryAction
      });

      const retryBtn = document.getElementById('errorRetryBtn');
      retryBtn?.click();

      expect(retryAction).toHaveBeenCalled();
      
      const overlay = document.getElementById('errorOverlay');
      expect(overlay?.classList.contains('show')).toBe(false);
    });

    it('should close dialog when clicking OK button', () => {
      errorHandler.showErrorDialog({ message: 'Test' });
      
      const okBtn = document.getElementById('errorOkBtn');
      const overlay = document.getElementById('errorOverlay');
      
      expect(overlay?.classList.contains('show')).toBe(true);
      
      okBtn?.click();
      
      expect(overlay?.classList.contains('show')).toBe(false);
    });

    it('should close dialog when clicking close button', () => {
      errorHandler.showErrorDialog({ message: 'Test' });
      
      const closeBtn = document.getElementById('errorCloseBtn');
      const overlay = document.getElementById('errorOverlay');
      
      expect(overlay?.classList.contains('show')).toBe(true);
      
      closeBtn?.click();
      
      expect(overlay?.classList.contains('show')).toBe(false);
    });

    it('should toggle details visibility', () => {
      errorHandler.showErrorDialog({
        message: 'Test',
        details: 'Test details'
      });

      const toggleBtn = document.getElementById('errorToggleDetails');
      const detailsEl = document.getElementById('errorDetails');

      expect(detailsEl?.classList.contains('show')).toBe(false);
      expect(toggleBtn?.textContent).toBe('Show technical details');

      toggleBtn?.click();

      expect(detailsEl?.classList.contains('show')).toBe(true);
      expect(toggleBtn?.textContent).toBe('Hide technical details');
    });

    it('should set correct icon for different error types', () => {
      const testCases = [
        { type: 'error', expectedIcon: 'fas fa-exclamation-triangle' },
        { type: 'warning', expectedIcon: 'fas fa-exclamation-circle' },
        { type: 'info', expectedIcon: 'fas fa-info-circle' },
        { type: 'success', expectedIcon: 'fas fa-check-circle' }
      ];

      testCases.forEach(({ type, expectedIcon }) => {
        errorHandler.showErrorDialog({
          type,
          message: `Test ${type} message`
        });

        const icon = document.getElementById('errorIcon');
        expect(icon?.className).toBe(`error-icon ${type}`);
        expect(icon?.innerHTML).toBe(`<i class="${expectedIcon}"></i>`);
      });
    });
  });

  describe('Toast Notifications', () => {
    it('should create toast notification', () => {
      const toastId = errorHandler.showToast('Test message', 'info');

      const container = document.getElementById('toastContainer');
      const toast = document.getElementById(toastId!);

      expect(container?.children.length).toBe(1);
      expect(toast).toBeTruthy();
      expect(toast?.className).toBe('toast info');
    });

    it('should create toast with description', () => {
      errorHandler.showToast('Test message', 'info', 'Test description');

      const toast = document.querySelector('.toast');
      const description = toast?.querySelector('.toast-description');

      expect(description?.textContent).toBe('Test description');
    });

    it('should create different toast types', () => {
      const types = ['success', 'error', 'warning', 'info'];
      
      types.forEach(type => {
        errorHandler.showToast(`${type} message`, type);
      });

      const toasts = document.querySelectorAll('.toast');
      expect(toasts.length).toBe(4);

      types.forEach((type, index) => {
        expect(toasts[index].className).toBe(`toast ${type}`);
      });
    });

    it('should remove toast', () => {
      const toastId = errorHandler.showToast('Test message');
      
      let toast = document.getElementById(toastId!);
      expect(toast).toBeTruthy();

      errorHandler.removeToast(toastId!);
      
      // Check that remove class is added (actual removal happens after timeout)
      expect(toast?.classList.contains('show')).toBe(false);
    });

    it('should auto-remove toast after duration', async () => {
      vi.useFakeTimers();
      
      const toastId = errorHandler.showToast('Test message', 'info', null, 1000);
      
      let toast = document.getElementById(toastId!);
      expect(toast).toBeTruthy();

      // Fast forward time
      vi.advanceTimersByTime(1000);
      
      // Should call removeToast
      expect(toast?.classList.contains('show')).toBe(false);

      vi.useRealTimers();
    });
  });

  describe('Specialized Error Handlers', () => {
    it('should handle connection errors', () => {
      const retryAction = vi.fn();
      
      errorHandler.handleConnectionError(retryAction);

      const overlay = document.getElementById('errorOverlay');
      const title = document.getElementById('errorTitle');
      const message = document.getElementById('errorMessage');
      const details = document.getElementById('errorDetails');
      const retryBtn = document.getElementById('errorRetryBtn');
      const reloadBtn = document.getElementById('errorReloadBtn');

      expect(overlay?.classList.contains('show')).toBe(true);
      expect(title?.textContent).toBe('Connection Error');
      expect(message?.textContent).toContain('Unable to connect to the UltiBiker server');
      expect(details?.textContent).toContain('Connection failed to ws://localhost:3000');
      expect(retryBtn?.style.display).toBe('inline-flex');
      expect(reloadBtn?.style.display).toBe('inline-flex');
    });

    it('should handle sensor errors', () => {
      const error = new Error('Sensor connection failed');
      error.stack = 'Error: Sensor connection failed\\n    at test:1:1';
      
      errorHandler.handleSensorError(error, 'Heart Rate Monitor');

      const overlay = document.getElementById('errorOverlay');
      const title = document.getElementById('errorTitle');
      const message = document.getElementById('errorMessage');
      const details = document.getElementById('errorDetails');

      expect(overlay?.classList.contains('show')).toBe(true);
      expect(title?.textContent).toBe('Sensor Connection Issue');
      expect(message?.textContent).toContain('Heart Rate Monitor');
      expect(details?.textContent).toBe(error.stack);
    });

    it('should handle permission errors', () => {
      const instructions = 'Go to Settings > Privacy';
      
      errorHandler.handlePermissionError('Bluetooth', instructions);

      const overlay = document.getElementById('errorOverlay');
      const title = document.getElementById('errorTitle');
      const message = document.getElementById('errorMessage');
      const details = document.getElementById('errorDetails');
      const reloadBtn = document.getElementById('errorReloadBtn');

      expect(overlay?.classList.contains('show')).toBe(true);
      expect(title?.textContent).toBe('Permission Required');
      expect(message?.textContent).toContain('Bluetooth permission is required');
      expect(details?.textContent).toBe(instructions);
      expect(reloadBtn?.style.display).toBe('inline-flex');
    });

    it('should handle server errors', () => {
      const error = new Error('Internal server error');
      
      errorHandler.handleServerError(error);

      const overlay = document.getElementById('errorOverlay');
      const title = document.getElementById('errorTitle');
      const message = document.getElementById('errorMessage');
      const details = document.getElementById('errorDetails');
      const reloadBtn = document.getElementById('errorReloadBtn');

      expect(overlay?.classList.contains('show')).toBe(true);
      expect(title?.textContent).toBe('Server Error');
      expect(message?.textContent).toContain('server encountered an error');
      expect(details?.textContent).toBe('Internal server error');
      expect(reloadBtn?.style.display).toBe('inline-flex');
    });
  });

  describe('Event Handling', () => {
    it('should close dialog on Escape key', () => {
      errorHandler.showErrorDialog({ message: 'Test' });
      
      const overlay = document.getElementById('errorOverlay');
      expect(overlay?.classList.contains('show')).toBe(true);

      // Simulate Escape key press
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);

      expect(overlay?.classList.contains('show')).toBe(false);
    });

    it('should close dialog when clicking overlay background', () => {
      errorHandler.showErrorDialog({ message: 'Test' });
      
      const overlay = document.getElementById('errorOverlay');
      expect(overlay?.classList.contains('show')).toBe(true);

      // Simulate clicking on overlay (not child elements)
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: overlay });
      overlay?.dispatchEvent(event);

      expect(overlay?.classList.contains('show')).toBe(false);
    });

    it('should not close dialog when clicking inside dialog', () => {
      errorHandler.showErrorDialog({ message: 'Test' });
      
      const overlay = document.getElementById('errorOverlay');
      const dialog = overlay?.querySelector('.error-dialog');
      expect(overlay?.classList.contains('show')).toBe(true);

      // Simulate clicking inside dialog
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: dialog });
      overlay?.dispatchEvent(event);

      expect(overlay?.classList.contains('show')).toBe(true);
    });
  });

  describe('Error Tracking', () => {
    it('should track current retry action', () => {
      const retryAction = vi.fn();
      
      errorHandler.showErrorDialog({
        message: 'Test',
        showRetry: true,
        retryAction
      });

      expect(errorHandler.currentRetryAction).toBe(retryAction);

      errorHandler.hideErrorDialog();
      expect(errorHandler.currentRetryAction).toBe(null);
    });

    it('should increment toast IDs', () => {
      const toast1 = errorHandler.showToast('Message 1');
      const toast2 = errorHandler.showToast('Message 2');
      const toast3 = errorHandler.showToast('Message 3');

      expect(toast1).toBe('toast-1');
      expect(toast2).toBe('toast-2');
      expect(toast3).toBe('toast-3');
    });
  });
});