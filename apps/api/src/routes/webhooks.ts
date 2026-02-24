import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma, queues } from '../index';
import { resolveTenant } from '../middleware/auth';

export const webhookRouter = Router({ mergeParams: true });

webhookRouter.use(resolveTenant);

// POST /t/:tenantSlug/payments/webhook/wompi
webhookRouter.post('/wompi', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenant = (req as any).tenant;
        const payload = req.body;
        const requestId = (req as any).requestId;

        // ─── Verify signature ────────────────────────────────
        const eventsSecret = tenant.settings?.wompiEventsSecret || process.env.WOMPI_EVENTS_SECRET;
        if (eventsSecret && payload.signature) {
            const properties = payload.signature.properties;
            const checksumStr = properties
                .map((prop: string) => {
                    const keys = prop.split('.');
                    let val: any = payload;
                    for (const k of keys) val = val?.[k];
                    return val;
                })
                .join('');
            const toHash = checksumStr + payload.timestamp + eventsSecret;
            const computedChecksum = crypto.createHash('sha256').update(toHash).digest('hex');
            if (computedChecksum !== payload.signature.checksum) {
                console.warn(`[${requestId}] Wompi webhook: firma inválida`);
                return res.status(401).json({ ok: false, error: 'Firma inválida' });
            }
        }

        // ─── Idempotency check ─────────────────────────────
        const idempotencyKey = `wompi-${payload.data?.transaction?.id || payload.id || requestId}`;
        const existing = await prisma.webhooksLog.findUnique({
            where: { idempotencyKey },
        });
        if (existing?.processed) {
            return res.json({ ok: true, message: 'Evento ya procesado' });
        }

        // ─── Log webhook ───────────────────────────────────
        await prisma.webhooksLog.upsert({
            where: { idempotencyKey },
            update: { payload, processed: false },
            create: {
                tenantId: tenant.id,
                provider: 'wompi',
                eventType: payload.event || 'transaction.updated',
                idempotencyKey,
                payload,
            },
        });

        // ─── Process transaction event ─────────────────────
        const transaction = payload.data?.transaction;
        if (!transaction) {
            return res.json({ ok: true, message: 'Sin datos de transacción' });
        }

        const reference = transaction.reference;
        const wompiStatus = transaction.status; // APPROVED, DECLINED, ERROR, VOIDED

        // Find payment by reference
        const payment = await prisma.payment.findFirst({
            where: { providerReference: reference, tenantId: tenant.id },
        });
        if (!payment) {
            console.warn(`[${requestId}] Wompi webhook: pago no encontrado para ref ${reference}`);
            return res.json({ ok: true, message: 'Pago no encontrado' });
        }

        // Map Wompi status
        let paymentDbStatus: string;
        let lessonStatus: string | null = null;

        switch (wompiStatus) {
            case 'APPROVED':
                paymentDbStatus = 'approved';
                lessonStatus = 'confirmed';
                break;
            case 'DECLINED':
                paymentDbStatus = 'rejected';
                break;
            case 'ERROR':
                paymentDbStatus = 'failed';
                break;
            case 'VOIDED':
                paymentDbStatus = 'refunded';
                break;
            default:
                paymentDbStatus = 'pending';
        }

        // Update payment
        await prisma.payment.update({
            where: { id: payment.id },
            data: {
                status: paymentDbStatus as any,
                providerPaymentId: String(transaction.id),
                rawPayload: transaction,
                paidAt: wompiStatus === 'APPROVED' ? new Date() : undefined,
            },
        });

        // Update lesson if payment maps to one
        if (payment.lessonId && lessonStatus) {
            await prisma.lesson.update({
                where: { id: payment.lessonId },
                data: {
                    status: lessonStatus as any,
                    paymentStatus: paymentDbStatus as any,
                },
            });

            // On approval, create calendar event + send confirmation
            if (wompiStatus === 'APPROVED') {
                await queues.calendar.add('create-event', {
                    tenantId: tenant.id,
                    lessonId: payment.lessonId,
                }, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } });

                await queues.email.add('send-confirmation', {
                    tenantId: tenant.id,
                    lessonId: payment.lessonId,
                }, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } });

                await queues.reminder.add('schedule-reminders', {
                    tenantId: tenant.id,
                    lessonId: payment.lessonId,
                }, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
            }
        }

        // Mark webhook as processed
        await prisma.webhooksLog.update({
            where: { idempotencyKey },
            data: { processed: true },
        });

        res.json({ ok: true, message: 'Webhook procesado' });
    } catch (error) {
        next(error);
    }
});

// POST /t/:tenantSlug/payments/webhook/stripe (placeholder)
webhookRouter.post('/stripe', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenant = (req as any).tenant;
        await prisma.webhooksLog.create({
            data: {
                tenantId: tenant.id,
                provider: 'stripe',
                eventType: req.body.type || 'unknown',
                payload: req.body,
            },
        });
        res.json({ ok: true, message: 'Stripe webhook recibido (feature no habilitada)' });
    } catch (error) {
        next(error);
    }
});
