import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { resolveTenant } from '../middleware/auth';
import { BotIncomingSchema, BotResponse, BotIntentEnum } from '@teach-pro/shared';
import { generateSlots } from '../services/availability';
import rateLimit from 'express-rate-limit';

export const botRouter = Router({ mergeParams: true });

const botLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { ok: false, error: 'Demasiadas solicitudes. Intenta en un momento.' },
});

botRouter.use(resolveTenant);
botRouter.use(botLimiter);

// ─── Intent detection ─────────────────────────────────
function detectIntent(text: string): string {
    const lower = text.toLowerCase().trim();

    if (/hola|buenos|buenas|hey|saludos/i.test(lower)) return 'greeting';
    if (/precio|costo|cuánto|cuanto|valor|tarifa|pack/i.test(lower)) return 'pricing';
    if (/prueba|trial|introductoria|primera/i.test(lower)) return 'book_trial';
    if (/reservar|agendar|booking|clase regular|quiero una clase/i.test(lower)) return 'book_regular';
    if (/horario|disponib|slot|cuándo|cuando|hora/i.test(lower)) return 'get_slots';
    if (/pagar|pago|checkout|wompi/i.test(lower)) return 'pay_now';
    if (/estado.*pago|pago.*estado|comprobante/i.test(lower)) return 'payment_status';
    if (/reprogramar|cambiar.*hora|mover.*clase/i.test(lower)) return 'reschedule';
    if (/cancelar|anular/i.test(lower)) return 'cancel';
    if (/link|meet|enlace|url/i.test(lower)) return 'resend_meeting_link';
    if (/human|persona|hablar.*alguien|profesor/i.test(lower)) return 'talk_to_human';

    return 'unknown';
}

// ─── Intent handlers ──────────────────────────────────
async function handleGreeting(tenant: any): Promise<BotResponse> {
    return {
        replyText: `¡Hola! 👋 Soy el asistente virtual de ${tenant.name}. ¿En qué puedo ayudarte?`,
        quickReplies: [
            { label: '📋 Ver precios', value: 'precios' },
            { label: '📅 Ver horarios', value: 'horarios disponibles' },
            { label: '🎯 Clase de prueba', value: 'quiero una clase de prueba' },
            { label: '💬 Hablar con la profe', value: 'hablar con alguien' },
        ],
    };
}

async function handlePricing(tenantId: string): Promise<BotResponse> {
    const types = await prisma.lessonType.findMany({
        where: { tenantId, isActive: true },
        orderBy: { sortOrder: 'asc' },
    });

    const lines = types.map((t) => {
        const price = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(t.priceAmount);
        const pack = t.isPackType ? ` (${t.packSize} clases)` : '';
        return `• ${t.name}${pack}: ${price} — ${t.durationMin} min`;
    });

    return {
        replyText: `📋 Nuestros precios:\n\n${lines.join('\n')}\n\n¿Te gustaría reservar una clase?`,
        quickReplies: [
            { label: '🎯 Clase de prueba', value: 'quiero clase de prueba' },
            { label: '📅 Ver horarios', value: 'horarios disponibles' },
        ],
    };
}

async function handleGetSlots(tenant: any): Promise<BotResponse> {
    const regularType = await prisma.lessonType.findFirst({
        where: { tenantId: tenant.id, isActive: true, isPackType: false },
        orderBy: { sortOrder: 'asc' },
    });

    if (!regularType) {
        return { replyText: 'No hay tipos de clase disponibles en este momento.', quickReplies: [] };
    }

    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 7);

    const slots = await generateSlots(tenant.id, regularType.id, from.toISOString(), to.toISOString());
    const firstSlots = slots.slice(0, 8);

    if (firstSlots.length === 0) {
        return {
            replyText: 'No hay horarios disponibles en los próximos 7 días. ¿Quieres que la profesora te contacte?',
            quickReplies: [{ label: '💬 Hablar con la profe', value: 'hablar con alguien' }],
        };
    }

    const lines = firstSlots.map((s) => {
        const d = new Date(s.start);
        const day = d.toLocaleDateString('es-CO', { weekday: 'short', month: 'short', day: 'numeric' });
        const time = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
        return `• ${day} — ${time}`;
    });

    const portalLink = `${process.env.WEB_URL || 'http://localhost:3000'}/t/${encodeURIComponent(tenant.slug)}/login`;

    return {
        replyText: `📅 Próximos horarios disponibles:\n\n${lines.join('\n')}\n\nPara reservar, ingresa al portal de alumno o contáctanos.`,
        quickReplies: [
            { label: '📅 Reservar en el Portal', value: portalLink },
            { label: '🎯 Reservar prueba', value: 'quiero clase de prueba' },
            { label: '💬 Hablar con la profe', value: 'hablar con alguien' },
        ],
    };
}

async function handleBookTrial(tenant: any): Promise<BotResponse> {
    const trialType = await prisma.lessonType.findFirst({
        where: { tenantId: tenant.id, isActive: true, name: { contains: 'prueba' } },
    });

    const price = trialType
        ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(trialType.priceAmount)
        : '';

    const whatsapp = tenant.settings?.whatsappNumber;
    const waLink = whatsapp ? `https://wa.me/${whatsapp.replace('+', '')}?text=Hola%2C%20quiero%20reservar%20una%20clase%20de%20prueba` : '';

    const portalLink = `${process.env.WEB_URL || 'http://localhost:3000'}/t/${encodeURIComponent(tenant.slug)}/login`;

    return {
        replyText: `🎯 ¡Genial! La clase de prueba dura ${trialType?.durationMin || 30} minutos y cuesta ${price}.\n\nPuedes reservar directamente desde el portal de alumno o escribirnos por WhatsApp.`,
        quickReplies: [
            { label: '📅 Reservar en el Portal', value: portalLink },
            { label: '📅 Ver horarios', value: 'horarios disponibles' },
            ...(waLink ? [{ label: '💬 WhatsApp', value: waLink }] : []),
        ],
    };
}

async function handleBookRegular(tenant: any): Promise<BotResponse> {
    const regularType = await prisma.lessonType.findFirst({
        where: { tenantId: tenant.id, isActive: true, isPackType: false },
        orderBy: { sortOrder: 'asc' }
    });

    const price = regularType
        ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(regularType.priceAmount)
        : '';

    const portalLink = `${process.env.WEB_URL || 'http://localhost:3000'}/t/${encodeURIComponent(tenant.slug)}/login`;
    const whatsapp = tenant.settings?.whatsappNumber;
    const waLink = whatsapp ? `https://wa.me/${whatsapp.replace('+', '')}?text=Hola%2C%20quiero%20reservar%20una%20clase%20regular` : '';

    return {
        replyText: `📚 ¡Excelente! Las clases regulares duran ${regularType?.durationMin || 60} minutos y tienen un valor de ${price}.\n\nPara agendar tu clase ahora mismo, ingresa al portal de alumno.`,
        quickReplies: [
            { label: '📅 Ir al Portal a reservar', value: portalLink },
            { label: '📅 Ver horarios primero', value: 'horarios disponibles' },
            ...(waLink ? [{ label: '💬 Ayuda por WhatsApp', value: waLink }] : []),
        ],
    };
}

async function handleTalkToHuman(tenant: any): Promise<BotResponse> {
    const whatsapp = tenant.settings?.whatsappNumber;
    const waLink = whatsapp ? `https://wa.me/${whatsapp.replace('+', '')}` : '';

    return {
        replyText: `Te vamos a conectar con la profesora. ${waLink ? `También puedes escribirle directamente por WhatsApp.` : 'Te contactaremos pronto.'}`,
        quickReplies: [
            ...(waLink ? [{ label: '💬 Ir a WhatsApp', value: waLink }] : []),
        ],
    };
}

function handleUnknown(): BotResponse {
    return {
        replyText: 'No estoy seguro de lo que necesitas. ¿Te gustaría ver alguna de estas opciones?',
        quickReplies: [
            { label: '📋 Ver precios', value: 'precios' },
            { label: '📅 Ver horarios', value: 'horarios disponibles' },
            { label: '🎯 Clase de prueba', value: 'quiero clase de prueba' },
            { label: '💬 Hablar con la profe', value: 'hablar con alguien' },
        ],
    };
}

// ─── Main bot endpoint ────────────────────────────────
// POST /t/:tenantSlug/bot/incoming
botRouter.post('/incoming', async (req: Request, res: Response, next: NextFunction) => {
    try {
        console.log(`[BOT] Incoming request for tenantSlug:`, req.params.tenantSlug);
        console.log(`[BOT] Body:`, req.body);

        const tenant = (req as any).tenant;
        console.log(`[BOT] Tenant resolved:`, tenant?.id);

        const body = BotIncomingSchema.parse(req.body);
        console.log(`[BOT] Body parsed successfully`);

        const intent = detectIntent(body.messageText);
        console.log(`[BOT] Intent detected:`, intent);

        // Log incoming
        await prisma.messageLog.create({
            data: {
                tenantId: tenant.id,
                channel: body.channel,
                direction: 'incoming',
                fromId: body.from,
                body: body.messageText,
                intent,
            },
        });

        let response: BotResponse;

        switch (intent) {
            case 'greeting':
                response = await handleGreeting(tenant);
                break;
            case 'pricing':
                response = await handlePricing(tenant.id);
                break;
            case 'get_slots':
                response = await handleGetSlots(tenant);
                break;
            case 'book_trial':
                response = await handleBookTrial(tenant);
                break;
            case 'book_regular':
                response = await handleBookRegular(tenant);
                break;
            case 'talk_to_human':
                response = await handleTalkToHuman(tenant);
                break;
            case 'pay_now':
                response = {
                    replyText: 'Para realizar un pago, ingresa al portal de alumno y selecciona la clase que deseas pagar.',
                    quickReplies: [{ label: '📋 Ver precios', value: 'precios' }],
                };
                break;
            case 'payment_status':
                response = {
                    replyText: 'Puedes consultar el estado de tus pagos en el portal de alumno, sección "Mis clases".',
                    quickReplies: [],
                };
                break;
            case 'reschedule':
                response = {
                    replyText: 'Para reprogramar una clase, ingresa al portal de alumno y selecciona la clase que deseas mover. Recuerda que puedes reprogramar con al menos 24 horas de anticipación.',
                    quickReplies: [],
                };
                break;
            case 'cancel':
                response = {
                    replyText: 'Para cancelar una clase, ve al portal de alumno. Las cancelaciones deben hacerse con al menos 24 horas de anticipación.',
                    quickReplies: [],
                };
                break;
            case 'resend_meeting_link':
                response = {
                    replyText: 'El link de Google Meet lo encuentras en el portal de alumno, en la sección de tu próxima clase.',
                    quickReplies: [],
                };
                break;
            default:
                response = handleUnknown();
        }

        // Log outgoing
        await prisma.messageLog.create({
            data: {
                tenantId: tenant.id,
                channel: body.channel,
                direction: 'outgoing',
                toId: body.from,
                body: response.replyText,
                intent,
                metadata: { quickReplies: response.quickReplies } as any,
            },
        });

        res.json({ ok: true, data: response });
    } catch (error) {
        next(error);
    }
});
