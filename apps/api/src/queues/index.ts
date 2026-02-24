import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
});

export function createQueues() {
    const calendarQueue = new Queue('calendar', { connection });
    const emailQueue = new Queue('email', { connection });
    const reminderQueue = new Queue('reminder', { connection });
    const paymentChaseQueue = new Queue('payment-chase', { connection });
    const followUpQueue = new Queue('follow-up', { connection });
    const welcomeQueue = new Queue('welcome', { connection });

    return {
        calendar: calendarQueue,
        email: emailQueue,
        reminder: reminderQueue,
        paymentChase: paymentChaseQueue,
        followUp: followUpQueue,
        welcome: welcomeQueue,
    };
}

export type Queues = ReturnType<typeof createQueues>;
