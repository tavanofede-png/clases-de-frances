import 'dotenv/config';
import { PrismaClient } from '@teach-pro/db';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';

import { registerCalendarWorker } from './processors/calendar';
import { registerEmailWorker } from './processors/email';
import { registerReminderWorker } from './processors/reminder';
import { registerPaymentChaseWorker } from './processors/paymentChase';
import { registerFollowUpWorker } from './processors/followUp';
import { registerWelcomeWorker } from './processors/welcome';
import { startScheduler } from './scheduler';

export const prisma = new PrismaClient();
export const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
});

async function main() {
    console.log('🔧 Starting workers...');

    const workers = [
        registerCalendarWorker(redis, prisma),
        registerEmailWorker(redis, prisma),
        registerReminderWorker(redis, prisma),
        registerPaymentChaseWorker(redis, prisma),
        registerFollowUpWorker(redis, prisma),
        registerWelcomeWorker(redis, prisma),
    ];

    console.log(`  ✅ ${workers.length} workers registered`);

    // Start cron scheduler
    startScheduler(prisma, redis);
    console.log('  ✅ Scheduler started');

    console.log('🚀 Worker process running. Press Ctrl+C to stop.');

    // Graceful shutdown
    const shutdown = async () => {
        console.log('\n🛑 Shutting down workers...');
        await Promise.all(workers.map((w) => w.close()));
        await prisma.$disconnect();
        await redis.quit();
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

main().catch((err) => {
    console.error('Worker startup failed:', err);
    process.exit(1);
});
