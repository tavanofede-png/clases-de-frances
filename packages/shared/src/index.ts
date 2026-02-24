import { z } from 'zod';

// ════════════════════════════════════════════════════════════
// Enums
// ════════════════════════════════════════════════════════════

export const RoleEnum = z.enum(['super_admin', 'tenant_admin', 'student']);
export type RoleType = z.infer<typeof RoleEnum>;

export const LessonStatusEnum = z.enum(['reserved', 'confirmed', 'completed', 'cancelled', 'no_show']);
export type LessonStatusType = z.infer<typeof LessonStatusEnum>;

export const PaymentStatusEnum = z.enum(['pending', 'approved', 'rejected', 'failed', 'refunded', 'covered_by_pack']);
export type PaymentStatusType = z.infer<typeof PaymentStatusEnum>;

export const PaymentProviderEnum = z.enum(['wompi', 'stripe', 'manual']);
export type PaymentProviderType = z.infer<typeof PaymentProviderEnum>;

export const BotChannelEnum = z.enum(['webchat', 'whatsapp', 'telegram']);
export type BotChannelType = z.infer<typeof BotChannelEnum>;

export const BotIntentEnum = z.enum([
    'pricing', 'book_trial', 'book_regular', 'get_slots',
    'pay_now', 'payment_status', 'reschedule', 'cancel',
    'resend_meeting_link', 'talk_to_human', 'greeting', 'unknown',
]);
export type BotIntentType = z.infer<typeof BotIntentEnum>;

// ════════════════════════════════════════════════════════════
// Auth
// ════════════════════════════════════════════════════════════

export const LoginSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'La contraseña debe tener mínimo 6 caracteres'),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const RegisterSchema = z.object({
    name: z.string().min(2, 'El nombre es obligatorio'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'La contraseña debe tener mínimo 6 caracteres'),
    phone: z.string().min(7, 'Ingresa un número de celular válido').optional().or(z.literal('')),
    tenantSlug: z.string().min(1, 'Tenant es requerido'),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

// ════════════════════════════════════════════════════════════
// Leads
// ════════════════════════════════════════════════════════════

export const CreateLeadSchema = z.object({
    name: z.string().min(2, 'El nombre es obligatorio'),
    phone: z.string().min(7, 'Ingresa un número de celular válido'),
    email: z.string().email().optional().or(z.literal('')),
    objective: z.string().optional(),
});
export type CreateLeadInput = z.infer<typeof CreateLeadSchema>;

// ════════════════════════════════════════════════════════════
// Slots
// ════════════════════════════════════════════════════════════

export const GetSlotsSchema = z.object({
    lessonTypeId: z.string().uuid(),
    from: z.string(), // ISO date
    to: z.string(),   // ISO date
    tz: z.string().default('America/Bogota'),
});
export type GetSlotsInput = z.infer<typeof GetSlotsSchema>;

export interface Slot {
    start: string;  // ISO 8601 with offset
    end: string;
    available: boolean;
}

// ════════════════════════════════════════════════════════════
// Booking
// ════════════════════════════════════════════════════════════

export const CreateBookingSchema = z.object({
    lessonTypeId: z.string().uuid(),
    startsAt: z.string(), // ISO 8601
});
export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;

export const RescheduleSchema = z.object({
    newStartsAt: z.string(),
});
export type RescheduleInput = z.infer<typeof RescheduleSchema>;

export const CancelSchema = z.object({
    reason: z.string().optional(),
});
export type CancelInput = z.infer<typeof CancelSchema>;

// ════════════════════════════════════════════════════════════
// Payment
// ════════════════════════════════════════════════════════════

export const CreateCheckoutSchema = z.object({
    lessonId: z.string().uuid(),
});
export type CreateCheckoutInput = z.infer<typeof CreateCheckoutSchema>;

export const CreatePackPurchaseSchema = z.object({
    lessonTypeId: z.string().uuid(),
});
export type CreatePackPurchaseInput = z.infer<typeof CreatePackPurchaseSchema>;

// ════════════════════════════════════════════════════════════
// Bot
// ════════════════════════════════════════════════════════════

export const BotIncomingSchema = z.object({
    channel: BotChannelEnum,
    from: z.string(),
    messageText: z.string(),
    tz: z.string().default('America/Bogota'),
    locale: z.string().default('es-CO'),
});
export type BotIncomingInput = z.infer<typeof BotIncomingSchema>;

export interface BotQuickReply {
    label: string;
    value: string;
}

export interface BotResponse {
    replyText: string;
    quickReplies: BotQuickReply[];
}

// ════════════════════════════════════════════════════════════
// Admin
// ════════════════════════════════════════════════════════════

export const CreateAvailabilityRuleSchema = z.object({
    weekday: z.number().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
    slotMinutes: z.number().min(15).max(180).default(60),
});
export type CreateAvailabilityRuleInput = z.infer<typeof CreateAvailabilityRuleSchema>;

export const CreateBlockedTimeSchema = z.object({
    startsAt: z.string(),
    endsAt: z.string(),
    reason: z.string().optional(),
});
export type CreateBlockedTimeInput = z.infer<typeof CreateBlockedTimeSchema>;

export const UpdateConfigSchema = z.object({
    requirePaymentToConfirm: z.boolean().optional(),
    rescheduleMinHours: z.number().optional(),
    cancelMinHours: z.number().optional(),
    noShowConsumeCredit: z.boolean().optional(),
    heroTitle: z.string().optional(),
    heroSubtitle: z.string().optional(),
    whatsappNumber: z.string().optional(),
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    confirmationTemplate: z.string().optional(),
    reminder24hTemplate: z.string().optional(),
    reminder1hTemplate: z.string().optional(),
    pendingPaymentTemplate: z.string().optional(),
    followUpTemplate: z.string().optional(),
}).partial();
export type UpdateConfigInput = z.infer<typeof UpdateConfigSchema>;

// ════════════════════════════════════════════════════════════
// API Response
// ════════════════════════════════════════════════════════════

export interface ApiResponse<T = unknown> {
    ok: boolean;
    data?: T;
    error?: string;
    message?: string;
}

// ════════════════════════════════════════════════════════════
// Job types
// ════════════════════════════════════════════════════════════

export const JOB_NAMES = {
    CREATE_CALENDAR_EVENT: 'create_calendar_event',
    UPDATE_CALENDAR_EVENT: 'update_calendar_event',
    DELETE_CALENDAR_EVENT: 'delete_calendar_event',
    SEND_CONFIRMATION: 'send_confirmation',
    SEND_REMINDER_24H: 'send_reminder_24h',
    SEND_REMINDER_1H: 'send_reminder_1h',
    SEND_PAYMENT_CHASE: 'send_payment_chase',
    SEND_FOLLOW_UP: 'send_follow_up',
    SEND_WELCOME: 'send_welcome',
} as const;

export type JobName = typeof JOB_NAMES[keyof typeof JOB_NAMES];
