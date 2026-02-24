import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { requireAuth, requireRole } from '../middleware/auth';

export const superAdminRouter = Router();

superAdminRouter.use(requireAuth);
superAdminRouter.use(requireRole('super_admin'));

// GET /super-admin/tenants
superAdminRouter.get('/tenants', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const tenants = await prisma.tenant.findMany({
            include: {
                _count: { select: { users: true, lessons: true, payments: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ ok: true, data: tenants });
    } catch (error) {
        next(error);
    }
});

// POST /super-admin/tenants
superAdminRouter.post('/tenants', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { slug, name, timezone, currency, locale, plan } = req.body;
        const tenant = await prisma.tenant.create({
            data: {
                slug, name,
                timezone: timezone || 'America/Bogota',
                currency: currency || 'COP',
                locale: locale || 'es-CO',
                plan: plan || 'trial',
            },
        });
        // Create default settings
        await prisma.tenantSettings.create({
            data: { tenantId: tenant.id },
        });
        res.status(201).json({ ok: true, data: tenant });
    } catch (error) {
        next(error);
    }
});

// PATCH /super-admin/tenants/:id
superAdminRouter.patch('/tenants/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { name, isActive, plan } = req.body;
        const tenant = await prisma.tenant.update({
            where: { id },
            data: { name, isActive, plan },
        });
        res.json({ ok: true, data: tenant });
    } catch (error) {
        next(error);
    }
});

// GET /super-admin/metrics
superAdminRouter.get('/metrics', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const [totalTenants, totalUsers, totalLessons, totalPayments] = await Promise.all([
            prisma.tenant.count(),
            prisma.user.count(),
            prisma.lesson.count(),
            prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'approved' } }),
        ]);

        res.json({
            ok: true,
            data: {
                totalTenants,
                totalUsers,
                totalLessons,
                totalRevenue: totalPayments._sum.amount || 0,
            },
        });
    } catch (error) {
        next(error);
    }
});

// GET /super-admin/logs/webhooks
superAdminRouter.get('/logs/webhooks', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { limit = '50' } = req.query;
        const logs = await prisma.webhooksLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit as string),
        });
        res.json({ ok: true, data: logs });
    } catch (error) {
        next(error);
    }
});

// GET /super-admin/logs/jobs
superAdminRouter.get('/logs/jobs', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { limit = '50', status } = req.query;
        const where: any = {};
        if (status) where.status = status;

        const logs = await prisma.jobRun.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit as string),
        });
        res.json({ ok: true, data: logs });
    } catch (error) {
        next(error);
    }
});
