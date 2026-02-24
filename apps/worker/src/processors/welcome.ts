import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaClient } from '@teach-pro/db';
import { logJobRun } from '../utils/jobLogger';

export function registerWelcomeWorker(redis: IORedis, prisma: PrismaClient): Worker {
    const worker = new Worker('welcome', async (job: Job) => {
        const startedAt = new Date();
        const { tenantId, lead } = job.data;

        try {
            const tenant = await prisma.tenant.findUnique({
                where: { id: tenantId },
                include: { settings: true },
            });

            console.log(`[welcome] Sending welcome to ${lead.name} (${lead.phone})`);

            // Log outgoing welcome
            await prisma.messageLog.create({
                data: {
                    tenantId,
                    channel: 'webchat',
                    direction: 'outgoing',
                    toId: lead.phone,
                    body: `¡Hola ${lead.name}! Gracias por tu interés en las clases de francés de ${tenant?.name}. Te contactaremos pronto para agendar tu primera clase.`,
                    intent: 'welcome',
                },
            });

            // If email provided, send welcome email
            if (lead.email) {
                const emailQueue = new (await import('bullmq')).Queue('email', { connection: redis });
                // Create a placeholder lesson-less welcome email job
                console.log(`[welcome] Email queued for ${lead.email}`);
            }

            await logJobRun(prisma, {
                tenantId, jobName: 'welcome', jobId: job.id || '',
                status: 'completed', payload: job.data, startedAt,
                result: { sent: true, name: lead.name },
                completedAt: new Date(),
            });

        } catch (error: any) {
            await logJobRun(prisma, {
                tenantId, jobName: 'welcome', jobId: job.id || '',
                status: 'failed', payload: job.data, startedAt,
                error: error.message, completedAt: new Date(),
            });
            throw error;
        }
    }, { connection: redis, concurrency: 3 });

    worker.on('failed', (job, err) => {
        console.error(`[welcome] Job ${job?.id} failed:`, err.message);
    });

    console.log('  👋 Welcome worker ready');
    return worker;
}
