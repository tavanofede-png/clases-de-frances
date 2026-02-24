import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { resolveTenant, requireAuth, requireRole, requireTenantAccess } from '../middleware/auth';
import { CreateAvailabilityRuleSchema, CreateBlockedTimeSchema, UpdateConfigSchema } from '@teach-pro/shared';

export const adminRouter = Router({ mergeParams: true });

adminRouter.use(resolveTenant);
adminRouter.use(requireAuth);
adminRouter.use(requireRole('tenant_admin', 'super_admin'));
adminRouter.use(requireTenantAccess);

// GET /t/:tenantSlug/admin/lessons
adminRouter.get('/lessons', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenant = (req as any).tenant;
        const { status, paymentStatus, from, to, studentId } = req.query;

        const where: any = { tenantId: tenant.id };
        if (status) where.status = status;
        if (paymentStatus) where.paymentStatus = paymentStatus;
        if (studentId) where.studentId = studentId;
        if (from || to) {
            where.startsAt = {};
            if (from) where.startsAt.gte = new Date(from as string);
            if (to) where.startsAt.lte = new Date(to as string);
        }

        const lessons = await prisma.lesson.findMany({
            where,
            include: {
                student: { include: { user: { select: { name: true, email: true, phone: true } } } },
                lessonType: true,
            },
            orderBy: { startsAt: 'desc' },
        });

        res.json({ ok: true, data: lessons });
    } catch (error) {
        next(error);
    }
});

// PATCH /t/:tenantSlug/admin/lessons/:id
adminRouter.patch('/lessons/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenant = (req as any).tenant;
        const { id } = req.params;
        const { status, paymentStatus, teacherNotes } = req.body;

        const lesson = await prisma.lesson.findFirst({ where: { id, tenantId: tenant.id } });
        if (!lesson) return res.status(404).json({ ok: false, error: 'Clase no encontrada' });

        const data: any = {};
        if (status) data.status = status;
        if (paymentStatus) data.paymentStatus = paymentStatus;
        if (teacherNotes !== undefined) data.teacherNotes = teacherNotes;

        // Handle no-show
        if (status === 'no_show' && lesson.packId) {
            const settings = tenant.settings;
            if (settings?.noShowConsumeCredit) {
                // Credit already consumed at booking, no refund
            }
        }

        const updated = await prisma.lesson.update({ where: { id }, data });
        res.json({ ok: true, data: updated });
    } catch (error) {
        next(error);
    }
});

// GET /t/:tenantSlug/admin/students
adminRouter.get('/students', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenant = (req as any).tenant;
        const students = await prisma.student.findMany({
            where: { tenantId: tenant.id },
            include: {
                user: { select: { name: true, email: true, phone: true, timezone: true } },
                packs: {
                    where: { isActive: true },
                    include: { lessonType: true },
                },
                _count: { select: { lessons: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ ok: true, data: students });
    } catch (error) {
        next(error);
    }
});

// GET /t/:tenantSlug/admin/students/:id
adminRouter.get('/students/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenant = (req as any).tenant;
        const { id } = req.params;

        const student = await prisma.student.findFirst({
            where: { id, tenantId: tenant.id },
            include: {
                user: { select: { name: true, email: true, phone: true, timezone: true } },
                lessons: {
                    include: { lessonType: true },
                    orderBy: { startsAt: 'desc' },
                    take: 20,
                },
                packs: { include: { lessonType: true } },
            },
        });
        if (!student) return res.status(404).json({ ok: false, error: 'Estudiante no encontrado' });

        res.json({ ok: true, data: student });
    } catch (error) {
        next(error);
    }
});

// PATCH /t/:tenantSlug/admin/students/:id
adminRouter.patch('/students/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenant = (req as any).tenant;
        const { id } = req.params;
        const { level, objectives, internalNotes } = req.body;

        const student = await prisma.student.findFirst({ where: { id, tenantId: tenant.id } });
        if (!student) return res.status(404).json({ ok: false, error: 'Estudiante no encontrado' });

        const updated = await prisma.student.update({
            where: { id },
            data: { level, objectives, internalNotes },
        });
        res.json({ ok: true, data: updated });
    } catch (error) {
        next(error);
    }
});

// GET /t/:tenantSlug/admin/payments
adminRouter.get('/payments', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenant = (req as any).tenant;
        const { status, from, to } = req.query;

        const where: any = { tenantId: tenant.id };
        if (status) where.status = status;
        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt.gte = new Date(from as string);
            if (to) where.createdAt.lte = new Date(to as string);
        }

        const payments = await prisma.payment.findMany({
            where,
            include: {
                lesson: {
                    include: {
                        student: { include: { user: { select: { name: true, email: true } } } },
                        lessonType: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json({ ok: true, data: payments });
    } catch (error) {
        next(error);
    }
});

// PATCH /t/:tenantSlug/admin/config
adminRouter.patch('/config', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenant = (req as any).tenant;
        const body = UpdateConfigSchema.parse(req.body);

        const updated = await prisma.tenantSettings.update({
            where: { tenantId: tenant.id },
            data: body,
        });

        res.json({ ok: true, data: updated, message: 'Configuración actualizada' });
    } catch (error) {
        next(error);
    }
});

// POST /t/:tenantSlug/admin/availability/rules
adminRouter.post('/availability/rules', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenant = (req as any).tenant;
        const body = CreateAvailabilityRuleSchema.parse(req.body);

        const rule = await prisma.availabilityRule.create({
            data: { tenantId: tenant.id, ...body },
        });
        res.status(201).json({ ok: true, data: rule });
    } catch (error) {
        next(error);
    }
});

// GET /t/:tenantSlug/admin/availability/rules
adminRouter.get('/availability/rules', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenant = (req as any).tenant;
        const rules = await prisma.availabilityRule.findMany({
            where: { tenantId: tenant.id },
            orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }],
        });
        res.json({ ok: true, data: rules });
    } catch (error) {
        next(error);
    }
});

// DELETE /t/:tenantSlug/admin/availability/rules/:id
adminRouter.delete('/availability/rules/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenant = (req as any).tenant;
        const { id } = req.params;
        await prisma.availabilityRule.deleteMany({ where: { id, tenantId: tenant.id } });
        res.json({ ok: true, message: 'Regla eliminada' });
    } catch (error) {
        next(error);
    }
});

// POST /t/:tenantSlug/admin/blocked-times
adminRouter.post('/blocked-times', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenant = (req as any).tenant;
        const body = CreateBlockedTimeSchema.parse(req.body);

        const blocked = await prisma.blockedTime.create({
            data: {
                tenantId: tenant.id,
                startsAt: new Date(body.startsAt),
                endsAt: new Date(body.endsAt),
                reason: body.reason,
            },
        });
        res.status(201).json({ ok: true, data: blocked });
    } catch (error) {
        next(error);
    }
});

// GET /t/:tenantSlug/admin/blocked-times
adminRouter.get('/blocked-times', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenant = (req as any).tenant;
        const times = await prisma.blockedTime.findMany({
            where: { tenantId: tenant.id },
            orderBy: { startsAt: 'desc' },
        });
        res.json({ ok: true, data: times });
    } catch (error) {
        next(error);
    }
});

// GET /t/:tenantSlug/admin/reports/summary
adminRouter.get('/reports/summary', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const tenant = (req as any).tenant;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        // This month income
        const thisMonthPayments = await prisma.payment.aggregate({
            where: {
                tenantId: tenant.id,
                status: 'approved',
                paidAt: { gte: startOfMonth },
            },
            _sum: { amount: true },
            _count: true,
        });

        // Last month income
        const lastMonthPayments = await prisma.payment.aggregate({
            where: {
                tenantId: tenant.id,
                status: 'approved',
                paidAt: { gte: startOfLastMonth, lt: startOfMonth },
            },
            _sum: { amount: true },
        });

        // Lessons this month
        const lessonsThisMonth = await prisma.lesson.count({
            where: {
                tenantId: tenant.id,
                status: { in: ['completed', 'confirmed'] },
                startsAt: { gte: startOfMonth },
            },
        });

        // Active students
        const activeStudents = await prisma.student.count({
            where: { tenantId: tenant.id, isActive: true },
        });

        // Upcoming lessons this week
        const endOfWeek = new Date(now);
        endOfWeek.setDate(endOfWeek.getDate() + 7);
        const weekLessons = await prisma.lesson.count({
            where: {
                tenantId: tenant.id,
                status: 'confirmed',
                startsAt: { gte: now, lte: endOfWeek },
            },
        });

        // Weekly capacity (based on availability rules)
        const rules = await prisma.availabilityRule.findMany({
            where: { tenantId: tenant.id, isActive: true },
        });
        const weeklySlots = rules.reduce((sum, r) => {
            const [sh, sm] = r.startTime.split(':').map(Number);
            const [eh, em] = r.endTime.split(':').map(Number);
            const totalMin = (eh * 60 + em) - (sh * 60 + sm);
            return sum + Math.floor(totalMin / r.slotMinutes);
        }, 0);

        res.json({
            ok: true,
            data: {
                thisMonthIncome: thisMonthPayments._sum.amount || 0,
                thisMonthTransactions: thisMonthPayments._count,
                lastMonthIncome: lastMonthPayments._sum.amount || 0,
                lessonsThisMonth,
                activeStudents,
                upcomingThisWeek: weekLessons,
                weeklyCapacity: weeklySlots,
                occupationRate: weeklySlots > 0 ? Math.round((weekLessons / weeklySlots) * 100) : 0,
            },
        });
    } catch (error) {
        next(error);
    }
});
