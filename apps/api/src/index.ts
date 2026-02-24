import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { PrismaClient } from '@teach-pro/db';
import { v4 as uuidv4 } from 'uuid';

import { authRouter } from './routes/auth';
import { publicRouter } from './routes/public';
import { studentRouter } from './routes/student';
import { adminRouter } from './routes/admin';
import { webhookRouter } from './routes/webhooks';
import { botRouter } from './routes/bot';
import { superAdminRouter } from './routes/superAdmin';
import { errorHandler } from './middleware/errorHandler';
import { createQueues } from './queues';

export const prisma = new PrismaClient();
export const queues = createQueues();

const app = express();
const PORT = process.env.PORT || 4000;

// ─── Request ID middleware ──────────────────────────
app.use((req, _res, next) => {
    (req as any).requestId = uuidv4();
    next();
});

// ─── Global middleware ──────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.WEB_URL || 'http://localhost:3000', credentials: true }));
app.use(morgan(':method :url :status :response-time ms - :req[x-request-id]'));
app.use(express.json({ limit: '5mb' }));

// ─── Health ─────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
});

// ─── Routes ─────────────────────────────────────────
app.use('/auth', authRouter);
app.use('/t/:tenantSlug/public', publicRouter);
app.use('/t/:tenantSlug/admin', adminRouter);
app.use('/t/:tenantSlug/payments/webhook', webhookRouter);
app.use('/t/:tenantSlug/bot', botRouter);
app.use('/t/:tenantSlug', studentRouter);
app.use('/super-admin', superAdminRouter);

// ─── Error handler ──────────────────────────────────
app.use(errorHandler);

// ─── Start ──────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`🚀 API running on http://localhost:${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
