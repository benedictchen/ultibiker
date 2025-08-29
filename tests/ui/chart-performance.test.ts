import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Chart.js
const mockChart = {
  data: {
    labels: [] as string[],
    datasets: [
      { data: [] as number[] },
      { data: [] as number[] },
      { data: [] as number[] },
      { data: [] as number[] }
    ]
  },
  update: vi.fn(),
  destroy: vi.fn()
};

const mockChartConstructor = vi.fn(() => mockChart);

// Mock Chart.js globally
global.Chart = mockChartConstructor as any;

// Mock DOM elements
global.document = {
  getElementById: vi.fn(() => ({
    getContext: vi.fn(() => ({}))
  }))
} as any;

global.Date = class extends Date {
  toLocaleTimeString() {
    return '10:30:15';
  }
};

// Import the dashboard class after mocks are set up
class TestUltiBikerDashboard {
  private chart: any;
  private maxDataPoints = 50;

  constructor() {
    this.chart = mockChart;
  }

  // Replicate the problematic updateChart method from dashboard.js
  updateChart(reading: { metricType: string, value: number, timestamp?: string }) {
    const now = reading.timestamp || new Date().toLocaleTimeString();
    const datasets = this.chart.data.datasets;
    const labels = this.chart.data.labels;
    
    // Add timestamp - THIS IS THE BUG: no limit checking before adding
    labels.push(now);
    
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
    
    // Ensure all datasets have the same length - THIS IS THE BUG: keeps adding nulls
    datasets.forEach((dataset: any, index: number) => {
      if (index === datasetIndex) {
        dataset.data.push(reading.value);
      } else {
        dataset.data.push(null);
      }
    });
    
    this.chart.update('none');
  }

  // Fixed version with proper data limiting
  updateChartFixed(reading: { metricType: string, value: number, timestamp?: string }) {
    const now = reading.timestamp || new Date().toLocaleTimeString();
    const datasets = this.chart.data.datasets;
    const labels = this.chart.data.labels;
    
    // Add timestamp
    labels.push(now);
    
    // Remove old data if exceeding max points
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
    datasets.forEach((dataset: any, index: number) => {
      if (index === datasetIndex) {
        dataset.data.push(reading.value);
      } else {
        dataset.data.push(null);
      }
      
      // Remove old data if exceeding max points
      if (dataset.data.length > this.maxDataPoints) {
        dataset.data.shift();
      }
    });
    
    this.chart.update('none');
  }

  getDataPointCount(): number {
    return this.chart.data.labels.length;
  }

  getMaxDatasetLength(): number {
    return Math.max(...this.chart.data.datasets.map((ds: any) => ds.data.length));
  }
}

describe('Chart Performance and Memory Management', () => {
  let dashboard: TestUltiBikerDashboard;

  beforeEach(() => {
    // Reset mock chart data
    mockChart.data.labels = [];
    mockChart.data.datasets.forEach(dataset => {
      dataset.data = [];
    });
    mockChart.update.mockClear();

    dashboard = new TestUltiBikerDashboard();
  });

  describe('Original buggy updateChart method', () => {
    it('should demonstrate memory leak with continuous data addition', () => {
      // Simulate 200 sensor readings (4x the max limit)
      for (let i = 0; i < 200; i++) {
        dashboard.updateChart({
          metricType: 'heart_rate',
          value: 160 + Math.random() * 20,
          timestamp: `10:30:${String(i % 60).padStart(2, '0')}`
        });
      }

      // This will fail with the buggy version - demonstrates the memory leak
      expect(dashboard.getDataPointCount()).toBeGreaterThan(50);
      expect(dashboard.getMaxDatasetLength()).toBeGreaterThan(50);
      
      // Verify the bug: data keeps growing indefinitely
      expect(dashboard.getDataPointCount()).toBe(200);
      expect(dashboard.getMaxDatasetLength()).toBe(200);
    });

    it('should show exponential memory growth with multiple test metric types', () => {
      const testMetricTypes = ['test_metric_1', 'test_metric_2', 'test_metric_3', 'test_metric_4'];
      
      console.log('⚠️ Testing chart performance with test metrics (not sensor simulation)');
      console.log('🚫 Mock sensor types are NOT supported - using test metric types');
      
      // Use test data patterns for each metric type
      for (let i = 0; i < 100; i++) {
        testMetricTypes.forEach(type => {
          dashboard.updateChart({
            metricType: type,
            value: (i % 100), // Deterministic pattern
            timestamp: `10:30:${String(i % 60).padStart(2, '0')}`
          });
        });
      }

      // With the bug, we'll have 400 data points (100 readings × 4 sensor types)
      expect(dashboard.getDataPointCount()).toBe(400);
      expect(dashboard.getMaxDatasetLength()).toBe(400);
      
      // Each dataset will have 100 actual values + 300 null values = 400 total
      dashboard.chart.data.datasets.forEach((dataset: any) => {
        expect(dataset.data.length).toBe(400);
      });
    });

    it('should demonstrate performance degradation with test data', () => {
      const startTime = Date.now();
      
      console.log('⚠️ Testing chart performance with heavy test data load');
      console.log('🚫 Heavy sensor simulation is NOT supported - using test data patterns');
      
      // Use heavy test data load (not sensor simulation)
      for (let i = 0; i < 1000; i++) {
        dashboard.updateChart({
          metricType: 'test_heavy_metric',
          value: (i % 200) + 100 // Deterministic pattern
        });
      }
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // Verify that chart.update was called for every single data point
      expect(mockChart.update).toHaveBeenCalledTimes(1000);
      
      // Verify excessive data accumulation
      expect(dashboard.getDataPointCount()).toBe(1000);
      
      // Log performance impact (for manual inspection)
      console.log(`Processed 1000 data points in ${processingTime}ms`);
      console.log(`Final data point count: ${dashboard.getDataPointCount()}`);
    });
  });

  describe('Fixed updateChartFixed method', () => {
    it('should properly limit data points to maximum threshold', () => {
      const dashboard = new TestUltiBikerDashboard();
      
      // Simulate 200 sensor readings (4x the max limit)
      for (let i = 0; i < 200; i++) {
        dashboard.updateChartFixed({
          metricType: 'heart_rate',
          value: 160 + Math.random() * 20,
          timestamp: `10:30:${String(i % 60).padStart(2, '0')}`
        });
      }

      // Should be limited to maxDataPoints (50)
      expect(dashboard.getDataPointCount()).toBeLessThanOrEqual(50);
      expect(dashboard.getMaxDatasetLength()).toBeLessThanOrEqual(50);
      
      // Verify exact limit
      expect(dashboard.getDataPointCount()).toBe(50);
      expect(dashboard.getMaxDatasetLength()).toBe(50);
    });

    it('should maintain consistent memory usage with multiple sensor types', () => {
      const dashboard = new TestUltiBikerDashboard();
      const sensorTypes = ['heart_rate', 'power', 'cadence', 'speed'];
      
      // Simulate 100 readings for each sensor type
      for (let i = 0; i < 100; i++) {
        sensorTypes.forEach(type => {
          dashboard.updateChartFixed({
            metricType: type,
            value: Math.random() * 100,
            timestamp: `10:30:${String(i % 60).padStart(2, '0')}`
          });
        });
      }

      // Should be limited to maxDataPoints despite 400 total readings
      expect(dashboard.getDataPointCount()).toBeLessThanOrEqual(50);
      expect(dashboard.getMaxDatasetLength()).toBeLessThanOrEqual(50);
      
      // All datasets should have the same length
      const datasetLengths = dashboard.chart.data.datasets.map((ds: any) => ds.data.length);
      const allSameLength = datasetLengths.every(length => length === datasetLengths[0]);
      expect(allSameLength).toBe(true);
    });

    it('should show improved performance characteristics', () => {
      const dashboard = new TestUltiBikerDashboard();
      
      // Reset call count
      mockChart.update.mockClear();
      
      // Simulate heavy data load
      for (let i = 0; i < 1000; i++) {
        dashboard.updateChartFixed({
          metricType: 'heart_rate',
          value: 160 + Math.random() * 20
        });
      }
      
      // Should still call update for each data point (but with controlled data size)
      expect(mockChart.update).toHaveBeenCalledTimes(1000);
      
      // But data should be limited
      expect(dashboard.getDataPointCount()).toBe(50);
      expect(dashboard.getMaxDatasetLength()).toBe(50);
    });

    it('should properly remove oldest data when adding new data', () => {
      const dashboard = new TestUltiBikerDashboard();
      
      // Fill up to the maximum
      for (let i = 0; i < 50; i++) {
        dashboard.updateChartFixed({
          metricType: 'heart_rate',
          value: i, // Use index as value to track order
          timestamp: `time_${i}`
        });
      }
      
      // Verify we're at the limit
      expect(dashboard.getDataPointCount()).toBe(50);
      expect(dashboard.chart.data.labels[0]).toBe('time_0');
      expect(dashboard.chart.data.labels[49]).toBe('time_49');
      
      // Add one more data point
      dashboard.updateChartFixed({
        metricType: 'heart_rate',
        value: 50,
        timestamp: 'time_50'
      });
      
      // Should still be at the limit but oldest data should be removed
      expect(dashboard.getDataPointCount()).toBe(50);
      expect(dashboard.chart.data.labels[0]).toBe('time_1'); // First item removed
      expect(dashboard.chart.data.labels[49]).toBe('time_50'); // New item added
      
      // Check dataset data
      const heartRateDataset = dashboard.chart.data.datasets[0];
      expect(heartRateDataset.data[0]).toBe(1); // First value removed
      expect(heartRateDataset.data[49]).toBe(50); // New value added
    });
  });

  describe('Memory usage patterns', () => {
    it('should maintain constant memory footprint over time', () => {
      const dashboard = new TestUltiBikerDashboard();
      const measurements: number[] = [];
      
      // Simulate real-time data over extended period
      for (let batch = 0; batch < 10; batch++) {
        // Add 100 data points per batch
        for (let i = 0; i < 100; i++) {
          dashboard.updateChartFixed({
            metricType: 'heart_rate',
            value: 160 + Math.random() * 20
          });
        }
        
        // Measure memory usage (data point count as proxy)
        measurements.push(dashboard.getDataPointCount());
      }
      
      // All measurements after reaching the limit should be the same
      const stabilizedMeasurements = measurements.slice(1); // Skip first batch
      const allSame = stabilizedMeasurements.every(count => count === 50);
      expect(allSame).toBe(true);
      
      console.log('Memory usage over time (data points):', measurements);
    });
  });
});