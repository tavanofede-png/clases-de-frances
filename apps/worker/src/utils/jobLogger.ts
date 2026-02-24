import { PrismaClient, JobStatus } from '@teach-pro/db';

interface JobLogInput {
    tenantId: string;
    jobName: string;
    jobId: string;
    status: 'queued' | 'running' | 'completed' | 'failed' | 'dead_letter';
    payload?: any;
    result?: any;
    error?: string;
    startedAt?: Date;
    completedAt?: Date;
}

export async function logJobRun(prisma: PrismaClient, input: JobLogInput) {
    try {
        // Upsert based on jobId to avoid duplicates
        const existing = input.jobId
            ? await prisma.jobRun.findFirst({ where: { jobId: input.jobId, jobName: input.jobName } })
            : null;

        if (existing) {
            await prisma.jobRun.update({
                where: { id: existing.id },
                data: {
                    status: input.status as JobStatus,
                    result: input.result ? input.result : undefined,
                    error: input.error,
                    attempts: { increment: input.status === 'failed' ? 1 : 0 },
                    completedAt: input.completedAt,
                },
            });
        } else {
            await prisma.jobRun.create({
                data: {
                    tenantId: input.tenantId,
                    jobName: input.jobName,
                    jobId: input.jobId,
                    status: input.status as JobStatus,
                    payload: input.payload,
                    result: input.result,
                    error: input.error,
                    attempts: 1,
                    startedAt: input.startedAt,
                    completedAt: input.completedAt,
                },
            });
        }
    } catch (err) {
        console.error('[jobLogger] Failed to log job run:', err);
    }
}
