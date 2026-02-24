import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export interface AuthPayload {
    userId: string;
    email: string;
    role: string;
    tenantId?: string;
}

export function generateTokens(payload: AuthPayload) {
    const accessToken = jwt.sign(payload, JWT_SECRET, {
        expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any,
    });
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'refresh-secret', {
        expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any,
    });
    return { accessToken, refreshToken };
}

export function verifyToken(token: string): AuthPayload {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
}

// Middleware: require authentication
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
    try {
        const header = req.headers.authorization;
        if (!header || !header.startsWith('Bearer ')) {
            const err: any = new Error('Token no proporcionado');
            err.status = 401;
            throw err;
        }
        const token = header.split(' ')[1];
        const payload = verifyToken(token);
        (req as any).user = payload;
        next();
    } catch (error: any) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            error.status = 401;
            error.message = 'Token inválido o expirado';
        }
        next(error);
    }
}

// Middleware: require specific roles
export function requireRole(...roles: string[]) {
    return (req: Request, _res: Response, next: NextFunction) => {
        const user = (req as any).user;
        if (!user || !roles.includes(user.role)) {
            const err: any = new Error('Acceso denegado');
            err.status = 403;
            return next(err);
        }
        next();
    };
}

// Middleware: resolve tenant from URL slug + verify access
export async function resolveTenant(req: Request, _res: Response, next: NextFunction) {
    try {
        const { tenantSlug } = req.params;
        if (!tenantSlug) {
            const err: any = new Error('Tenant no especificado');
            err.status = 400;
            throw err;
        }
        const tenant = await prisma.tenant.findUnique({
            where: { slug: tenantSlug },
            include: { settings: true },
        });
        if (!tenant || !tenant.isActive) {
            const err: any = new Error('Tenant no encontrado');
            err.status = 404;
            throw err;
        }
        (req as any).tenant = tenant;
        next();
    } catch (error) {
        next(error);
    }
}

// Middleware: verify user belongs to tenant
export function requireTenantAccess(req: Request, _res: Response, next: NextFunction) {
    const user = (req as any).user;
    const tenant = (req as any).tenant;
    if (user.role === 'super_admin') return next();
    if (!user.tenantId || user.tenantId !== tenant.id) {
        const err: any = new Error('No tienes acceso a este tenant');
        err.status = 403;
        return next(err);
    }
    next();
}
