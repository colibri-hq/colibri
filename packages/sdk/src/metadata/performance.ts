/**
 * Performance metrics for metadata operations
 */
export interface PerformanceMetrics {
  /** Operation name */
  operation: string;
  /** Provider name */
  provider?: string | undefined;
  /** Start timestamp */
  startTime: number;
  /** End timestamp */
  endTime?: number | undefined;
  /** Duration in milliseconds */
  duration?: number | undefined;
  /** Whether the operation was successful */
  success?: boolean | undefined;
  /** Error message if operation failed */
  error?: string | undefined;
  /** Number of records returned */
  recordCount?: number | undefined;
  /** Whether result came from cache */
  fromCache?: boolean | undefined;
  /** Additional metadata */
  metadata?: Record<string, any> | undefined;
}

/**
 * Aggregated performance statistics
 */
export interface PerformanceStats {
  /** Operation name */
  operation: string;
  /** Provider name (if applicable) */
  provider?: string | undefined;
  /** Total number of operations */
  totalOperations: number;
  /** Number of successful operations */
  successfulOperations: number;
  /** Number of failed operations */
  failedOperations: number;
  /** Success rate (0-1) */
  successRate: number;
  /** Average duration in milliseconds */
  averageDuration: number;
  /** Minimum duration in milliseconds */
  minDuration: number;
  /** Maximum duration in milliseconds */
  maxDuration: number;
  /** 95th percentile duration */
  p95Duration: number;
  /** Total records processed */
  totalRecords: number;
  /** Average records per operation */
  averageRecords: number;
  /** Cache hit rate (0-1) */
  cacheHitRate: number;
  /** First recorded timestamp */
  firstSeen: number;
  /** Last recorded timestamp */
  lastSeen: number;
}

/**
 * Performance monitoring configuration
 */
export interface PerformanceConfig {
  /** Whether performance monitoring is enabled */
  enabled: boolean;
  /** Maximum number of metrics to keep in memory */
  maxMetrics: number;
  /** How long to keep metrics in milliseconds */
  retentionPeriod: number;
  /** Whether to log performance metrics */
  enableLogging: boolean;
  /** Minimum duration to log (in ms) */
  logThreshold: number;
  /** Sample rate (0-1) for recording metrics */
  sampleRate: number;
}

/**
 * Default performance configuration
 */
export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  enabled: true,
  maxMetrics: 10000,
  retentionPeriod: 3600000, // 1 hour
  enableLogging: false,
  logThreshold: 1000, // 1 second
  sampleRate: 1.0, // Record all operations
};

/**
 * Performance monitor for metadata operations
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private config: PerformanceConfig;
  private cleanupTimer: NodeJS.Timeout | undefined;

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = { ...DEFAULT_PERFORMANCE_CONFIG, ...config };
    this.startCleanupTimer();
  }

  /**
   * Start timing an operation
   */
  startOperation(
    operation: string,
    provider?: string,
    metadata?: Record<string, any>,
  ): PerformanceMetrics {
    if (!this.config.enabled || Math.random() > this.config.sampleRate) {
      // Return a dummy metric that won't be recorded
      return { operation, provider, startTime: Date.now(), metadata };
    }

    const metric: PerformanceMetrics = { operation, provider, startTime: Date.now(), metadata };

    return metric;
  }

  /**
   * End timing an operation
   */
  endOperation(
    metric: PerformanceMetrics,
    success: boolean = true,
    error?: string,
    recordCount?: number,
    fromCache?: boolean,
  ): void {
    if (!this.config.enabled) {
      return;
    }

    const endTime = Date.now();
    const duration = endTime - metric.startTime;

    metric.endTime = endTime;
    metric.duration = duration;
    metric.success = success;
    metric.error = error;
    metric.recordCount = recordCount;
    metric.fromCache = fromCache;

    // Add to metrics collection
    this.metrics.push(metric);

    // Trim metrics if we exceed max size
    if (this.metrics.length > this.config.maxMetrics) {
      this.metrics = this.metrics.slice(-this.config.maxMetrics);
    }

    // Log if enabled and duration exceeds threshold
    if (this.config.enableLogging && duration >= this.config.logThreshold) {
      this.logMetric(metric);
    }
  }

  /**
   * Record a complete operation in one call
   */
  recordOperation(
    operation: string,
    duration: number,
    success: boolean = true,
    provider?: string,
    error?: string,
    recordCount?: number,
    fromCache?: boolean,
    metadata?: Record<string, any>,
  ): void {
    if (!this.config.enabled || Math.random() > this.config.sampleRate) {
      return;
    }

    const now = Date.now();
    const metric: PerformanceMetrics = {
      operation,
      provider,
      startTime: now - duration,
      endTime: now,
      duration,
      success,
      error,
      recordCount,
      fromCache,
      metadata,
    };

    this.metrics.push(metric);

    if (this.metrics.length > this.config.maxMetrics) {
      this.metrics = this.metrics.slice(-this.config.maxMetrics);
    }

    if (this.config.enableLogging && duration >= this.config.logThreshold) {
      this.logMetric(metric);
    }
  }

  /**
   * Get performance statistics for all operations
   */
  getStats(): PerformanceStats[] {
    const statsMap = new Map<string, PerformanceStats>();

    for (const metric of this.metrics) {
      if (metric.duration === undefined || metric.endTime === undefined) continue;

      const key = metric.provider ? `${metric.operation}:${metric.provider}` : metric.operation;

      if (!statsMap.has(key)) {
        statsMap.set(key, {
          operation: metric.operation,
          provider: metric.provider,
          totalOperations: 0,
          successfulOperations: 0,
          failedOperations: 0,
          successRate: 0,
          averageDuration: 0,
          minDuration: Infinity,
          maxDuration: 0,
          p95Duration: 0,
          totalRecords: 0,
          averageRecords: 0,
          cacheHitRate: 0,
          firstSeen: metric.startTime,
          lastSeen: metric.endTime,
        });
      }

      const stats = statsMap.get(key)!;
      stats.totalOperations++;

      if (metric.success) {
        stats.successfulOperations++;
      } else {
        stats.failedOperations++;
      }

      stats.minDuration = Math.min(stats.minDuration, metric.duration);
      stats.maxDuration = Math.max(stats.maxDuration, metric.duration);
      stats.firstSeen = Math.min(stats.firstSeen, metric.startTime);
      stats.lastSeen = Math.max(stats.lastSeen, metric.endTime);

      if (metric.recordCount !== undefined) {
        stats.totalRecords += metric.recordCount;
      }
    }

    // Calculate derived statistics
    for (const stats of statsMap.values()) {
      stats.successRate =
        stats.totalOperations > 0 ? stats.successfulOperations / stats.totalOperations : 0;
      stats.averageRecords =
        stats.totalOperations > 0 ? stats.totalRecords / stats.totalOperations : 0;

      // Calculate average duration and percentiles
      const operationMetrics = this.metrics.filter(
        (m) =>
          m.operation === stats.operation &&
          m.provider === stats.provider &&
          m.duration !== undefined,
      );

      if (operationMetrics.length > 0) {
        const durations = operationMetrics.map((m) => m.duration!).sort((a, b) => a - b);
        stats.averageDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
        stats.p95Duration = durations[Math.floor(durations.length * 0.95)] || 0;

        // Calculate cache hit rate
        const cacheHits = operationMetrics.filter((m) => m.fromCache).length;
        stats.cacheHitRate = cacheHits / operationMetrics.length;
      }
    }

    return Array.from(statsMap.values());
  }

  /**
   * Get statistics for a specific operation
   */
  getOperationStats(operation: string, provider?: string): PerformanceStats | undefined {
    const allStats = this.getStats();
    return allStats.find((s) => s.operation === operation && s.provider === provider);
  }

  /**
   * Get recent metrics
   */
  getRecentMetrics(limit: number = 100): PerformanceMetrics[] {
    return this.metrics.slice(-limit);
  }

  /**
   * Get metrics for a specific time range
   */
  getMetricsInRange(startTime: number, endTime: number): PerformanceMetrics[] {
    return this.metrics.filter(
      (m) => m.startTime >= startTime && (m.endTime || m.startTime) <= endTime,
    );
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Cleanup old metrics
   */
  cleanup(): number {
    const cutoff = Date.now() - this.config.retentionPeriod;
    const initialLength = this.metrics.length;

    this.metrics = this.metrics.filter((m) => m.startTime >= cutoff);

    return initialLength - this.metrics.length;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...config };

    if (!this.config.enabled) {
      this.clear();
    }
  }

  /**
   * Destroy the monitor and cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.clear();
  }

  /**
   * Log a performance metric
   */
  private logMetric(metric: PerformanceMetrics): void {
    const logData = {
      operation: metric.operation,
      provider: metric.provider,
      duration: metric.duration,
      success: metric.success,
      recordCount: metric.recordCount,
      fromCache: metric.fromCache,
      error: metric.error,
    };

    // Performance metrics are available via getMetrics() for programmatic access
    // Logging removed - use getMetrics() or getReport() instead
    void logData;
  }

  /**
   * Start the cleanup timer
   */
  private startCleanupTimer(): void {
    // Run cleanup every 5 minutes
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, 300000);
    // Don't keep the process alive just for metrics cleanup
    this.cleanupTimer.unref();
  }
}

/**
 * Decorator for automatically timing method calls
 */
export function timed(operation?: string) {
  return function (target: any, propertyName: string, descriptor?: PropertyDescriptor) {
    if (!descriptor) {
      // Handle case where descriptor is not provided (newer TypeScript versions)
      descriptor = Object.getOwnPropertyDescriptor(target, propertyName) || {
        value: target[propertyName],
        writable: true,
        enumerable: false,
        configurable: true,
      };
    }

    const method = descriptor.value;
    const operationName = operation || `${target.constructor.name}.${propertyName}`;

    descriptor.value = async function (...args: any[]) {
      const monitor = globalPerformanceMonitor;
      const metric = monitor.startOperation(operationName, (this as any).name);

      try {
        const result = await method.apply(this, args);
        const recordCount = Array.isArray(result) ? result.length : undefined;
        monitor.endOperation(metric, true, undefined, recordCount);
        return result;
      } catch (error) {
        monitor.endOperation(metric, false, error instanceof Error ? error.message : String(error));
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Global performance monitor instance
 */
export const globalPerformanceMonitor = new PerformanceMonitor();
