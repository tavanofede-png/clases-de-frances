import cron from 'node-cron';
import { PrismaClient } from '@teach-pro/db';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

export function startScheduler(prisma: PrismaClient, redis: IORedis) {
    const emailQueue = new Queue('email', { connection: redis });
    const paymentChaseQueue = new Queue('payment-chase', { connection: redis });
    const followUpQueue = new Queue('follow-up', { connection: redis });

    // ─── Reminder 24h: runs every 15 minutes ──────────────
    cron.schedule('*/15 * * * *', async () => {
        try {
            const now = new Date();
            const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            const windowStart = new Date(in24h.getTime() - 15 * 60 * 1000);

            const lessons = await prisma.lesson.findMany({
                where: {
                    status: 'confirmed',
                    reminder24hSent: false,
                    startsAt: { gte: windowStart, lte: in24h },
                },
            });

            for (const lesson of lessons) {
                await emailQueue.add('send-reminder-24h', {
                    tenantId: lesson.tenantId,
                    lessonId: lesson.id,
                }, {
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 5000 },
                    jobId: `reminder-24h-${lesson.id}`, // idempotency
                });

                await prisma.lesson.update({
                    where: { id: lesson.id },
                    data: { reminder24hSent: true },
                });
            }

            if (lessons.length > 0) {
                console.log(`[scheduler] 24h reminders: ${lessons.length} lessons`);
            }
        } catch (error) {
            console.error('[scheduler] 24h reminder error:', error);
        }
    });

    // ─── Reminder 1h: runs every 15 minutes ───────────────
    cron.schedule('*/15 * * * *', async () => {
        try {
            const now = new Date();
            const in1h = new Date(now.getTime() + 60 * 60 * 1000);
            const windowStart = new Date(in1h.getTime() - 15 * 60 * 1000);

            const lessons = await prisma.lesson.findMany({
                where: {
                    status: 'confirmed',
                    reminder1hSent: false,
                    startsAt: { gte: windowStart, lte: in1h },
                },
            });

            for (const lesson of lessons) {
                await emailQueue.add('send-reminder-1h', {
                    tenantId: lesson.tenantId,
                    lessonId: lesson.id,
                }, {
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 5000 },
                    jobId: `reminder-1h-${lesson.id}`,
                });

                await prisma.lesson.update({
                    where: { id: lesson.id },
                    data: { reminder1hSent: true },
                });
            }

            if (lessons.length > 0) {
                console.log(`[scheduler] 1h reminders: ${lessons.length} lessons`);
            }
        } catch (error) {
            console.error('[scheduler] 1h reminder error:', error);
        }
    });

    // ─── Payment chase: runs daily at 9 AM Colombia ──────
    cron.schedule('0 14 * * *', async () => { // 14:00 UTC = 9:00 COL
        try {
            // Find lessons with pending payments older than 1 day
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

            const pendingLessons = await prisma.lesson.findMany({
                where: {
                    status: 'reserved',
                    paymentStatus: 'pending',
                    createdAt: { lte: oneDayAgo },
                    startsAt: { gt: new Date() }, // Only future lessons
                },
            });

            for (const lesson of pendingLessons) {
                // Count previous chase attempts
                const prevAttempts = await prisma.jobRun.count({
                    where: {
                        tenantId: lesson.tenantId,
                        jobName: 'payment_chase',
                        payload: { path: ['lessonId'], equals: lesson.id },
                        status: 'completed',
                    },
                });

                await paymentChaseQueue.add('chase-payment', {
                    tenantId: lesson.tenantId,
                    lessonId: lesson.id,
                    attempt: prevAttempts + 1,
                }, {
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 5000 },
                    jobId: `chase-${lesson.id}-${prevAttempts + 1}`,
                });
            }

            if (pendingLessons.length > 0) {
                console.log(`[scheduler] Payment chase: ${pendingLessons.length} pending`);
            }
        } catch (error) {
            console.error('[scheduler] Payment chase error:', error);
        }
    });

    // ─── Post-class follow-up: runs daily at 8 PM Colombia ─
    cron.schedule('0 1 * * *', async () => { // 01:00 UTC = 20:00 COL
        try {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            const yesterdayStart = new Date(todayStart);
            yesterdayStart.setDate(yesterdayStart.getDate() - 1);

            const completedLessons = await prisma.lesson.findMany({
                where: {
                    status: { in: ['confirmed', 'completed'] },
                    followUpSent: false,
                    endsAt: { gte: yesterdayStart, lt: todayStart },
                },
            });

            for (const lesson of completedLessons) {
                // Mark as completed if still confirmed
                if (lesson.status === 'confirmed') {
                    await prisma.lesson.update({
                        where: { id: lesson.id },
                        data: { status: 'completed' },
                    });
                }

                await followUpQueue.add('send-follow-up', {
                    tenantId: lesson.tenantId,
                    lessonId: lesson.id,
                }, {
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 5000 },
                    jobId: `followup-${lesson.id}`,
                });
            }

            if (completedLessons.length > 0) {
                console.log(`[scheduler] Follow-ups: ${completedLessons.length} lessons`);
            }
        } catch (error) {
            console.error('[scheduler] Follow-up error:', error);
        }
    });

    console.log('  ⏰ Scheduler: 24h, 1h, payment-chase, follow-up — all active');
}
