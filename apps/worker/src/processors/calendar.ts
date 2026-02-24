import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaClient } from '@teach-pro/db';
import { google, calendar_v3 } from 'googleapis';
import { logJobRun } from '../utils/jobLogger';

export function registerCalendarWorker(redis: IORedis, prisma: PrismaClient): Worker {
    const worker = new Worker('calendar', async (job: Job) => {
        const startedAt = new Date();
        const { tenantId, lessonId, calendarEventId } = job.data;

        try {
            await logJobRun(prisma, {
                tenantId, jobName: job.name, jobId: job.id || '',
                status: 'running', payload: job.data, startedAt,
            });

            const lesson = await prisma.lesson.findUnique({
                where: { id: lessonId },
                include: {
                    student: { include: { user: true } },
                    lessonType: true,
                },
            });
            if (!lesson) throw new Error(`Lesson ${lessonId} not found`);

            const settings = await prisma.tenantSettings.findUnique({
                where: { tenantId },
            });

            // Google Calendar OAuth2 setup
            const oauth2Client = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET,
                process.env.GOOGLE_REDIRECT_URI,
            );

            const refreshToken = settings?.googleRefreshToken || process.env.GOOGLE_REFRESH_TOKEN;
            if (!refreshToken) {
                console.warn(`[calendar] No Google refresh token for tenant ${tenantId}. Skipping calendar event.`);
                // Still generate a placeholder Meet link
                const meetUrl = `https://meet.google.com/placeholder-${lessonId.slice(0, 8)}`;
                await prisma.lesson.update({
                    where: { id: lessonId },
                    data: { meetingJoinUrl: meetUrl },
                });

                await logJobRun(prisma, {
                    tenantId, jobName: job.name, jobId: job.id || '',
                    status: 'completed', payload: job.data, startedAt,
                    result: { meetUrl, note: 'No Google token, used placeholder' },
                    completedAt: new Date(),
                });
                return;
            }

            oauth2Client.setCredentials({ refresh_token: refreshToken });
            const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

            if (job.name === 'create-event') {
                const event: calendar_v3.Schema$Event = {
                    summary: `Clase de francés — ${lesson.student.user.name}`,
                    description: `${lesson.lessonType.name}\nAlumno: ${lesson.student.user.name}\nNivel: ${lesson.student.level || 'Por definir'}`,
                    start: {
                        dateTime: lesson.startsAt.toISOString(),
                        timeZone: 'America/Bogota',
                    },
                    end: {
                        dateTime: lesson.endsAt.toISOString(),
                        timeZone: 'America/Bogota',
                    },
                    attendees: lesson.student.user.email
                        ? [{ email: lesson.student.user.email }]
                        : [],
                    conferenceData: {
                        createRequest: {
                            requestId: `tp-${lessonId}`,
                            conferenceSolutionKey: { type: 'hangoutsMeet' },
                        },
                    },
                };

                const calendarId = settings?.googleCalendarId || 'primary';
                const created = await calendar.events.insert({
                    calendarId,
                    requestBody: event,
                    conferenceDataVersion: 1,
                });

                const meetUrl = created.data.conferenceData?.entryPoints?.[0]?.uri || created.data.hangoutLink || '';
                await prisma.lesson.update({
                    where: { id: lessonId },
                    data: {
                        calendarEventId: created.data.id || '',
                        meetingJoinUrl: meetUrl,
                    },
                });

                await logJobRun(prisma, {
                    tenantId, jobName: job.name, jobId: job.id || '',
                    status: 'completed', payload: job.data, startedAt,
                    result: { calendarEventId: created.data.id, meetUrl },
                    completedAt: new Date(),
                });
            }

            if (job.name === 'update-event' && lesson.calendarEventId) {
                const calendarId = settings?.googleCalendarId || 'primary';
                await calendar.events.update({
                    calendarId,
                    eventId: lesson.calendarEventId,
                    requestBody: {
                        start: { dateTime: lesson.startsAt.toISOString(), timeZone: 'America/Bogota' },
                        end: { dateTime: lesson.endsAt.toISOString(), timeZone: 'America/Bogota' },
                    },
                });

                await logJobRun(prisma, {
                    tenantId, jobName: job.name, jobId: job.id || '',
                    status: 'completed', payload: job.data, startedAt,
                    result: { updated: true },
                    completedAt: new Date(),
                });
            }

            if (job.name === 'delete-event' && calendarEventId) {
                const calendarId = settings?.googleCalendarId || 'primary';
                await calendar.events.delete({ calendarId, eventId: calendarEventId });

                await logJobRun(prisma, {
                    tenantId, jobName: job.name, jobId: job.id || '',
                    status: 'completed', payload: job.data, startedAt,
                    result: { deleted: true },
                    completedAt: new Date(),
                });
            }

        } catch (error: any) {
            await logJobRun(prisma, {
                tenantId, jobName: job.name, jobId: job.id || '',
                status: 'failed', payload: job.data, startedAt,
                error: error.message,
                completedAt: new Date(),
            });
            throw error;
        }
    }, {
        connection: redis,
        concurrency: 2,
        limiter: { max: 5, duration: 1000 },
    });

    worker.on('failed', (job, err) => {
        console.error(`[calendar] Job ${job?.id} failed:`, err.message);
    });

    console.log('  📅 Calendar worker ready');
    return worker;
}
