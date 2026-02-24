import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaClient } from '@teach-pro/db';
import { logJobRun } from '../utils/jobLogger';

export function registerPaymentChaseWorker(redis: IORedis, prisma: PrismaClient): Worker {
    const worker = new Worker('payment-chase', async (job: Job) => {
        const startedAt = new Date();
        const { tenantId, lessonId, attempt } = job.data;

        try {
            await logJobRun(prisma, {
                tenantId, jobName: 'payment_chase', jobId: job.id || '',
                status: 'running', payload: job.data, startedAt,
            });

            const lesson = await prisma.lesson.findUnique({
                where: { id: lessonId },
                include: { student: { include: { user: true } }, lessonType: true },
            });

            if (!lesson || lesson.paymentStatus !== 'pending') {
                await logJobRun(prisma, {
                    tenantId, jobName: 'payment_chase', jobId: job.id || '',
                    status: 'completed', payload: job.data, startedAt,
                    result: { skipped: true, reason: 'not pending' },
                    completedAt: new Date(),
                });
                return;
            }

            // Max 3 attempts, then cancel
            if (attempt >= 3) {
                await prisma.lesson.update({
                    where: { id: lessonId },
                    data: { status: 'cancelled', cancellationReason: 'Pago no recibido después de 3 recordatorios' },
                });
                await prisma.payment.updateMany({
                    where: { lessonId, status: 'pending' },
                    data: { status: 'failed' },
                });

                await logJobRun(prisma, {
                    tenantId, jobName: 'payment_chase', jobId: job.id || '',
                    status: 'completed', payload: job.data, startedAt,
                    result: { cancelled: true, reason: 'max_attempts_reached' },
                    completedAt: new Date(),
                });
                return;
            }

            // Enqueue email reminder for pending payment
            const emailQueue = new (await import('bullmq')).Queue('email', { connection: redis });
            await emailQueue.add('send-payment-chase', {
                tenantId,
                lessonId,
            }, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } });

            await logJobRun(prisma, {
                tenantId, jobName: 'payment_chase', jobId: job.id || '',
                status: 'completed', payload: job.data, startedAt,
                result: { emailSent: true, attempt },
                completedAt: new Date(),
            });

        } catch (error: any) {
            await logJobRun(prisma, {
                tenantId, jobName: 'payment_chase', jobId: job.id || '',
                status: 'failed', payload: job.data, startedAt,
                error: error.message, completedAt: new Date(),
            });
            throw error;
        }
    }, {
        connection: redis,
        concurrency: 3,
    });

    worker.on('failed', (job, err) => {
        console.error(`[payment-chase] Job ${job?.id} failed:`, err.message);
    });

    console.log('  💳 Payment chase worker ready');
    return worker;
}
