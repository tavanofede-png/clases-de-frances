import { PrismaClient, Role, LessonStatus, PaymentStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
    return bcrypt.hashSync(password, 10);
}

async function main() {
    console.log('🌱 Seeding database...');

    // ─── Tenant ────────────────────────────────────────────
    const tenant = await prisma.tenant.upsert({
        where: { slug: 'profe-frances-co' },
        update: {},
        create: {
            slug: 'profe-frances-co',
            name: 'Profe Francés Colombia',
            timezone: 'America/Bogota',
            currency: 'COP',
            locale: 'es-CO',
            plan: 'pro',
        },
    });
    console.log(`  ✅ Tenant: ${tenant.name} (${tenant.slug})`);

    // ─── Tenant Settings ──────────────────────────────────
    await prisma.tenantSettings.upsert({
        where: { tenantId: tenant.id },
        update: {},
        create: {
            tenantId: tenant.id,
            requirePaymentToConfirm: true,
            rescheduleMinHours: 24,
            cancelMinHours: 24,
            noShowConsumeCredit: true,
            heroTitle: 'Clases de francés online en Colombia',
            heroSubtitle: 'Aprende francés desde la comodidad de tu hogar con clases personalizadas por Google Meet.',
            aboutText: 'Soy profesora de francés certificada con más de 10 años de experiencia. Mis clases son 100% online, personalizadas a tu nivel y objetivos. Utilizo una metodología comunicativa que te permite hablar desde la primera clase.',
            whatsappNumber: '+573001234567',
            emailFrom: 'clases@profefrances.co',
            primaryColor: '#6366f1',
            secondaryColor: '#f59e0b',
            confirmationTemplate: '¡Hola {{studentName}}! Tu clase de francés está confirmada para el {{date}} a las {{time}} (hora Colombia). Link de Meet: {{meetUrl}}',
            reminder24hTemplate: '¡Hola {{studentName}}! Te recordamos que mañana tienes clase de francés a las {{time}} (hora Colombia). Link: {{meetUrl}}',
            reminder1hTemplate: '¡{{studentName}}, tu clase de francés empieza en 1 hora! Conéctate aquí: {{meetUrl}}',
            pendingPaymentTemplate: '¡Hola {{studentName}}! Tienes un pago pendiente de {{amount}} COP por tu clase del {{date}}. Paga aquí: {{checkoutUrl}}',
            followUpTemplate: '¡Hola {{studentName}}! ¿Cómo te fue en la clase de hoy? Si quieres continuar aprendiendo, reserva tu próxima clase aquí: {{bookingUrl}}',
        },
    });
    console.log('  ✅ Tenant Settings');

    // ─── Super Admin ───────────────────────────────────────
    const superAdmin = await prisma.user.upsert({
        where: { email: 'admin@teachpro.app' },
        update: {},
        create: {
            email: 'admin@teachpro.app',
            passwordHash: hashPassword('Admin123!'),
            name: 'Super Admin',
            role: Role.super_admin,
            timezone: 'America/Bogota',
        },
    });
    console.log(`  ✅ Super Admin: ${superAdmin.email}`);

    // ─── Tenant Admin (Profesora) ──────────────────────────
    const teacher = await prisma.user.upsert({
        where: { email: 'profe@profefrances.co' },
        update: {},
        create: {
            tenantId: tenant.id,
            email: 'profe@profefrances.co',
            passwordHash: hashPassword('Profe123!'),
            name: 'Marie Dupont',
            role: Role.tenant_admin,
            phone: '+573001234567',
            timezone: 'America/Bogota',
        },
    });
    console.log(`  ✅ Profesora: ${teacher.email}`);

    // ─── Lesson Types ─────────────────────────────────────
    const trialType = await prisma.lessonType.create({
        data: {
            tenantId: tenant.id,
            name: 'Clase de prueba',
            description: 'Clase introductoria de 30 minutos para conocernos y evaluar tu nivel.',
            durationMin: 30,
            priceAmount: 25000,
            currency: 'COP',
            sortOrder: 1,
        },
    });

    const regularType = await prisma.lessonType.create({
        data: {
            tenantId: tenant.id,
            name: 'Clase regular',
            description: 'Clase individual de 60 minutos adaptada a tu nivel y objetivos.',
            durationMin: 60,
            priceAmount: 60000,
            currency: 'COP',
            sortOrder: 2,
        },
    });

    const pack5Type = await prisma.lessonType.create({
        data: {
            tenantId: tenant.id,
            name: 'Pack 5 clases',
            description: 'Paquete de 5 clases de 60 minutos con 10% de descuento.',
            durationMin: 60,
            priceAmount: 270000,
            currency: 'COP',
            isPackType: true,
            packSize: 5,
            sortOrder: 3,
        },
    });

    const pack10Type = await prisma.lessonType.create({
        data: {
            tenantId: tenant.id,
            name: 'Pack 10 clases',
            description: 'Paquete de 10 clases de 60 minutos con 20% de descuento.',
            durationMin: 60,
            priceAmount: 480000,
            currency: 'COP',
            isPackType: true,
            packSize: 10,
            sortOrder: 4,
        },
    });
    console.log('  ✅ Lesson Types: prueba, regular, pack5, pack10');

    // ─── Availability Rules (Lun-Vie 09:00-18:00) ─────────
    for (let day = 1; day <= 5; day++) {
        await prisma.availabilityRule.create({
            data: {
                tenantId: tenant.id,
                weekday: day,
                startTime: '09:00',
                endTime: '18:00',
                slotMinutes: 60,
            },
        });
    }
    console.log('  ✅ Availability: Lun-Vie 09:00-18:00');

    // ─── Students ──────────────────────────────────────────
    const studentUser1 = await prisma.user.upsert({
        where: { email: 'carlos@example.com' },
        update: {},
        create: {
            tenantId: tenant.id,
            email: 'carlos@example.com',
            passwordHash: hashPassword('Student123!'),
            name: 'Carlos Rodríguez',
            role: Role.student,
            phone: '+573009876543',
            timezone: 'America/Bogota',
        },
    });

    const student1 = await prisma.student.upsert({
        where: { userId: studentUser1.id },
        update: {},
        create: {
            tenantId: tenant.id,
            userId: studentUser1.id,
            level: 'A1',
            objectives: 'Quiero aprender francés para viajar a Francia el próximo año.',
            internalNotes: 'Motivado, prefiere clases en la mañana.',
        },
    });

    const studentUser2 = await prisma.user.upsert({
        where: { email: 'lucia@example.com' },
        update: {},
        create: {
            tenantId: tenant.id,
            email: 'lucia@example.com',
            passwordHash: hashPassword('Student123!'),
            name: 'Lucía Martínez',
            role: Role.student,
            phone: '+573005551234',
            timezone: 'America/Bogota',
        },
    });

    const student2 = await prisma.student.upsert({
        where: { userId: studentUser2.id },
        update: {},
        create: {
            tenantId: tenant.id,
            userId: studentUser2.id,
            level: 'B1',
            objectives: 'Necesito francés para mi trabajo en una empresa multinacional.',
            internalNotes: 'Nivel intermedio. Prefiere horario de tarde.',
        },
    });
    console.log('  ✅ Students: Carlos (A1), Lucía (B1)');

    // ─── Pack for student 2 ─────────────────────────────
    const pack = await prisma.pack.create({
        data: {
            tenantId: tenant.id,
            studentId: student2.id,
            lessonTypeId: pack5Type.id,
            totalCredits: 5,
            usedCredits: 1,
            expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        },
    });
    console.log('  ✅ Pack 5 for Lucía (4 credits remaining)');

    // ─── Demo Lessons ──────────────────────────────────────
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    dayAfter.setHours(14, 0, 0, 0);

    await prisma.lesson.create({
        data: {
            tenantId: tenant.id,
            studentId: student1.id,
            lessonTypeId: trialType.id,
            startsAt: tomorrow,
            endsAt: new Date(tomorrow.getTime() + 30 * 60 * 1000),
            status: LessonStatus.confirmed,
            paymentStatus: PaymentStatus.approved,
            meetingJoinUrl: 'https://meet.google.com/demo-abc-xyz',
        },
    });

    await prisma.lesson.create({
        data: {
            tenantId: tenant.id,
            studentId: student2.id,
            lessonTypeId: regularType.id,
            startsAt: dayAfter,
            endsAt: new Date(dayAfter.getTime() + 60 * 60 * 1000),
            status: LessonStatus.confirmed,
            paymentStatus: PaymentStatus.covered_by_pack,
            packId: pack.id,
        },
    });

    await prisma.packLedger.create({
        data: {
            tenantId: tenant.id,
            packId: pack.id,
            delta: -1,
            reason: 'booking',
        },
    });

    console.log('  ✅ 2 demo lessons created');

    // ─── Feature Flags ─────────────────────────────────────
    await prisma.featureFlag.createMany({
        data: [
            { tenantId: tenant.id, key: 'webchat_enabled', value: true },
            { tenantId: tenant.id, key: 'whatsapp_enabled', value: false },
            { tenantId: tenant.id, key: 'stripe_enabled', value: false },
        ],
        skipDuplicates: true,
    });
    console.log('  ✅ Feature Flags');

    console.log('\n🎉 Seed complete!');
    console.log('────────────────────────────────────────');
    console.log('  Super Admin:  admin@teachpro.app / Admin123!');
    console.log('  Profesora:    profe@profefrances.co / Profe123!');
    console.log('  Alumno 1:     carlos@example.com / Student123!');
    console.log('  Alumno 2:     lucia@example.com / Student123!');
    console.log('  Tenant slug:  profe-frances-co');
    console.log('────────────────────────────────────────');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
