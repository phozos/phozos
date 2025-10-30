import { EventEmitter } from 'events';

/**
 * Simple Background Job System - Phase 6 Simplification
 * 
 * Removed overengineered features:
 * - 3-tier queue system (CRITICAL/NEAR_REALTIME/BACKGROUND)
 * - Complex retry logic with exponential backoff
 * - Batch processing with different batch sizes
 * - Priority-based message insertion
 * - Multiple processing intervals (50ms, 1500ms, 5000ms)
 * 
 * Focused on: Simple job scheduling and basic retry mechanism
 */

interface SimpleJob {
  id: string;
  type: string;
  data: any;
  timestamp: Date;
  retryCount: number;
}

export class SimpleBackgroundJobSystem extends EventEmitter {
  private jobs: SimpleJob[] = [];
  private processing = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private readonly MAX_RETRIES = 2;

  constructor() {
    super();
    this.startProcessing();
  }

  /**
   * Add a job to the queue
   */
  enqueue(jobType: string, data: any): string {
    const jobId = this.generateJobId();
    
    const job: SimpleJob = {
      id: jobId,
      type: jobType,
      data,
      timestamp: new Date(),
      retryCount: 0
    };

    this.jobs.push(job);
    console.log(`📋 Enqueued job ${jobId} (${jobType}) - Queue size: ${this.jobs.length}`);
    
    return jobId;
  }

  /**
   * Start simple job processing
   */
  private startProcessing(): void {
    // Process jobs every 2 seconds
    this.processingInterval = setInterval(() => {
      this.processJobs();
    }, 2000);
  }

  /**
   * Process jobs in the queue
   */
  private async processJobs(): Promise<void> {
    if (this.processing || this.jobs.length === 0) return;
    
    this.processing = true;

    try {
      // Process one job at a time for simplicity
      const job = this.jobs.shift();
      if (job) {
        console.log(`🔄 Processing job ${job.id} (${job.type})`);
        await this.processJob(job);
      }
    } catch (error) {
      console.error(`❌ Error processing jobs:`, error);
    } finally {
      this.processing = false;
    }
  }

  /**
   * Process individual job
   */
  private async processJob(job: SimpleJob): Promise<void> {
    try {
      // Emit the job for external handlers to process
      this.emit('process_message', job);
      console.log(`✅ Completed job ${job.id} (${job.type})`);
    } catch (error) {
      console.error(`❌ Failed to process job ${job.id}:`, error);
      this.handleFailedJob(job, error);
    }
  }

  /**
   * Handle failed job with simple retry
   */
  private handleFailedJob(job: SimpleJob, error: any): void {
    job.retryCount++;
    
    if (job.retryCount <= this.MAX_RETRIES) {
      // Simple retry - add back to queue
      this.jobs.push(job);
      console.log(`🔄 Retrying job ${job.id} (attempt ${job.retryCount}/${this.MAX_RETRIES})`);
    } else {
      console.error(`💀 Job ${job.id} exceeded max retries, discarding`);
      this.emit('job_failed', { job, error });
    }
  }

  /**
   * Get simple queue statistics
   */
  getStats(): { queueSize: number, processing: boolean } {
    return {
      queueSize: this.jobs.length,
      processing: this.processing
    };
  }

  /**
   * Clear all jobs
   */
  clearAllJobs(): void {
    this.jobs.length = 0;
    console.log('🧹 All jobs cleared');
  }

  /**
   * Stop job processing
   */
  stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    console.log('⏹️ Background job system stopped');
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance with legacy compatibility
export const messageQueue = new SimpleBackgroundJobSystem();