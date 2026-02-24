import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaClient } from '@teach-pro/db';
import { logJobRun } from '../utils/jobLogger';

export function registerReminderWorker(redis: IORedis, prisma: PrismaClient): Worker {
    const worker = new Worker('reminder', async (job: Job) => {
        const startedAt = new Date();
        const { tenantId, lessonId } = job.data;

        try {
            await logJobRun(prisma, {
                tenantId, jobName: job.name, jobId: job.id || '',
                status: 'running', payload: job.data, startedAt,
            });

            // Schedule-reminders just flags the lesson as needing reminders
            // The actual sending is done by the scheduler cron
            // This job is a no-op placeholder for BullMQ tracking

            await logJobRun(prisma, {
                tenantId, jobName: job.name, jobId: job.id || '',
                status: 'completed', payload: job.data, startedAt,
                result: { scheduled: true },
                completedAt: new Date(),
            });

        } catch (error: any) {
            await logJobRun(prisma, {
                tenantId, jobName: job.name, jobId: job.id || '',
                status: 'failed', payload: job.data, startedAt,
                error: error.message, completedAt: new Date(),
            });
            throw error;
        }
    }, {
        connection: redis,
        concurrency: 5,
    });

    worker.on('failed', (job, err) => {
        console.error(`[reminder] Job ${job?.id} failed:`, err.message);
    });

    console.log('  🔔 Reminder worker ready');
    return worker;
}
