import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { queues } from '../index';
import { resolveTenant } from '../middleware/auth';
import { CreateLeadSchema, GetSlotsSchema, Slot } from '@teach-pro/shared';
import { generateSlots } from '../services/availability';

export const publicRouter = Router({ mergeParams: true });

publicRouter.use(resolveTenant);

// POST /t/:tenantSlug/public/leads
publicRouter.post('/leads', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenant = (req as any).tenant;
        const body = CreateLeadSchema.parse(req.body);

        // Log the lead in message_log
        await prisma.messageLog.create({
            data: {
                tenantId: tenant.id,
                channel: 'webchat',
                direction: 'incoming',
                fromId: body.phone,
                body: JSON.stringify(body),
                intent: 'new_lead',
            },
        });

        // Enqueue welcome message
        await queues.welcome.add('send-welcome', {
            tenantId: tenant.id,
            lead: body,
        }, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
        });

        res.status(201).json({
            ok: true,
            message: '¡Gracias! Te contactaremos pronto.',
        });
    } catch (error) {
        next(error);
    }
});

// GET /t/:tenantSlug/public/lesson-types
publicRouter.get('/lesson-types', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenant = (req as any).tenant;
        const types = await prisma.lessonType.findMany({
            where: { tenantId: tenant.id, isActive: true },
            orderBy: { sortOrder: 'asc' },
            select: {
                id: true, name: true, description: true,
                durationMin: true, priceAmount: true, currency: true,
                isPackType: true, packSize: true,
            },
        });
        res.json({ ok: true, data: types });
    } catch (error) {
        next(error);
    }
});

// GET /t/:tenantSlug/public/slots
publicRouter.get('/slots', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenant = (req as any).tenant;
        const query = GetSlotsSchema.parse(req.query);
        const slots = await generateSlots(
            tenant.id,
            query.lessonTypeId,
            query.from,
            query.to,
            query.tz || tenant.timezone,
        );
        res.json({ ok: true, data: slots });
    } catch (error) {
        next(error);
    }
});

// GET /t/:tenantSlug/public/info
publicRouter.get('/info', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenant = (req as any).tenant;
        const settings = tenant.settings;
        const lessonTypes = await prisma.lessonType.findMany({
            where: { tenantId: tenant.id, isActive: true },
            orderBy: { sortOrder: 'asc' },
        });

        res.json({
            ok: true,
            data: {
                name: tenant.name,
                slug: tenant.slug,
                timezone: tenant.timezone,
                currency: tenant.currency,
                heroTitle: settings?.heroTitle,
                heroSubtitle: settings?.heroSubtitle,
                aboutText: settings?.aboutText,
                whatsappNumber: settings?.whatsappNumber,
                primaryColor: settings?.primaryColor,
                secondaryColor: settings?.secondaryColor,
                lessonTypes,
            },
        });
    } catch (error) {
        next(error);
    }
});
