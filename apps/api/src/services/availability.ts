import { prisma } from '../index';
import { Slot } from '@teach-pro/shared';

/**
 * Generate available slots for a tenant based on availability rules,
 * blocked times, and existing lessons.
 */
export async function generateSlots(
    tenantId: string,
    lessonTypeId: string,
    fromDate: string,
    toDate: string,
    tz: string = 'America/Bogota',
): Promise<Slot[]> {
    // Get lesson type duration
    const lessonType = await prisma.lessonType.findFirst({
        where: { id: lessonTypeId, tenantId },
    });
    if (!lessonType) throw Object.assign(new Error('Tipo de clase no encontrado'), { status: 404 });

    const durationMs = lessonType.durationMin * 60 * 1000;

    // Get availability rules for this tenant
    const rules = await prisma.availabilityRule.findMany({
        where: { tenantId, isActive: true },
    });

    // Get blocked times in range
    const from = new Date(fromDate);
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);

    const blockedTimes = await prisma.blockedTime.findMany({
        where: {
            tenantId,
            startsAt: { lte: to },
            endsAt: { gte: from },
        },
    });

    // Get existing lessons in range (reserved or confirmed)
    const existingLessons = await prisma.lesson.findMany({
        where: {
            tenantId,
            startsAt: { gte: from, lte: to },
            status: { in: ['reserved', 'confirmed'] },
        },
        select: { startsAt: true, endsAt: true },
    });

    const slots: Slot[] = [];
    const current = new Date(from);
    current.setHours(0, 0, 0, 0);

    const endDate = new Date(to);
    endDate.setHours(23, 59, 59, 999);

    while (current <= endDate) {
        const dayOfWeek = current.getDay(); // 0=Sun, 6=Sat
        const dayRules = rules.filter((r) => r.weekday === dayOfWeek);

        for (const rule of dayRules) {
            const [startH, startM] = rule.startTime.split(':').map(Number);
            const [endH, endM] = rule.endTime.split(':').map(Number);

            const slotStart = new Date(current);
            slotStart.setHours(startH, startM, 0, 0);

            const ruleEnd = new Date(current);
            ruleEnd.setHours(endH, endM, 0, 0);

            while (slotStart.getTime() + durationMs <= ruleEnd.getTime()) {
                const slotEnd = new Date(slotStart.getTime() + durationMs);

                // Skip past slots
                if (slotStart <= new Date()) {
                    slotStart.setTime(slotStart.getTime() + rule.slotMinutes * 60 * 1000);
                    continue;
                }

                // Check blocked times overlap
                const isBlocked = blockedTimes.some((bt) => {
                    return slotStart < bt.endsAt && slotEnd > bt.startsAt;
                });

                // Check existing lessons overlap
                const isBooked = existingLessons.some((l) => {
                    return slotStart < l.endsAt && slotEnd > l.startsAt;
                });

                // Format with COL offset (-05:00)
                const offsetStr = formatWithOffset(slotStart, -5);
                const offsetEndStr = formatWithOffset(slotEnd, -5);

                slots.push({
                    start: offsetStr,
                    end: offsetEndStr,
                    available: !isBlocked && !isBooked,
                });

                slotStart.setTime(slotStart.getTime() + rule.slotMinutes * 60 * 1000);
            }
        }

        current.setDate(current.getDate() + 1);
    }

    return slots.filter((s) => s.available);
}

function formatWithOffset(date: Date, offsetHours: number): string {
    const d = new Date(date.getTime() + offsetHours * 60 * 60 * 1000);
    const sign = offsetHours >= 0 ? '+' : '-';
    const abs = Math.abs(offsetHours);
    const hh = String(abs).padStart(2, '0');
    const iso = d.toISOString().replace('Z', '');
    return `${iso}${sign}${hh}:00`;
}
