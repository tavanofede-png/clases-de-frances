import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
    const requestId = (req as any).requestId || 'unknown';
    console.error(`[${requestId}] Error:`, err);

    if (err.name === 'ZodError') {
        return res.status(400).json({
            ok: false,
            error: 'Datos inválidos',
            details: err.errors,
            requestId,
        });
    }

    if (err.name === 'UnauthorizedError' || err.status === 401) {
        return res.status(401).json({ ok: false, error: 'No autorizado', requestId });
    }

    if (err.status === 403) {
        return res.status(403).json({ ok: false, error: 'Acceso denegado', requestId });
    }

    if (err.status === 404) {
        return res.status(404).json({ ok: false, error: 'No encontrado', requestId });
    }

    if (err.code === 'P2002') {
        return res.status(409).json({ ok: false, error: 'El registro ya existe', requestId });
    }

    res.status(err.status || 500).json({
        ok: false,
        error: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message,
        requestId,
    });
}
