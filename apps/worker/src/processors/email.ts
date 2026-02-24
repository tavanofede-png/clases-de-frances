import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaClient } from '@teach-pro/db';
import { logJobRun } from '../utils/jobLogger';

// Resend email client (or stub if not configured)
async function sendEmail(to: string, subject: string, html: string) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || apiKey.startsWith('re_xxx')) {
        console.log(`[email-stub] To: ${to} | Subject: ${subject}`);
        console.log(`[email-stub] Body: ${html.substring(0, 200)}...`);
        return { id: `stub-${Date.now()}` };
    }

    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
        from: process.env.EMAIL_FROM || 'noreply@teachpro.app',
        to,
        subject,
        html,
    });
    return result;
}

function fillTemplate(template: string, vars: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(vars)) {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
}

export function registerEmailWorker(redis: IORedis, prisma: PrismaClient): Worker {
    const worker = new Worker('email', async (job: Job) => {
        const startedAt = new Date();
        const { tenantId, lessonId, type } = job.data;

        try {
            await logJobRun(prisma, {
                tenantId, jobName: job.name, jobId: job.id || '',
                status: 'running', payload: job.data, startedAt,
            });

            const lesson = await prisma.lesson.findUnique({
                where: { id: lessonId },
                include: {
                    student: { include: { user: true } },
                    lessonType: true,
                },
            });
            if (!lesson) throw new Error(`Lesson ${lessonId} not found`);

            const settings = await prisma.tenantSettings.findUnique({ where: { tenantId } });
            const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

            const studentEmail = lesson.student.user.email;
            if (!studentEmail) {
                console.warn(`[email] No email for student ${lesson.student.id}. Skipping.`);
                return;
            }

            const vars: Record<string, string> = {
                studentName: lesson.student.user.name,
                date: lesson.startsAt.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
                time: lesson.startsAt.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
                meetUrl: lesson.meetingJoinUrl || 'Pendiente de asignación',
                lessonType: lesson.lessonType.name,
                amount: new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(lesson.lessonType.priceAmount),
                tenantName: tenant?.name || '',
                bookingUrl: `${process.env.WEB_URL}/t/${tenant?.slug}/portal`,
            };

            let subject = '';
            let template = '';

            switch (job.name) {
                case 'send-confirmation':
                    subject = `✅ Clase confirmada — ${vars.date}`;
                    template = settings?.confirmationTemplate || '¡Hola {{studentName}}! Tu clase de {{lessonType}} está confirmada para el {{date}} a las {{time}}. Link: {{meetUrl}}';
                    break;
                case 'send-reminder-24h':
                    subject = `📅 Recordatorio: clase mañana a las ${vars.time}`;
                    template = settings?.reminder24hTemplate || '¡Hola {{studentName}}! Te recordamos tu clase de mañana a las {{time}}. Link: {{meetUrl}}';
                    break;
                case 'send-reminder-1h':
                    subject = `⏰ Tu clase empieza en 1 hora`;
                    template = settings?.reminder1hTemplate || '¡{{studentName}}, tu clase empieza en 1 hora! Link: {{meetUrl}}';
                    break;
                case 'send-payment-chase':
                    subject = `💳 Pago pendiente — ${vars.lessonType}`;
                    template = settings?.pendingPaymentTemplate || 'Hola {{studentName}}, tienes un pago pendiente de {{amount}} por tu clase del {{date}}.';
                    break;
                case 'send-follow-up':
                    subject = `🎯 ¿Cómo te fue en tu clase?`;
                    template = settings?.followUpTemplate || '¡Hola {{studentName}}! ¿Cómo te fue en la clase de hoy? Reserva tu próxima clase: {{bookingUrl}}';
                    break;
            }

            const html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 20px;">${tenant?.name || 'Teach Pro'}</h1>
          </div>
          <div style="background: #fafafa; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
            <p style="font-size: 16px; line-height: 1.6; color: #374151;">
              ${fillTemplate(template, vars)}
            </p>
            ${lesson.meetingJoinUrl ? `<a href="${lesson.meetingJoinUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">Conectarme a la clase</a>` : ''}
          </div>
          <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 16px;">
            ${tenant?.name} · Clases de francés online
          </p>
        </div>
      `;

            await sendEmail(studentEmail, subject, html);

            await logJobRun(prisma, {
                tenantId, jobName: job.name, jobId: job.id || '',
                status: 'completed', payload: job.data, startedAt,
                result: { to: studentEmail, subject },
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
        limiter: { max: 10, duration: 1000 },
    });

    worker.on('failed', (job, err) => {
        console.error(`[email] Job ${job?.id} failed:`, err.message);
    });

    console.log('  📧 Email worker ready');
    return worker;
}
