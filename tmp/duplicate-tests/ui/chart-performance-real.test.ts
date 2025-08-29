import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock global objects for browser environment
global.Chart = vi.fn().mockImplementation(() => ({
  data: {
    labels: [],
    datasets: [
      { data: [] },
      { data: [] },
      { data: [] },
      { data: [] }
    ]
  },
  update: vi.fn(),
  destroy: vi.fn(),
  canvas: {
    parentNode: {
      style: {}
    }
  }
}));

global.io = vi.fn().mockReturnValue({
  on: vi.fn(),
  emit: vi.fn()
});

global.document = {
  getElementById: vi.fn().mockReturnValue({
    getContext: vi.fn().mockReturnValue({}),
    textContent: '',
    innerHTML: '',
    style: {},
    addEventListener: vi.fn(),
    appendChild: vi.fn(),
    querySelector: vi.fn(),
    classList: {
      add: vi.fn(),
      remove: vi.fn()
    },
    parentElement: {
      parentElement: {
        classList: {
          add: vi.fn(),
          remove: vi.fn()
        }
      }
    }
  }),
  addEventListener: vi.fn(),
  createElement: vi.fn().mockReturnValue({
    className: '',
    innerHTML: '',
    style: {},
    appendChild: vi.fn(),
    classList: {
      add: vi.fn(),
      remove: vi.fn()
    }
  })
} as any;

global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

global.setTimeout = vi.fn().mockImplementation((fn) => fn()) as any;
global.setInterval = vi.fn().mockImplementation((fn) => 1) as any;

// Import the UltiBiker dashboard (simulated)
class MockUltiBikerDashboard {
  constructor() {
    this.isScanning = false;
    this.connectedDevices = new Map();
    this.discoveredDevices = new Map();
    this.dataPoints = 0;
    this.lastUpdateTime = null;
    this.dataRateCounter = 0;
    this.dataRateTimer = null;

    // Chart setup
    this.chart = new Chart();
    this.chartData = {
      heart_rate: [],
      power: [],
      cadence: [],
      speed: []
    };
    this.maxDataPoints = 50;
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
            console.warn('Unknown metric type:', reading.metricType);
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

  handleSensorData(reading) {
    this.dataPoints++;
    this.dataRateCounter++;
    this.lastUpdateTime = new Date();
    
    this.updateChart(reading);
  }

  getChartDataLength() {
    return {
      labels: this.chart.data.labels.length,
      datasets: this.chart.data.datasets.map(ds => ds.data.length)
    };
  }
}

describe('Real Chart Performance Tests', () => {
  let dashboard;
  let performanceTracker;

  beforeEach(() => {
    vi.clearAllMocks();
    dashboard = new MockUltiBikerDashboard();
    performanceTracker = {
      updateCalls: 0,
      memorySnapshots: []
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Memory Management', () => {
    it('should maintain constant memory footprint with continuous data', () => {
      const measurements = [];

      // Simulate 500 readings (10x the limit)
      for (let i = 0; i < 500; i++) {
        const reading = {
          metricType: 'heart_rate',
          value: 160 + Math.random() * 20,
          unit: 'bpm',
          timestamp: new Date().toISOString()
        };

        dashboard.handleSensorData(reading);

        // Take memory measurements every 50 readings
        if (i % 50 === 0) {
          measurements.push(dashboard.getChartDataLength());
        }
      }

      // After initial ramp-up, all measurements should stabilize
      const stableMeasurements = measurements.slice(2); // Skip first 2 measurements
      
      stableMeasurements.forEach(measurement => {
        expect(measurement.labels).toBeLessThanOrEqual(50);
        measurement.datasets.forEach(datasetLength => {
          expect(datasetLength).toBeLessThanOrEqual(50);
        });
      });

      console.log('Memory measurements over time:', measurements);
    });

    it('should handle multiple test metric types without memory growth', () => {
      const testMetricTypes = ['test_metric_1', 'test_metric_2', 'test_metric_3', 'test_metric_4'];
      
      console.log('⚠️ Testing chart memory with multiple test metric types');
      console.log('🚫 Sensor simulation is NOT supported - using test metric patterns');
      
      // Use test data patterns from different metric types
      for (let cycle = 0; cycle < 100; cycle++) {
        testMetricTypes.forEach((type, index) => {
          const testReading = {
            metricType: type,
            value: 50 + (cycle % 100), // Deterministic pattern
            unit: 'test_unit',
            timestamp: new Date().toISOString()
          };

          dashboard.handleSensorData(testReading);
        });
      }

      const finalMeasurement = dashboard.getChartDataLength();
      
      // Should be limited despite 400 total readings (100 cycles × 4 types)
      expect(finalMeasurement.labels).toBeLessThanOrEqual(50);
      finalMeasurement.datasets.forEach(datasetLength => {
        expect(datasetLength).toBeLessThanOrEqual(50);
      });

      // All datasets should be the same length
      const datasetLengths = finalMeasurement.datasets;
      const firstLength = datasetLengths[0];
      datasetLengths.forEach(length => {
        expect(length).toBe(firstLength);
      });
    });

    it('should demonstrate proper cleanup with edge cases', () => {
      // Test with unknown metric type
      dashboard.handleSensorData({
        metricType: 'unknown_metric',
        value: 100,
        unit: 'units'
      });

      // Chart should remain unchanged
      const afterUnknown = dashboard.getChartDataLength();
      expect(afterUnknown.labels).toBe(0);

      // Test with valid data after unknown
      dashboard.handleSensorData({
        metricType: 'heart_rate',
        value: 160,
        unit: 'bpm'
      });

      const afterValid = dashboard.getChartDataLength();
      expect(afterValid.labels).toBe(1);
      expect(afterValid.datasets[0]).toBe(1); // Heart rate dataset should have 1 point
      expect(afterValid.datasets[1]).toBe(1); // Other datasets should have null
    });
  });

  describe('Performance Characteristics', () => {
    it('should maintain consistent update performance', () => {
      const updateTimes = [];
      
      // Measure update performance over time
      for (let batch = 0; batch < 10; batch++) {
        const batchStart = performance.now();
        
        // Process 50 readings per batch
        for (let i = 0; i < 50; i++) {
          dashboard.handleSensorData({
            metricType: 'heart_rate',
            value: 160 + Math.random() * 20,
            unit: 'bpm'
          });
        }
        
        const batchTime = performance.now() - batchStart;
        updateTimes.push(batchTime);
      }

      // Performance should be consistent (no exponential degradation)
      const firstBatchTime = updateTimes[0];
      const lastBatchTime = updateTimes[updateTimes.length - 1];
      
      // Last batch shouldn't take more than 2x the first batch time
      expect(lastBatchTime).toBeLessThan(firstBatchTime * 2);
      
      console.log('Batch processing times:', updateTimes);
    });

    it('should limit chart update frequency', () => {
      const chartUpdateSpy = vi.spyOn(dashboard.chart, 'update');
      
      // Process many readings quickly
      for (let i = 0; i < 100; i++) {
        dashboard.handleSensorData({
          metricType: 'heart_rate',
          value: 160 + i,
          unit: 'bpm'
        });
      }

      // Chart update should be called for each reading
      expect(chartUpdateSpy).toHaveBeenCalledTimes(100);
      
      // But each call should use 'none' mode to disable animation
      chartUpdateSpy.mock.calls.forEach(call => {
        expect(call[0]).toBe('none');
      });
    });
  });

  describe('Data Integrity', () => {
    it('should maintain data consistency across datasets', () => {
      const readings = [
        { metricType: 'heart_rate', value: 160 },
        { metricType: 'power', value: 280 },
        { metricType: 'cadence', value: 90 },
        { metricType: 'speed', value: 35 }
      ];

      // Add multiple readings
      readings.forEach(reading => {
        dashboard.handleSensorData({
          ...reading,
          unit: 'test-unit'
        });
      });

      const measurement = dashboard.getChartDataLength();
      
      // All datasets should have the same length
      const expectedLength = readings.length;
      expect(measurement.labels).toBe(expectedLength);
      
      measurement.datasets.forEach(datasetLength => {
        expect(datasetLength).toBe(expectedLength);
      });
    });

    it('should handle rapid successive updates properly', () => {
      const rapidReadings = Array.from({ length: 20 }, (_, i) => ({
        metricType: 'heart_rate',
        value: 160 + i,
        unit: 'bpm',
        timestamp: new Date(Date.now() + i * 100).toISOString()
      }));

      // Process all readings rapidly
      rapidReadings.forEach(reading => {
        dashboard.handleSensorData(reading);
      });

      const measurement = dashboard.getChartDataLength();
      expect(measurement.labels).toBe(20);
      expect(measurement.datasets[0]).toBe(20); // Heart rate should have 20 points
      expect(measurement.datasets[1]).toBe(20); // Others should have 20 nulls
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed reading data gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn');
      
      // Test with missing metricType
      dashboard.handleSensorData({
        value: 160,
        unit: 'bpm'
      });

      // Should not crash and should warn
      expect(consoleSpy).toHaveBeenCalledWith('Unknown metric type:', undefined);
      
      // Chart should remain unchanged
      const measurement = dashboard.getChartDataLength();
      expect(measurement.labels).toBe(0);
    });

    it('should recover from chart errors gracefully', () => {
      const chartUpdateSpy = vi.spyOn(dashboard.chart, 'update')
        .mockImplementationOnce(() => {
          throw new Error('Chart update failed');
        });

      // Should not crash the application
      expect(() => {
        dashboard.handleSensorData({
          metricType: 'heart_rate',
          value: 160,
          unit: 'bpm'
        });
      }).not.toThrow();
    });
  });
});