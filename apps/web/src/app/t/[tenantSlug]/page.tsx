'use client';

import { useState, useEffect } from 'react';
import Webchat from '@/components/Webchat';

interface TenantInfo {
    name: string;
    slug: string;
    heroTitle: string;
    heroSubtitle: string;
    aboutText: string;
    whatsappNumber: string;
    primaryColor: string;
    lessonTypes: Array<{
        id: string;
        name: string;
        description: string;
        durationMin: number;
        priceAmount: number;
        currency: string;
        isPackType: boolean;
        packSize: number | null;
    }>;
}

function formatCOP(amount: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
}

const testimonials = [
    { name: 'Andrea M.', text: 'Las clases con la profe son increíbles. En 3 meses ya puedo mantener conversaciones básicas en francés.', level: 'A2' },
    { name: 'Sebastián R.', text: 'La metodología es muy práctica. Se nota que la profe ama enseñar y se adapta a tu ritmo.', level: 'B1' },
    { name: 'Valentina G.', text: 'Reservar y pagar es super fácil. Las clases por Meet funcionan perfecto.', level: 'A1' },
];

const faqs = [
    { q: '¿Cómo son las clases?', a: 'Las clases son 100% online, individuales, por Google Meet. Recibes el link antes de cada clase.' },
    { q: '¿Necesito experiencia previa?', a: 'No, tenemos clases para todos los niveles, desde principiante (A1) hasta avanzado (C2).' },
    { q: '¿Qué pasa si no puedo asistir?', a: 'Puedes reprogramar o cancelar tu clase con al menos 24 horas de anticipación sin costo.' },
    { q: '¿Cómo funciona el pago?', a: 'Aceptamos pagos en línea con Wompi (PSE, tarjeta débito/crédito, Nequi). Todo en pesos colombianos.' },
    { q: '¿Los packs tienen vencimiento?', a: 'Sí, los packs de clases tienen validez de 90 días desde la compra.' },
    { q: '¿Puedo tomar una clase de prueba?', a: '¡Sí! Ofrecemos una clase de prueba de 30 minutos para que conozcas nuestra metodología.' },
];

const levels = [
    { code: 'A1', name: 'Principiante', desc: 'Primeros pasos en francés' },
    { code: 'A2', name: 'Elemental', desc: 'Conversaciones básicas' },
    { code: 'B1', name: 'Intermedio', desc: 'Independencia comunicativa' },
    { code: 'B2', name: 'Intermedio alto', desc: 'Fluidez y precisión' },
    { code: 'C1', name: 'Avanzado', desc: 'Dominio operativo eficaz' },
    { code: 'C2', name: 'Maestría', desc: 'Nivel nativo' },
];

export default function TenantLanding({ params }: { params: { tenantSlug: string } }) {
    const [info, setInfo] = useState<TenantInfo | null>(null);
    const [showLeadForm, setShowLeadForm] = useState(false);
    const [leadForm, setLeadForm] = useState({ name: '', phone: '', email: '', objective: '' });
    const [leadSent, setLeadSent] = useState(false);
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    useEffect(() => {
        fetch(`${apiUrl}/t/${params.tenantSlug}/public/info`)
            .then(r => r.json())
            .then(r => { if (r.ok) setInfo(r.data); })
            .catch(console.error);
    }, [params.tenantSlug, apiUrl]);

    const handleLeadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await fetch(`${apiUrl}/t/${params.tenantSlug}/public/leads`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(leadForm),
            });
            setLeadSent(true);
        } catch (err) {
            console.error(err);
        }
    };

    const waLink = info?.whatsappNumber
        ? `https://wa.me/${info.whatsappNumber.replace('+', '')}?text=Hola%2C%20quiero%20información%20sobre%20clases%20de%20francés`
        : '#';

    const regularTypes = info?.lessonTypes.filter(t => !t.isPackType) || [];
    const packTypes = info?.lessonTypes.filter(t => t.isPackType) || [];

    return (
        <div className="min-h-screen bg-white">
            {/* ─── Navbar ──────────────────────── */}
            <nav className="fixed top-0 w-full z-50 backdrop-blur-2xl bg-white/70 border-b border-white/20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-900 flex items-center justify-center text-accent-400 font-bold text-lg shadow-lg shadow-primary-900/20 border border-primary-800/50">F</div>
                        <span className="font-extrabold text-xl text-primary-900 tracking-tight">{info?.name || 'Cargando...'}</span>
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-500">
                        <a href="#beneficios" className="hover:text-primary-600 transition-colors">Beneficios</a>
                        <a href="#niveles" className="hover:text-primary-600 transition-colors">Niveles</a>
                        <a href="#precios" className="hover:text-primary-600 transition-colors">Precios</a>
                        <a href="#testimonios" className="hover:text-primary-600 transition-colors">Testimonios</a>
                        <a href="#faq" className="hover:text-primary-600 transition-colors">FAQ</a>
                    </div>
                    <div className="flex items-center gap-4">
                        <a href={`/t/${params.tenantSlug}/login`} className="text-sm font-semibold text-primary-700 hover:text-primary-900 transition-colors">Iniciar sesión</a>
                        <a href={`/t/${params.tenantSlug}/book`} className="btn-primary !py-2.5 !px-5 text-sm">
                            Reservar clase
                        </a>
                    </div>
                </div>
            </nav>

            {/* ─── Hero ────────────────────────── */}
            <section className="pt-40 pb-28 px-4 relative overflow-hidden bg-slate-50">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]"></div>
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-accent-200/20 via-primary-100/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-primary-200/30 to-transparent rounded-full blur-3xl translate-y-1/3 -translate-x-1/4"></div>

                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-sm border border-primary-200/50 text-primary-700 text-sm font-medium mb-8 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-accent-500 animate-pulse"></span>
                        Clases 100% online por Google Meet
                    </div>
                    <h1 className="text-5xl md:text-7xl font-extrabold text-primary-900 tracking-tight leading-[1.1] mb-8">
                        {info?.heroTitle || 'Domina el francés con clases diseñadas para ti.'}
                    </h1>
                    <p className="text-xl md:text-2xl text-slate-600 max-w-2xl mx-auto mb-12 leading-relaxed font-light">
                        {info?.heroSubtitle || 'Aprende francés desde la comodidad de tu hogar con una profesora certificada y metodología comunicativa.'}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
                        <a href={`/t/${params.tenantSlug}/book`} className="btn-primary text-lg !px-10 !py-4 shadow-xl shadow-primary-900/20">
                            Reservar clase de prueba
                        </a>
                        <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn-secondary text-lg !px-10 !py-4 bg-white/50 backdrop-blur-sm">
                            Hablemos por WhatsApp
                        </a>
                    </div>
                </div>
            </section>

            {/* ─── Beneficios ──────────────────── */}
            <section id="beneficios" className="py-24 px-4 bg-white relative">
                <div className="max-w-6xl mx-auto relative z-10">
                    <div className="text-center mb-20">
                        <h2 className="section-heading">¿Por qué aprender francés conmigo?</h2>
                        <p className="section-sub mt-6">Una metodología comunicativa y personalizada que te garantiza resultados desde la primera sesión.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { icon: '🎯', title: 'Clases personalizadas', desc: 'Cada sesión se adapta a tu nivel, objetivos y estilo de aprendizaje. No hay dos clases iguales.' },
                            { icon: '🖥️', title: '100% online', desc: 'Aprende desde cualquier lugar. Utilizamos Google Meet y material interactivo en tiempo real.' },
                            { icon: '📅', title: 'Flexibilidad total', desc: 'Elige tus horarios y reprograma fácilmente. Tu portal de alumno está disponible 24/7.' },
                            { icon: '🏆', title: 'Profesora certificada', desc: 'Aprende de una experta con más de 10 años de experiencia y certificaciones internacionales.' },
                            { icon: '💬', title: 'Habla desde el día 1', desc: 'Enfoque conversacional inmediato. Mejorarás tu pronunciación y fluidez rápidamente.' },
                            { icon: '💳', title: 'Pagos flexibles', desc: 'Invierte en tu educación de forma segura. Pagos con PSE, tarjeta, Nequi o transferencia directa.' },
                        ].map((b, i) => (
                            <div key={i} className="card group hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary-900/10 transition-all duration-500 ease-out border-transparent hover:border-primary-100">
                                <div className="w-14 h-14 rounded-2xl bg-primary-50 text-2xl flex items-center justify-center mb-6 text-primary-700 group-hover:scale-110 group-hover:bg-primary-900 group-hover:text-accent-400 transition-all duration-500">
                                    {b.icon}
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-3">{b.title}</h3>
                                <p className="text-slate-500 leading-relaxed">{b.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── Niveles ─────────────────────── */}
            <section id="niveles" className="py-24 px-4 bg-slate-50 relative border-t border-slate-200/50">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="section-heading">Niveles de francés</h2>
                        <p className="section-sub mt-4">Marco Común Europeo de Referencia (MCER)</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                        {levels.map((l) => (
                            <div key={l.code} className="card-glass text-center hover:bg-white transition-all duration-300 hover:shadow-2xl hover:shadow-primary-900/5 cursor-default relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-accent-200/20 to-transparent rounded-bl-full -z-10 group-hover:scale-150 transition-transform duration-500"></div>
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-800 to-primary-900 flex items-center justify-center text-accent-400 font-extrabold text-2xl mx-auto mb-4 shadow-lg shadow-primary-900/20">
                                    {l.code}
                                </div>
                                <h4 className="font-bold text-slate-900 text-sm mb-1">{l.name}</h4>
                                <p className="text-xs text-slate-500 font-medium">{l.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── Precios ─────────────────────── */}
            <section id="precios" className="py-24 px-4 bg-white">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="section-heading">Invierte en tu futuro</h2>
                        <p className="section-sub mt-4">Todos los precios en pesos colombianos (COP)</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[...regularTypes, ...packTypes].map((t, i) => (
                            <div
                                key={t.id}
                                className={`relative transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${i === 1 ? 'z-10 scale-105 card-premium ring-4 ring-primary-100' : 'card'
                                    }`}
                            >
                                {i === 1 && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-accent-500 text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-1.5 uppercase tracking-wide">
                                        <span>💎</span> Recomendado
                                    </div>
                                )}
                                <h3 className={`font-bold text-xl mb-2 ${i === 1 ? 'text-white' : 'text-slate-900'}`}>{t.name}</h3>
                                <p className={`text-sm mb-6 max-w-[200px] leading-relaxed ${i === 1 ? 'text-primary-200' : 'text-slate-500'}`}>{t.description}</p>
                                <div className="mb-6 flex items-baseline gap-1">
                                    <span className={`text-4xl font-extrabold tracking-tight ${i === 1 ? 'text-white' : 'text-slate-900'}`}>{formatCOP(t.priceAmount)}</span>
                                    {t.isPackType && <span className={`text-sm font-medium ${i === 1 ? 'text-primary-300' : 'text-slate-400'}`}>/ {t.packSize} clases</span>}
                                </div>
                                <div className={`flex flex-col gap-3 text-sm font-medium mb-8 ${i === 1 ? 'text-primary-100' : 'text-slate-600'}`}>
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1 rounded-md ${i === 1 ? 'bg-primary-400/20 text-accent-400' : 'bg-primary-50 text-primary-600'}`}>⏱️</div>
                                        <span>Duración: {t.durationMin} min</span>
                                    </div>
                                    {t.isPackType && (
                                        <div className="flex items-center gap-2">
                                            <div className={`p-1 rounded-md ${i === 1 ? 'bg-primary-400/20 text-accent-400' : 'bg-primary-50 text-primary-600'}`}>📦</div>
                                            <span>Paquete de {t.packSize} sesiones</span>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-auto">
                                    <a
                                        href={`/t/${params.tenantSlug}/book`}
                                        className={`w-full ${i === 1
                                            ? 'btn-accent shadow-accent-500/25'
                                            : 'inline-flex items-center justify-center px-6 py-3 text-sm font-bold rounded-xl bg-slate-100 text-slate-900 hover:bg-slate-200 transition-colors'
                                            }`}
                                    >
                                        Reservar ahora
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── Testimonios ─────────────────── */}
            <section id="testimonios" className="py-24 px-4 bg-slate-50 relative border-t border-slate-200/50">
                <div className="absolute top-0 right-0 w-1/3 h-1/2 bg-gradient-to-bl from-accent-100/30 to-transparent rounded-bl-full -z-10"></div>
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="section-heading">Lo que dicen nuestros alumnos</h2>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        {testimonials.map((t, i) => (
                            <div key={i} className="card-glass border border-white/60 hover:shadow-2xl hover:shadow-primary-900/5 transition-all duration-300">
                                <div className="flex items-center gap-1 mb-6 text-accent-500 text-lg">
                                    {'★★★★★'.split('').map((_, j) => <span key={j}>★</span>)}
                                </div>
                                <p className="text-slate-600 italic mb-6 leading-relaxed">"{t.text}"</p>
                                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                    <p className="font-bold text-slate-900">{t.name}</p>
                                    <span className="badge-premium">{t.level}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── FAQ ──────────────────────────── */}
            <section id="faq" className="py-24 px-4 bg-white">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="section-heading">Preguntas frecuentes</h2>
                    </div>
                    <div className="space-y-4">
                        {faqs.map((f, i) => (
                            <div key={i} className="card-glass !p-0 overflow-hidden border border-slate-200/60 hover:border-primary-200 transition-colors duration-300">
                                <button
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-50/50 transition"
                                >
                                    <span className="font-bold text-slate-900 pr-4">{f.q}</span>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${openFaq === i ? 'bg-primary-50 text-primary-600 rotate-180' : 'bg-slate-50 text-slate-400'}`}>
                                        ▼
                                    </div>
                                </button>
                                {openFaq === i && (
                                    <div className="px-6 pb-6 pt-2 text-slate-600 leading-relaxed animate-slide-up">
                                        {f.a}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── CTA final ────────────────────── */}
            <section className="py-24 px-4 bg-primary-900 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">¿Listo para dar el primer paso?</h2>
                    <p className="text-primary-200 text-xl mb-10 max-w-2xl mx-auto font-light">
                        Reserva tu clase de prueba hoy y descubre lo fácil que es dominar el francés con el apoyo adecuado.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
                        <a
                            href={`/t/${params.tenantSlug}/book`}
                            className="btn-accent text-lg !px-10 !py-4 w-full sm:w-auto"
                        >
                            Reservar clase de prueba
                        </a>
                        <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center px-10 py-4 text-lg font-bold border border-primary-700 text-white bg-primary-800/50 hover:bg-primary-800 rounded-xl transition-all duration-300 w-full sm:w-auto"
                        >
                            Hablar por WhatsApp
                        </a>
                    </div>
                </div>
            </section>

            {/* ─── Footer ──────────────────────── */}
            <footer className="py-12 px-4 bg-[#0a0f1d] text-primary-400 text-sm text-center border-t border-white/5">
                <div className="w-12 h-12 rounded-xl bg-primary-800/50 flex items-center justify-center text-accent-500 font-bold text-xl mx-auto mb-6 border border-primary-700/50">F</div>
                <p className="font-medium">© {new Date().getFullYear()} {info?.name || 'Teach Pro'}. Todos los derechos reservados.</p>
                <p className="mt-2 text-primary-600">Clases de francés online · Profesora certificada</p>
            </footer>

            {/* ─── Lead Form Modal ─────────────── */}
            {showLeadForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="card max-w-md w-full mx-4 animate-bounce-in">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Reservar clase</h3>
                            <button onClick={() => setShowLeadForm(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
                        </div>
                        {leadSent ? (
                            <div className="text-center py-8">
                                <span className="text-5xl mb-4 block">🎉</span>
                                <h4 className="text-xl font-bold text-gray-900 mb-2">¡Gracias!</h4>
                                <p className="text-gray-500">Te contactaremos pronto para agendar tu clase.</p>
                                <button onClick={() => { setShowLeadForm(false); setLeadSent(false); }} className="btn-primary mt-6">Cerrar</button>
                            </div>
                        ) : (
                            <form onSubmit={handleLeadSubmit} className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700 mb-1 block">Nombre completo *</label>
                                    <input type="text" required className="input-field" placeholder="Tu nombre"
                                        value={leadForm.name} onChange={e => setLeadForm({ ...leadForm, name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 mb-1 block">Celular *</label>
                                    <input type="tel" required className="input-field" placeholder="+57 300 123 4567"
                                        value={leadForm.phone} onChange={e => setLeadForm({ ...leadForm, phone: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 mb-1 block">Email (opcional)</label>
                                    <input type="email" className="input-field" placeholder="tu@email.com"
                                        value={leadForm.email} onChange={e => setLeadForm({ ...leadForm, email: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 mb-1 block">¿Cuál es tu objetivo?</label>
                                    <select className="input-field"
                                        value={leadForm.objective} onChange={e => setLeadForm({ ...leadForm, objective: e.target.value })}>
                                        <option value="">Selecciona una opción</option>
                                        <option value="viaje">Viajar a un país francófono</option>
                                        <option value="trabajo">Necesidad laboral</option>
                                        <option value="estudio">Estudios / inmigración</option>
                                        <option value="cultura">Interés cultural</option>
                                        <option value="otro">Otro</option>
                                    </select>
                                </div>
                                <button type="submit" className="btn-primary w-full">Enviar solicitud</button>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* ─── Webchat ─────────────────────── */}
            <Webchat tenantSlug={params.tenantSlug} />
        </div>
    );
}
