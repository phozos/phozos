import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SimpleBackgroundJobSystem } from '../messageQueue';
import { userRepository } from '../../../repositories/user.repository';
import { notificationRepository } from '../../../repositories/notification.repository';
import { studentRepository } from '../../../repositories/student.repository';

describe('SimpleBackgroundJobSystem', () => {
  let jobSystem: SimpleBackgroundJobSystem;
  let testUserIds: string[] = [];
  let testNotificationIds: string[] = [];
  let testStudentIds: string[] = [];

  beforeEach(() => {
    vi.useFakeTimers();
    jobSystem = new SimpleBackgroundJobSystem();
  });

  afterEach(async () => {
    jobSystem.stop();
    jobSystem.clearAllJobs();
    vi.useRealTimers();

    // Clean up notifications
    for (const notifId of testNotificationIds) {
      try {
        await notificationRepository.delete(notifId);
      } catch (error) {
        console.log('Notification cleanup failed:', error);
      }
    }
    testNotificationIds = [];

    // Clean up students
    for (const studentId of testStudentIds) {
      try {
        await studentRepository.delete(studentId);
      } catch (error) {
        console.log('Student cleanup failed:', error);
      }
    }
    testStudentIds = [];

    // Clean up users
    for (const userId of testUserIds) {
      try {
        await userRepository.delete(userId);
      } catch (error) {
        console.log('User cleanup failed:', error);
      }
    }
    testUserIds = [];
  });

  describe('enqueue with real data', () => {
    it('should enqueue notification job with real user data', async () => {
      const user = await userRepository.create({
        email: `queue-user-${Date.now()}@example.com`,
        firstName: 'Queue',
        lastName: 'Test',
        userType: 'customer',
        password: 'test123'
      });
      testUserIds.push(user.id);

      const jobId = jobSystem.enqueue('send_notification', {
        userId: user.id,
        title: 'Test Notification',
        message: 'This is a test'
      });

      expect(jobId).toBeDefined();
      expect(jobId).toContain('job_');
      
      const stats = jobSystem.getStats();
      expect(stats.queueSize).toBe(1);
    });

    it('should enqueue multiple jobs with real user data', async () => {
      const user1 = await userRepository.create({
        email: `multi-1-${Date.now()}@example.com`,
        firstName: 'User',
        lastName: 'One',
        userType: 'customer',
        password: 'test123'
      });
      testUserIds.push(user1.id);

      const user2 = await userRepository.create({
        email: `multi-2-${Date.now()}@example.com`,
        firstName: 'User',
        lastName: 'Two',
        userType: 'customer',
        password: 'test123'
      });
      testUserIds.push(user2.id);

      jobSystem.enqueue('welcome_email', { userId: user1.id });
      jobSystem.enqueue('profile_update', { userId: user2.id });
      jobSystem.enqueue('notification_digest', { userId: user1.id });

      const stats = jobSystem.getStats();
      expect(stats.queueSize).toBe(3);
    });

    it('should generate unique job IDs for similar jobs', async () => {
      const user = await userRepository.create({
        email: `unique-${Date.now()}@example.com`,
        firstName: 'Unique',
        lastName: 'Test',
        userType: 'customer',
        password: 'test123'
      });
      testUserIds.push(user.id);

      const jobId1 = jobSystem.enqueue('notification', { userId: user.id });
      const jobId2 = jobSystem.enqueue('notification', { userId: user.id });

      expect(jobId1).not.toBe(jobId2);
    });
  });

  describe('processJobs with real notification creation', () => {
    it('should process notification job and create real notification', async () => {
      const user = await userRepository.create({
        email: `process-${Date.now()}@example.com`,
        firstName: 'Process',
        lastName: 'Test',
        userType: 'customer',
        password: 'test123'
      });
      testUserIds.push(user.id);

      let processedJob: any = null;
      
      jobSystem.on('process_message', async (job) => {
        processedJob = job;
        
        // Create real notification when job is processed
        if (job.type === 'create_notification') {
          const notification = await notificationRepository.create({
            userId: job.data.userId,
            title: job.data.title,
            message: job.data.message,
            type: 'system',
            isRead: false
          });
          testNotificationIds.push(notification.id);
        }
      });

      jobSystem.enqueue('create_notification', {
        userId: user.id,
        title: 'Welcome',
        message: 'Welcome to the platform!'
      });

      await vi.advanceTimersByTimeAsync(2000);

      expect(processedJob).toBeDefined();
      expect(processedJob.type).toBe('create_notification');
      expect(processedJob.data.userId).toBe(user.id);

      // Verify notification was created
      const notifications = await notificationRepository.findByUser(user.id);
      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].title).toBe('Welcome');
    });

    it('should process multiple jobs with real data sequentially', async () => {
      const user = await userRepository.create({
        email: `sequential-${Date.now()}@example.com`,
        firstName: 'Sequential',
        lastName: 'Test',
        userType: 'customer',
        password: 'test123'
      });
      testUserIds.push(user.id);

      const processedJobs: any[] = [];

      jobSystem.on('process_message', async (job) => {
        processedJobs.push(job);
        
        if (job.type === 'bulk_notification') {
          const notification = await notificationRepository.create({
            userId: job.data.userId,
            title: job.data.title,
            message: `Notification ${processedJobs.length}`,
            type: 'system',
            isRead: false
          });
          testNotificationIds.push(notification.id);
        }
      });

      jobSystem.enqueue('bulk_notification', { userId: user.id, title: 'First' });
      jobSystem.enqueue('bulk_notification', { userId: user.id, title: 'Second' });
      jobSystem.enqueue('bulk_notification', { userId: user.id, title: 'Third' });

      // Process first job
      await vi.advanceTimersByTimeAsync(2000);
      expect(processedJobs).toHaveLength(1);

      // Process second job
      await vi.advanceTimersByTimeAsync(2000);
      expect(processedJobs).toHaveLength(2);

      // Process third job
      await vi.advanceTimersByTimeAsync(2000);
      expect(processedJobs).toHaveLength(3);

      // Verify all notifications were created
      const notifications = await notificationRepository.findByUser(user.id);
      expect(notifications.length).toBe(3);
    });
  });

  describe('retry mechanism with real failures', () => {
    it('should retry failed notification creation', async () => {
      const user = await userRepository.create({
        email: `retry-${Date.now()}@example.com`,
        firstName: 'Retry',
        lastName: 'Test',
        userType: 'customer',
        password: 'test123'
      });
      testUserIds.push(user.id);

      let attemptCount = 0;
      const maxRetries = 2;

      jobSystem.on('process_message', async (job) => {
        attemptCount++;
        
        // Simulate failure on first 2 attempts
        if (attemptCount <= maxRetries) {
          throw new Error('Simulated notification creation failure');
        }
        
        // Success on third attempt
        const notification = await notificationRepository.create({
          userId: job.data.userId,
          title: 'Retry Success',
          message: 'Created after retries',
          type: 'system',
          isRead: false
        });
        testNotificationIds.push(notification.id);
      });

      jobSystem.enqueue('retry_notification', {
        userId: user.id,
        title: 'Test'
      });

      // First attempt (fails)
      await vi.advanceTimersByTimeAsync(2000);
      expect(attemptCount).toBe(1);

      // First retry (fails)
      await vi.advanceTimersByTimeAsync(2000);
      expect(attemptCount).toBe(2);

      // Second retry (succeeds)
      await vi.advanceTimersByTimeAsync(2000);
      expect(attemptCount).toBe(3);

      // Verify notification was created
      const notifications = await notificationRepository.findByUser(user.id);
      expect(notifications.length).toBeGreaterThan(0);
    });

    it('should emit job_failed event after max retries with real data', async () => {
      const user = await userRepository.create({
        email: `max-retry-${Date.now()}@example.com`,
        firstName: 'Max',
        lastName: 'Retry',
        userType: 'customer',
        password: 'test123'
      });
      testUserIds.push(user.id);

      let failedJob: any = null;

      jobSystem.on('process_message', async () => {
        throw new Error('Persistent failure');
      });

      jobSystem.on('job_failed', (data) => {
        failedJob = data;
      });

      jobSystem.enqueue('failing_job', {
        userId: user.id,
        action: 'critical_task'
      });

      // Process through all retries (initial + 2 retries = 3 total)
      for (let i = 0; i <= 3; i++) {
        await vi.advanceTimersByTimeAsync(2000);
      }

      expect(failedJob).toBeDefined();
      expect(failedJob.job.data.userId).toBe(user.id);
      expect(failedJob.error).toBeDefined();
    });
  });

  describe('real-world scenarios', () => {
    it('should handle user profile update jobs', async () => {
      const user = await userRepository.create({
        email: `profile-${Date.now()}@example.com`,
        firstName: 'Original',
        lastName: 'Name',
        userType: 'customer',
        password: 'test123'
      });
      testUserIds.push(user.id);

      let updatedUser: any = null;

      jobSystem.on('process_message', async (job) => {
        if (job.type === 'update_profile') {
          updatedUser = await userRepository.update(job.data.userId, {
            firstName: job.data.firstName,
            lastName: job.data.lastName
          });
        }
      });

      jobSystem.enqueue('update_profile', {
        userId: user.id,
        firstName: 'Updated',
        lastName: 'Name'
      });

      await vi.advanceTimersByTimeAsync(2000);

      expect(updatedUser).toBeDefined();
      expect(updatedUser.firstName).toBe('Updated');
      expect(updatedUser.lastName).toBe('Name');

      // Verify in database
      const dbUser = await userRepository.findById(user.id);
      expect(dbUser?.firstName).toBe('Updated');
    });

    it('should handle student assignment notifications', async () => {
      const counselor = await userRepository.create({
        email: `counselor-${Date.now()}@example.com`,
        firstName: 'Counselor',
        lastName: 'Test',
        userType: 'counselor',
        password: 'test123'
      });
      testUserIds.push(counselor.id);

      const student = await userRepository.create({
        email: `student-${Date.now()}@example.com`,
        firstName: 'Student',
        lastName: 'Test',
        userType: 'customer',
        password: 'test123'
      });
      testUserIds.push(student.id);

      const studentProfile = await studentRepository.create({
        userId: student.id,
        dateOfBirth: new Date('2000-01-01'),
        academicLevel: 'undergraduate'
      });
      testStudentIds.push(studentProfile.id);

      jobSystem.on('process_message', async (job) => {
        if (job.type === 'student_assignment_notification') {
          // Create notification for counselor
          const notification = await notificationRepository.create({
            userId: job.data.counselorId,
            title: 'New Student Assignment',
            message: `You have been assigned student: ${job.data.studentName}`,
            type: 'assignment',
            isRead: false
          });
          testNotificationIds.push(notification.id);
        }
      });

      jobSystem.enqueue('student_assignment_notification', {
        counselorId: counselor.id,
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`
      });

      await vi.advanceTimersByTimeAsync(2000);

      const notifications = await notificationRepository.findByUser(counselor.id);
      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].type).toBe('assignment');
      expect(notifications[0].message).toContain('Student Test');
    });

    it('should handle batch notification creation', async () => {
      const users = await Promise.all([
        userRepository.create({
          email: `batch-1-${Date.now()}@example.com`,
          firstName: 'Batch',
          lastName: 'User1',
          userType: 'customer',
          password: 'test123'
        }),
        userRepository.create({
          email: `batch-2-${Date.now()}@example.com`,
          firstName: 'Batch',
          lastName: 'User2',
          userType: 'customer',
          password: 'test123'
        }),
        userRepository.create({
          email: `batch-3-${Date.now()}@example.com`,
          firstName: 'Batch',
          lastName: 'User3',
          userType: 'customer',
          password: 'test123'
        })
      ]);

      users.forEach(u => testUserIds.push(u.id));

      jobSystem.on('process_message', async (job) => {
        if (job.type === 'batch_announcement') {
          for (const userId of job.data.userIds) {
            const notification = await notificationRepository.create({
              userId,
              title: job.data.title,
              message: job.data.message,
              type: 'announcement',
              isRead: false
            });
            testNotificationIds.push(notification.id);
          }
        }
      });

      jobSystem.enqueue('batch_announcement', {
        userIds: users.map(u => u.id),
        title: 'System Maintenance',
        message: 'Scheduled maintenance tonight'
      });

      await vi.advanceTimersByTimeAsync(2000);

      // Verify all users received notification
      for (const user of users) {
        const notifications = await notificationRepository.findByUser(user.id);
        expect(notifications.length).toBeGreaterThan(0);
        expect(notifications[0].title).toBe('System Maintenance');
      }
    });
  });

  describe('getStats', () => {
    it('should return accurate queue statistics with real jobs', async () => {
      const stats1 = jobSystem.getStats();
      expect(stats1.queueSize).toBe(0);
      expect(stats1.processing).toBe(false);

      const user = await userRepository.create({
        email: `stats-${Date.now()}@example.com`,
        firstName: 'Stats',
        lastName: 'Test',
        userType: 'customer',
        password: 'test123'
      });
      testUserIds.push(user.id);

      jobSystem.enqueue('job1', { userId: user.id });
      jobSystem.enqueue('job2', { userId: user.id });

      const stats2 = jobSystem.getStats();
      expect(stats2.queueSize).toBe(2);
    });
  });

  describe('clearAllJobs', () => {
    it('should clear all pending jobs including real data jobs', async () => {
      const user = await userRepository.create({
        email: `clear-${Date.now()}@example.com`,
        firstName: 'Clear',
        lastName: 'Test',
        userType: 'customer',
        password: 'test123'
      });
      testUserIds.push(user.id);

      jobSystem.enqueue('job1', { userId: user.id });
      jobSystem.enqueue('job2', { userId: user.id });
      jobSystem.enqueue('job3', { userId: user.id });

      expect(jobSystem.getStats().queueSize).toBe(3);

      jobSystem.clearAllJobs();

      expect(jobSystem.getStats().queueSize).toBe(0);
    });
  });

  describe('stop', () => {
    it('should prevent processing of queued real jobs after stop', async () => {
      const user = await userRepository.create({
        email: `stop-${Date.now()}@example.com`,
        firstName: 'Stop',
        lastName: 'Test',
        userType: 'customer',
        password: 'test123'
      });
      testUserIds.push(user.id);

      const processHandler = vi.fn();
      jobSystem.on('process_message', processHandler);

      jobSystem.enqueue('test_job', { userId: user.id });
      jobSystem.stop();

      await vi.advanceTimersByTimeAsync(2000);

      expect(processHandler).not.toHaveBeenCalled();
    });
  });

  describe('error handling with real data', () => {
    it('should handle database errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      jobSystem.on('process_message', async (job) => {
        // Try to create notification for non-existent user
        await notificationRepository.create({
          userId: '00000000-0000-0000-0000-000000000000',
          title: 'Test',
          message: 'Test',
          type: 'system',
          isRead: false
        });
      });

      jobSystem.enqueue('error_job', { data: 'test' });

      await vi.advanceTimersByTimeAsync(2000);

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should continue processing after individual job failures', async () => {
      const user = await userRepository.create({
        email: `continue-${Date.now()}@example.com`,
        firstName: 'Continue',
        lastName: 'Test',
        userType: 'customer',
        password: 'test123'
      });
      testUserIds.push(user.id);

      const processHandler = vi.fn()
        .mockImplementationOnce(() => {
          throw new Error('First job failed');
        })
        .mockImplementationOnce(async (job) => {
          // Second job succeeds
          const notification = await notificationRepository.create({
            userId: job.data.userId,
            title: 'Success',
            message: 'Second job succeeded',
            type: 'system',
            isRead: false
          });
          testNotificationIds.push(notification.id);
        });

      jobSystem.on('process_message', processHandler);

      jobSystem.enqueue('job1', { userId: user.id });
      jobSystem.enqueue('job2', { userId: user.id });

      // First job fails
      await vi.advanceTimersByTimeAsync(2000);

      // First retry of failed job
      await vi.advanceTimersByTimeAsync(2000);

      expect(processHandler).toHaveBeenCalledTimes(2);

      // Eventually second job should process
      await vi.advanceTimersByTimeAsync(4000);

      const notifications = await notificationRepository.findByUser(user.id);
      expect(notifications.length).toBeGreaterThan(0);
    });
  });
});
