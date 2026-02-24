import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaClient } from '@teach-pro/db';
import { logJobRun } from '../utils/jobLogger';

export function registerFollowUpWorker(redis: IORedis, prisma: PrismaClient): Worker {
    const worker = new Worker('follow-up', async (job: Job) => {
        const startedAt = new Date();
        const { tenantId, lessonId } = job.data;

        try {
            const lesson = await prisma.lesson.findUnique({
                where: { id: lessonId },
            });
            if (!lesson || lesson.followUpSent) return;

            const emailQueue = new (await import('bullmq')).Queue('email', { connection: redis });
            await emailQueue.add('send-follow-up', {
                tenantId,
                lessonId,
            }, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } });

            await prisma.lesson.update({
                where: { id: lessonId },
                data: { followUpSent: true },
            });

            await logJobRun(prisma, {
                tenantId, jobName: 'follow_up', jobId: job.id || '',
                status: 'completed', payload: job.data, startedAt,
                result: { sent: true },
                completedAt: new Date(),
            });
        } catch (error: any) {
            await logJobRun(prisma, {
                tenantId, jobName: 'follow_up', jobId: job.id || '',
                status: 'failed', payload: job.data, startedAt,
                error: error.message, completedAt: new Date(),
            });
            throw error;
        }
    }, { connection: redis, concurrency: 3 });

    worker.on('failed', (job, err) => {
        console.error(`[follow-up] Job ${job?.id} failed:`, err.message);
    });

    console.log('  🎯 Follow-up worker ready');
    return worker;
}
