import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../index';
import { generateTokens, verifyToken, requireAuth, AuthPayload } from '../middleware/auth';
import { LoginSchema, RegisterSchema } from '@teach-pro/shared';

export const authRouter = Router();

// POST /auth/register
authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const body = RegisterSchema.parse(req.body);

        // Check if email already exists
        const existing = await prisma.user.findUnique({ where: { email: body.email } });
        if (existing) {
            return res.status(409).json({ ok: false, error: 'Ya existe una cuenta con este email' });
        }

        // Find tenant by slug
        const tenant = await prisma.tenant.findUnique({ where: { slug: body.tenantSlug } });
        if (!tenant) {
            return res.status(404).json({ ok: false, error: 'Organización no encontrada' });
        }

        const passwordHash = await bcrypt.hash(body.password, 10);

        // Create user + student in transaction
        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    tenantId: tenant.id,
                    email: body.email,
                    passwordHash,
                    name: body.name,
                    role: 'student',
                    phone: body.phone || null,
                    timezone: tenant.timezone,
                },
            });

            await tx.student.create({
                data: {
                    tenantId: tenant.id,
                    userId: user.id,
                },
            });

            return user;
        });

        const payload: AuthPayload = {
            userId: result.id,
            email: result.email,
            role: result.role,
            tenantId: result.tenantId || undefined,
        };
        const tokens = generateTokens(payload);

        res.status(201).json({
            ok: true,
            data: {
                user: {
                    id: result.id,
                    email: result.email,
                    name: result.name,
                    role: result.role,
                    tenantId: result.tenantId,
                },
                ...tokens,
            },
        });
    } catch (error) {
        next(error);
    }
});

// POST /auth/login
authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const body = LoginSchema.parse(req.body);
        const user = await prisma.user.findUnique({ where: { email: body.email } });
        if (!user || !user.isActive) {
            return res.status(401).json({ ok: false, error: 'Credenciales inválidas' });
        }

        const validPassword = await bcrypt.compare(body.password, user.passwordHash);
        if (!validPassword) {
            return res.status(401).json({ ok: false, error: 'Credenciales inválidas' });
        }

        const payload: AuthPayload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId || undefined,
        };
        const tokens = generateTokens(payload);

        res.json({
            ok: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    tenantId: user.tenantId,
                },
                ...tokens,
            },
        });
    } catch (error) {
        next(error);
    }
});

// POST /auth/refresh
authRouter.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ ok: false, error: 'Refresh token requerido' });
        }

        const decoded = verifyToken(refreshToken);
        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user || !user.isActive) {
            return res.status(401).json({ ok: false, error: 'Usuario inválido' });
        }

        const payload: AuthPayload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId || undefined,
        };
        const tokens = generateTokens(payload);

        res.json({ ok: true, data: tokens });
    } catch (error) {
        next(error);
    }
});

// GET /auth/me
authRouter.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId } = (req as any).user;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true, email: true, name: true, role: true,
                phone: true, timezone: true, tenantId: true,
                student: { select: { id: true, level: true, objectives: true } },
            },
        });
        if (!user) {
            return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
        }
        res.json({ ok: true, data: user });
    } catch (error) {
        next(error);
    }
});
