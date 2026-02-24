import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../index';
import { generateTokens, verifyToken, requireAuth, AuthPayload } from '../middleware/auth';
import { LoginSchema } from '@teach-pro/shared';

export const authRouter = Router();

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
