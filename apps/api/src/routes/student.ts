import { Router, Request, Response, NextFunction } from 'express';
import { prisma, queues } from '../index';
import { resolveTenant, requireAuth, requireTenantAccess } from '../middleware/auth';
import { CreateBookingSchema, RescheduleSchema, CancelSchema, CreateCheckoutSchema, CreatePackPurchaseSchema } from '@teach-pro/shared';
import { v4 as uuidv4 } from 'uuid';

export const studentRouter = Router({ mergeParams: true });

studentRouter.use(resolveTenant);
studentRouter.use(requireAuth);
studentRouter.use(requireTenantAccess);

// POST /t/:tenantSlug/bookings — Create a booking
studentRouter.post('/bookings', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenant = (req as any).tenant;
        const user = (req as any).user;
        const body = CreateBookingSchema.parse(req.body);

        // Find student record
        const student = await prisma.student.findFirst({
            where: { userId: user.userId, tenantId: tenant.id },
        });
        if (!student) {
            return res.status(404).json({ ok: false, error: 'Estudiante no encontrado' });
        }

        // Get lesson type
        const lessonType = await prisma.lessonType.findFirst({
            where: { id: body.lessonTypeId, tenantId: tenant.id, isActive: true },
        });
        if (!lessonType) {
            return res.status(404).json({ ok: false, error: 'Tipo de clase no encontrado' });
        }

        const startsAt = new Date(body.startsAt);
        const endsAt = new Date(startsAt.getTime() + lessonType.durationMin * 60 * 1000);

        // Check for double booking
        const existing = await prisma.lesson.findFirst({
            where: {
                tenantId: tenant.id,
                startsAt,
                status: { in: ['reserved', 'confirmed'] },
            },
        });
        if (existing) {
            return res.status(409).json({ ok: false, error: 'Este horario ya está reservado' });
        }

        // Check for active pack with credits
        const activePack = await prisma.pack.findFirst({
            where: {
                tenantId: tenant.id,
                studentId: student.id,
                isActive: true,
                expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: 'asc' },
        });

        const hasCredits = activePack && (activePack.totalCredits - activePack.usedCredits) > 0;
        const settings = tenant.settings;
        const requirePayment = settings?.requirePaymentToConfirm ?? true;

        // Create lesson
        const lesson = await prisma.lesson.create({
            data: {
                tenantId: tenant.id,
                studentId: student.id,
                lessonTypeId: lessonType.id,
                startsAt,
                endsAt,
                status: hasCredits || !requirePayment ? 'confirmed' : 'reserved',
                paymentStatus: hasCredits ? 'covered_by_pack' : 'pending',
                packId: hasCredits ? activePack!.id : null,
            },
            include: { lessonType: true },
        });

        // If covered by pack, deduct credit
        if (hasCredits && activePack) {
            await prisma.pack.update({
                where: { id: activePack.id },
                data: { usedCredits: { increment: 1 } },
            });
            await prisma.packLedger.create({
                data: {
                    tenantId: tenant.id,
                    packId: activePack.id,
                    lessonId: lesson.id,
                    delta: -1,
                    reason: 'booking',
                },
            });

            // Enqueue calendar + confirmation
            await queues.calendar.add('create-event', {
                tenantId: tenant.id,
                lessonId: lesson.id,
            }, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } });

            await queues.email.add('send-confirmation', {
                tenantId: tenant.id,
                lessonId: lesson.id,
            }, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } });

            // Schedule reminders
            await queues.reminder.add('schedule-reminders', {
                tenantId: tenant.id,
                lessonId: lesson.id,
            }, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } });

            return res.status(201).json({
                ok: true,
                data: { lesson, coveredByPack: true },
                message: '¡Clase confirmada! Se descontó un crédito de tu pack.',
            });
        }

        // If no pack and payment required
        if (requirePayment) {
            // Generate payment reference
            const reference = `TP-${uuidv4().slice(0, 8).toUpperCase()}`;

            const payment = await prisma.payment.create({
                data: {
                    tenantId: tenant.id,
                    lessonId: lesson.id,
                    amount: lessonType.priceAmount,
                    currency: lessonType.currency,
                    provider: 'wompi',
                    providerReference: reference,
                },
            });

            return res.status(201).json({
                ok: true,
                data: {
                    lesson,
                    payment,
                    requiresPayment: true,
                },
                message: 'Reserva creada. Procede al pago para confirmar.',
            });
        }

        // No pack, no payment required: confirm immediately
        await queues.calendar.add('create-event', {
            tenantId: tenant.id,
            lessonId: lesson.id,
        }, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } });

        await queues.email.add('send-confirmation', {
            tenantId: tenant.id,
            lessonId: lesson.id,
        }, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } });

        res.status(201).json({
            ok: true,
            data: { lesson },
            message: '¡Clase confirmada!',
        });
    } catch (error) {
        next(error);
    }
});

// GET /t/:tenantSlug/me/lessons
studentRouter.get('/me/lessons', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenant = (req as any).tenant;
        const user = (req as any).user;

        const student = await prisma.student.findFirst({
            where: { userId: user.userId, tenantId: tenant.id },
        });
        if (!student) {
            return res.status(404).json({ ok: false, error: 'Estudiante no encontrado' });
        }

        const lessons = await prisma.lesson.findMany({
            where: { tenantId: tenant.id, studentId: student.id },
            include: { lessonType: true },
            orderBy: { startsAt: 'desc' },
        });

        res.json({ ok: true, data: lessons });
    } catch (error) {
        next(error);
    }
});

// GET /t/:tenantSlug/me/packs
studentRouter.get('/me/packs', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenant = (req as any).tenant;
        const user = (req as any).user;

        const student = await prisma.student.findFirst({
            where: { userId: user.userId, tenantId: tenant.id },
        });
        if (!student) {
            return res.status(404).json({ ok: false, error: 'Estudiante no encontrado' });
        }

        const packs = await prisma.pack.findMany({
            where: { tenantId: tenant.id, studentId: student.id },
            include: { lessonType: true },
            orderBy: { createdAt: 'desc' },
        });

        const enriched = packs.map((p) => ({
            ...p,
            remainingCredits: p.totalCredits - p.usedCredits,
            expired: p.expiresAt ? p.expiresAt < new Date() : false,
        }));

        res.json({ ok: true, data: enriched });
    } catch (error) {
        next(error);
    }
});

// POST /t/:tenantSlug/lessons/:id/reschedule
studentRouter.post('/lessons/:id/reschedule', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenant = (req as any).tenant;
        const user = (req as any).user;
        const { id } = req.params;
        const body = RescheduleSchema.parse(req.body);

        const student = await prisma.student.findFirst({
            where: { userId: user.userId, tenantId: tenant.id },
        });
        if (!student) {
            return res.status(404).json({ ok: false, error: 'Estudiante no encontrado' });
        }

        const lesson = await prisma.lesson.findFirst({
            where: { id, tenantId: tenant.id, studentId: student.id },
            include: { lessonType: true },
        });
        if (!lesson) {
            return res.status(404).json({ ok: false, error: 'Clase no encontrada' });
        }

        // Check reschedule policy
        const minHours = tenant.settings?.rescheduleMinHours ?? 24;
        const hoursUntilLesson = (lesson.startsAt.getTime() - Date.now()) / (1000 * 60 * 60);
        if (hoursUntilLesson < minHours) {
            return res.status(400).json({
                ok: false,
                error: `Solo puedes reprogramar con al menos ${minHours} horas de anticipación`,
            });
        }

        if (!['reserved', 'confirmed'].includes(lesson.status)) {
            return res.status(400).json({ ok: false, error: 'Esta clase no se puede reprogramar' });
        }

        const newStartsAt = new Date(body.newStartsAt);
        const newEndsAt = new Date(newStartsAt.getTime() + lesson.lessonType.durationMin * 60 * 1000);

        // Check double booking at new time
        const conflict = await prisma.lesson.findFirst({
            where: {
                tenantId: tenant.id,
                startsAt: newStartsAt,
                status: { in: ['reserved', 'confirmed'] },
                id: { not: lesson.id },
            },
        });
        if (conflict) {
            return res.status(409).json({ ok: false, error: 'El nuevo horario no está disponible' });
        }

        const updated = await prisma.lesson.update({
            where: { id: lesson.id },
            data: {
                startsAt: newStartsAt,
                endsAt: newEndsAt,
                reminder24hSent: false,
                reminder1hSent: false,
            },
        });

        // Update calendar event
        if (lesson.calendarEventId) {
            await queues.calendar.add('update-event', {
                tenantId: tenant.id,
                lessonId: lesson.id,
            }, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
        }

        res.json({ ok: true, data: updated, message: 'Clase reprogramada exitosamente' });
    } catch (error) {
        next(error);
    }
});

// POST /t/:tenantSlug/lessons/:id/cancel
studentRouter.post('/lessons/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenant = (req as any).tenant;
        const user = (req as any).user;
        const { id } = req.params;
        const body = CancelSchema.parse(req.body);

        const student = await prisma.student.findFirst({
            where: { userId: user.userId, tenantId: tenant.id },
        });
        if (!student) {
            return res.status(404).json({ ok: false, error: 'Estudiante no encontrado' });
        }

        const lesson = await prisma.lesson.findFirst({
            where: { id, tenantId: tenant.id, studentId: student.id },
            include: { pack: true },
        });
        if (!lesson) {
            return res.status(404).json({ ok: false, error: 'Clase no encontrada' });
        }

        // Check cancel policy
        const minHours = tenant.settings?.cancelMinHours ?? 24;
        const hoursUntilLesson = (lesson.startsAt.getTime() - Date.now()) / (1000 * 60 * 60);
        if (hoursUntilLesson < minHours) {
            return res.status(400).json({
                ok: false,
                error: `Solo puedes cancelar con al menos ${minHours} horas de anticipación`,
            });
        }

        if (!['reserved', 'confirmed'].includes(lesson.status)) {
            return res.status(400).json({ ok: false, error: 'Esta clase no se puede cancelar' });
        }

        // Cancel the lesson
        await prisma.lesson.update({
            where: { id: lesson.id },
            data: {
                status: 'cancelled',
                cancellationReason: body.reason || 'Cancelada por el alumno',
            },
        });

        // Refund pack credit if applicable
        if (lesson.packId && lesson.paymentStatus === 'covered_by_pack') {
            await prisma.pack.update({
                where: { id: lesson.packId },
                data: { usedCredits: { decrement: 1 } },
            });
            await prisma.packLedger.create({
                data: {
                    tenantId: tenant.id,
                    packId: lesson.packId,
                    lessonId: lesson.id,
                    delta: 1,
                    reason: 'cancel_refund',
                },
            });
        }

        // Delete calendar event
        if (lesson.calendarEventId) {
            await queues.calendar.add('delete-event', {
                tenantId: tenant.id,
                lessonId: lesson.id,
                calendarEventId: lesson.calendarEventId,
            }, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
        }

        res.json({ ok: true, message: 'Clase cancelada exitosamente' });
    } catch (error) {
        next(error);
    }
});

// POST /t/:tenantSlug/payments/checkout
studentRouter.post('/payments/checkout', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenant = (req as any).tenant;
        const body = CreateCheckoutSchema.parse(req.body);

        const lesson = await prisma.lesson.findFirst({
            where: { id: body.lessonId, tenantId: tenant.id },
            include: { lessonType: true },
        });
        if (!lesson) {
            return res.status(404).json({ ok: false, error: 'Clase no encontrada' });
        }

        // Find or create payment record
        let payment = await prisma.payment.findFirst({
            where: { lessonId: lesson.id, tenantId: tenant.id, status: 'pending' },
        });

        const reference = payment?.providerReference || `TP-${uuidv4().slice(0, 8).toUpperCase()}`;

        if (!payment) {
            payment = await prisma.payment.create({
                data: {
                    tenantId: tenant.id,
                    lessonId: lesson.id,
                    amount: lesson.lessonType.priceAmount,
                    currency: lesson.lessonType.currency,
                    provider: 'wompi',
                    providerReference: reference,
                },
            });
        }

        // Build Wompi checkout URL
        const wompiPublicKey = tenant.settings?.wompiPublicKey || process.env.WOMPI_PUBLIC_KEY;
        const amountInCents = lesson.lessonType.priceAmount * 100;

        const checkoutUrl = `https://checkout.wompi.co/p/?public-key=${wompiPublicKey}&currency=COP&amount-in-cents=${amountInCents}&reference=${reference}&redirect-url=${process.env.WEB_URL}/t/${tenant.slug}/payment/result`;

        await prisma.payment.update({
            where: { id: payment.id },
            data: { checkoutUrl },
        });

        res.json({
            ok: true,
            data: { checkoutUrl, reference, amount: lesson.lessonType.priceAmount },
        });
    } catch (error) {
        next(error);
    }
});

// POST /t/:tenantSlug/packs/purchase
studentRouter.post('/packs/purchase', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenant = (req as any).tenant;
        const user = (req as any).user;
        const body = CreatePackPurchaseSchema.parse(req.body);

        const student = await prisma.student.findFirst({
            where: { userId: user.userId, tenantId: tenant.id },
        });
        if (!student) {
            return res.status(404).json({ ok: false, error: 'Estudiante no encontrado' });
        }

        const lessonType = await prisma.lessonType.findFirst({
            where: { id: body.lessonTypeId, tenantId: tenant.id, isActive: true, isPackType: true },
        });
        if (!lessonType || !lessonType.packSize) {
            return res.status(404).json({ ok: false, error: 'Tipo de paquete no encontrado' });
        }

        // Create initial inactive Pack
        const pack = await prisma.pack.create({
            data: {
                tenantId: tenant.id,
                studentId: student.id,
                lessonTypeId: lessonType.id,
                totalCredits: lessonType.packSize,
                usedCredits: 0,
                isActive: false, // Activated by webhook after payment
            },
        });

        const reference = `PK-${uuidv4().slice(0, 8).toUpperCase()}`;
        const wompiPublicKey = tenant.settings?.wompiPublicKey || process.env.WOMPI_PUBLIC_KEY;
        const amountInCents = lessonType.priceAmount * 100;
        const checkoutUrl = `https://checkout.wompi.co/p/?public-key=${wompiPublicKey}&currency=COP&amount-in-cents=${amountInCents}&reference=${reference}&redirect-url=${process.env.WEB_URL}/t/${tenant.slug}/payment/result`;

        const payment = await prisma.payment.create({
            data: {
                tenantId: tenant.id,
                packId: pack.id,
                amount: lessonType.priceAmount,
                currency: lessonType.currency,
                provider: 'wompi',
                providerReference: reference,
                checkoutUrl,
            },
        });

        res.json({
            ok: true,
            data: { checkoutUrl, reference, amount: lessonType.priceAmount },
            message: 'Paquete listo. Procede al pago para confirmar.',
        });
    } catch (error) {
        next(error);
    }
});
