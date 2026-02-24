'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
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

/* ═══════════════════════════════════════════════════════
   CONTENT DATA
   ═══════════════════════════════════════════════════════ */

const testimonials = [
    { name: 'Andrea M.', text: 'Las clases con la profe son increíbles. En 3 meses ya puedo mantener conversaciones básicas en francés. La metodología es muy práctica y dinámica.', level: 'A2', avatar: '👩🏻' },
    { name: 'Sebastián R.', text: 'La metodología comunicativa es clave. Desde la primera clase comencé a hablar en francés. La profe se adapta perfectamente a tu ritmo y objetivos.', level: 'B1', avatar: '👨🏽' },
    { name: 'Valentina G.', text: 'Reservar y pagar es super fácil. Las clases por Meet funcionan perfecto y el material que envía es excelente. ¡100% recomendado!', level: 'A1', avatar: '👩🏽' },
    { name: 'Carlos D.', text: 'Necesitaba francés para mi trabajo y en 6 meses logré el nivel B1. Las clases personalizadas hacen toda la diferencia.', level: 'B1', avatar: '👨🏻' },
    { name: 'Laura P.', text: 'El seguimiento es increíble. La profe te envía material extra, te corrige y te motiva constantemente. Nunca te sientes solo en el proceso.', level: 'A2', avatar: '👩🏼' },
    { name: 'Miguel A.', text: 'Lo mejor es la flexibilidad. Puedo tomar clases desde cualquier lugar y reprogramar si tengo algún inconveniente. Perfecto para mi agenda.', level: 'A1', avatar: '👨🏻' },
];

const faqs = [
    { q: '¿Cómo son las clases?', a: 'Las clases son 100% online, individuales o en grupos reducidos, por Google Meet. Recibes el link antes de cada sesión. Cada clase está diseñada con material interactivo, ejercicios prácticos y conversación en tiempo real.' },
    { q: '¿Necesito experiencia previa en francés?', a: 'No, tenemos clases para todos los niveles, desde principiante absoluto (A1) hasta avanzado (C2). Empezamos desde lo más básico si es necesario.' },
    { q: '¿Cuál es la metodología de enseñanza?', a: 'Utilizamos un enfoque comunicativo: desde la primera clase empezarás a hablar en francés. Combinamos gramática práctica, vocabulario contextualizado, ejercicios de pronunciación y conversación libre para que desarrolles todas las competencias al mismo tiempo.' },
    { q: '¿Qué material voy a recibir?', a: 'Recibirás material personalizado antes y después de cada clase: fichas de vocabulario, ejercicios de gramática, audios para practicar comprensión oral y tareas semanales para reforzar lo aprendido.' },
    { q: '¿Qué pasa si no puedo asistir a una clase?', a: 'Puedes reprogramar o cancelar tu clase con al menos 24 horas de anticipación sin costo alguno. Entendemos que la vida es impredecible y queremos que tengas total flexibilidad.' },
    { q: '¿Cómo funciona el pago?', a: 'Aceptamos pagos en línea seguros con Wompi (PSE, tarjeta débito/crédito, Nequi). Todo en pesos colombianos. También puedes optar por paquetes de clases con descuento.' },
    { q: '¿Los paquetes de clases tienen vencimiento?', a: 'Sí, los paquetes tienen validez de 90 días desde la compra. Es tiempo más que suficiente para completar todas tus sesiones a un ritmo cómodo.' },
    { q: '¿Puedo tomar una clase de prueba?', a: '¡Sí! Ofrecemos una clase de prueba de 30 minutos para que conozcas nuestra metodología, evalúes tu nivel y veas si te sientes cómodo con el formato. Sin compromiso.' },
    { q: '¿Cuánto tiempo necesito para avanzar un nivel?', a: 'Depende de tu dedicación. Con 2-3 clases por semana y práctica diaria, generalmente se avanza un nivel (por ejemplo, de A1 a A2) en aproximadamente 3-4 meses.' },
    { q: '¿Recibiré un certificado?', a: 'Al finalizar cada nivel, podrás solicitar una constancia de estudios que certifica tu participación y nivel alcanzado. Nuestros cursos siguen el Marco Común Europeo de Referencia (MCER).' },
    { q: '¿Para quién están diseñadas las clases?', a: 'Nuestras clases están diseñadas para adultos y jóvenes a partir de 16 años que quieran aprender francés por viaje, trabajo, estudios, inmigración o interés personal. El contenido se adapta 100% a tus objetivos.' },
    { q: '¿Es seguro pagar por la plataforma?', a: 'Absolutamente. Utilizamos Wompi, una pasarela de pago certificada y regulada en Colombia. Tus datos financieros están protegidos con encriptación de nivel bancario.' },
];

const levels = [
    { code: 'A1', name: 'Principiante', desc: 'Primeros pasos en francés', color: 'from-emerald-400 to-emerald-600' },
    { code: 'A2', name: 'Elemental', desc: 'Conversaciones básicas', color: 'from-teal-400 to-teal-600' },
    { code: 'B1', name: 'Intermedio', desc: 'Independencia comunicativa', color: 'from-blue-400 to-blue-600' },
    { code: 'B2', name: 'Intermedio alto', desc: 'Fluidez y precisión', color: 'from-indigo-400 to-indigo-600' },
    { code: 'C1', name: 'Avanzado', desc: 'Dominio operativo eficaz', color: 'from-purple-400 to-purple-600' },
    { code: 'C2', name: 'Maestría', desc: 'Nivel nativo', color: 'from-rose-400 to-rose-600' },
];

const methodology = [
    {
        icon: '💬',
        title: 'Clases en vivo personalizadas',
        desc: 'Te conectarás conmigo por Google Meet para sesiones individuales diseñadas 100% para ti. Cada clase tiene un objetivo claro y avanzamos a tu ritmo. Si necesitas reprogramar, lo hacemos sin problema.',
    },
    {
        icon: '📚',
        title: 'Material y tareas a tu medida',
        desc: 'Antes y después de cada clase recibirás fichas, ejercicios, audios y tareas diseñadas para tu nivel. No habrá un solo día sin que practiques tu francés. El material se adapta a tus intereses y objetivos.',
    },
    {
        icon: '💪',
        title: 'Seguimiento y motivación continua',
        desc: 'Te acompañaré paso a paso en tu proceso. Recibirás feedback constante, correcciones detalladas y motivación para que no pierdas el ritmo. Tu éxito es mi compromiso.',
    },
];

const howItWorks = [
    { step: '01', title: 'Reserva tu clase', desc: 'Elige el horario que mejor se adapte a tu agenda y reserva en segundos.', icon: '📅' },
    { step: '02', title: 'Recibe tu enlace', desc: 'Te llegará un correo con el link de Google Meet y el material para tu clase.', icon: '📧' },
    { step: '03', title: 'Conéctate y aprende', desc: 'Únete a tu clase en vivo. Hablarás en francés desde el primer minuto.', icon: '🎓' },
    { step: '04', title: 'Practica y avanza', desc: 'Completa tus tareas, practica con el material extra y ve tu progreso real.', icon: '🚀' },
];


export default function TenantLanding({ params }: { params: { tenantSlug: string } }) {
    const [info, setInfo] = useState<TenantInfo | null>(null);
    const [showLeadForm, setShowLeadForm] = useState(false);
    const [leadForm, setLeadForm] = useState({ name: '', phone: '', email: '', objective: '' });
    const [leadSent, setLeadSent] = useState(false);
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const [mobileMenu, setMobileMenu] = useState(false);
    const [user, setUser] = useState<{ name: string } | null>(null);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    useEffect(() => {
        const stored = localStorage.getItem('user');
        if (stored) {
            try {
                setUser(JSON.parse(stored));
            } catch (e) {
                // Ignore parsing errors
            }
        }
    }, []);

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
            {/* ═══ NAVBAR ═══════════════════════════════════ */}
            <nav className="fixed top-0 w-full z-50 backdrop-blur-2xl bg-white/80 border-b border-gray-100 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-primary-900 flex items-center justify-center text-accent-400 font-bold text-lg shadow-lg shadow-primary-900/20 border border-primary-800/50">F</div>
                        <span className="font-extrabold text-xl text-primary-900 tracking-tight" style={{ fontFamily: "'Oswald', sans-serif" }}>
                            {info?.name || 'Cargando...'}
                        </span>
                    </div>
                    <div className="hidden lg:flex items-center gap-8 text-sm font-medium text-gray-500">
                        <a href="#metodologia" className="hover:text-primary-600 transition-colors">Metodología</a>
                        <a href="#como-funciona" className="hover:text-primary-600 transition-colors">Cómo funciona</a>
                        <a href="#niveles" className="hover:text-primary-600 transition-colors">Niveles</a>
                        <a href="#precios" className="hover:text-primary-600 transition-colors">Precios</a>
                        <a href="#testimonios" className="hover:text-primary-600 transition-colors">Testimonios</a>
                        <a href="#faq" className="hover:text-primary-600 transition-colors">FAQ</a>
                    </div>
                    <div className="flex items-center gap-4">
                        {user ? (
                            <>
                                <span className="hidden sm:inline text-sm font-medium text-gray-600">Hola, {user.name}</span>
                                <a href={`/t/${params.tenantSlug}/portal`} className="hidden sm:inline text-sm font-semibold text-primary-700 hover:text-primary-900 transition-colors">Mi Portal</a>
                                <button onClick={() => { localStorage.clear(); setUser(null); }} className="hidden sm:inline text-sm font-semibold text-red-500 hover:text-red-600 transition-colors">Salir</button>
                            </>
                        ) : (
                            <a href={`/t/${params.tenantSlug}/login`} className="hidden sm:inline text-sm font-semibold text-primary-700 hover:text-primary-900 transition-colors">Iniciar sesión</a>
                        )}
                        <a href={`/t/${params.tenantSlug}/book`} className="btn-primary !py-2.5 !px-5 text-sm">
                            Reservar clase
                        </a>
                        <button onClick={() => setMobileMenu(!mobileMenu)} className="lg:hidden p-2 text-gray-600 hover:text-primary-600">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenu ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} /></svg>
                        </button>
                    </div>
                </div>
                {/* Mobile menu */}
                {mobileMenu && (
                    <div className="lg:hidden bg-white border-t border-gray-100 px-4 py-6 space-y-4 animate-slide-up">
                        {['Metodología|#metodologia', 'Cómo funciona|#como-funciona', 'Niveles|#niveles', 'Precios|#precios', 'Testimonios|#testimonios', 'FAQ|#faq'].map(item => {
                            const [label, href] = item.split('|');
                            return <a key={href} href={href} onClick={() => setMobileMenu(false)} className="block text-lg font-medium text-gray-700 hover:text-primary-600">{label}</a>;
                        })}
                        {user ? (
                            <>
                                <a href={`/t/${params.tenantSlug}/portal`} className="block text-lg font-medium text-primary-600">Mi Portal</a>
                                <button onClick={() => { localStorage.clear(); setUser(null); setMobileMenu(false); }} className="block text-lg font-medium text-red-500 w-full text-left">Salir</button>
                            </>
                        ) : (
                            <a href={`/t/${params.tenantSlug}/login`} className="block text-lg font-medium text-primary-600">Iniciar sesión</a>
                        )}
                    </div>
                )}
            </nav>

            {/* ═══ HERO ═════════════════════════════════════ */}
            <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
                {/* Background image */}
                <div className="absolute inset-0 z-0">
                    <Image src="/images/hero-teacher.png" alt="Profesora de francés" fill className="object-cover" priority />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80"></div>
                </div>

                <div className="relative z-10 max-w-5xl mx-auto px-4 text-center pt-24 pb-16">
                    <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/90 text-sm font-medium mb-10">
                        <span className="w-2.5 h-2.5 rounded-full bg-accent-400 animate-pulse"></span>
                        Clases 100% online por Google Meet
                    </div>

                    <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white uppercase tracking-tight leading-[1.05] mb-8" style={{ fontFamily: "'Oswald', sans-serif" }}>
                        {info?.heroTitle || 'DOMINA EL FRANCÉS CON CLASES DISEÑADAS PARA TI'}
                    </h1>

                    <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-3xl mx-auto mb-6 leading-relaxed font-light">
                        {info?.heroSubtitle || 'Aprende francés desde la comodidad de tu hogar con una profesora certificada y metodología comunicativa.'}
                    </p>

                    {/* Stats bar */}
                    <div className="flex flex-wrap items-center justify-center gap-8 mb-12 text-white/70">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-accent-400" style={{ fontFamily: "'Oswald', sans-serif" }}>10+</span>
                            <span className="text-sm">años de experiencia</span>
                        </div>
                        <div className="w-px h-8 bg-white/20 hidden sm:block"></div>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-accent-400" style={{ fontFamily: "'Oswald', sans-serif" }}>100%</span>
                            <span className="text-sm">online y flexible</span>
                        </div>
                        <div className="w-px h-8 bg-white/20 hidden sm:block"></div>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-accent-400" style={{ fontFamily: "'Oswald', sans-serif" }}>A1-C2</span>
                            <span className="text-sm">todos los niveles</span>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
                        <a href={`/t/${params.tenantSlug}/book`} className="btn-accent text-lg !px-10 !py-4 shadow-xl shadow-accent-500/30 w-full sm:w-auto">
                            👉 Reservar clase de prueba
                        </a>
                        <a href={waLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center px-10 py-4 text-lg font-bold border border-white/30 text-white bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-xl transition-all duration-300 w-full sm:w-auto">
                            💬 Hablemos por WhatsApp
                        </a>
                    </div>
                </div>

                {/* Scroll indicator */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
                    <div className="w-8 h-12 rounded-full border-2 border-white/30 flex items-start justify-center p-2">
                        <div className="w-1.5 h-3 rounded-full bg-white/60"></div>
                    </div>
                </div>
            </section>

            {/* ═══ ABOUT & TEACHER ══════════════════════════ */}
            <section className="py-24 px-4 bg-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-primary-50 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 opacity-50"></div>
                <div className="max-w-6xl mx-auto relative z-10">
                    <div className="grid md:grid-cols-2 gap-16 items-center">
                        {/* Image side */}
                        <div className="relative">
                            <div className="rounded-3xl overflow-hidden shadow-2xl shadow-primary-900/10 border border-gray-100">
                                <Image src="/images/online-class.png" alt="Clase de francés online" width={600} height={450} className="w-full h-auto object-cover" />
                            </div>
                            {/* Floating badge */}
                            <div className="absolute -bottom-6 -right-6 bg-white rounded-2xl shadow-xl shadow-primary-900/10 p-5 border border-gray-100">
                                <div className="text-3xl mb-1">🏆</div>
                                <div className="text-sm font-bold text-gray-900">Profesora certificada</div>
                                <div className="text-xs text-gray-500">+10 años experiencia</div>
                            </div>
                        </div>

                        {/* Text side */}
                        <div>
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 text-primary-700 text-sm font-semibold mb-6">
                                🇫🇷 Sobre la profesora
                            </div>
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 leading-tight" style={{ fontFamily: "'Oswald', sans-serif" }}>
                                UNA METODOLOGÍA QUE SÍ FUNCIONA
                            </h2>
                            <p className="text-gray-600 text-lg leading-relaxed mb-6">
                                {info?.aboutText || 'Soy profesora de francés certificada con más de 10 años de experiencia. Mis clases son 100% online, personalizadas a tu nivel y objetivos. Utilizo una metodología comunicativa que te permite hablar desde la primera clase.'}
                            </p>
                            <div className="space-y-4 mb-8">
                                {[
                                    'Metodología comunicativa: habla francés desde el día 1',
                                    'Clases adaptadas a tu nivel, ritmo y objetivos personales',
                                    'Material personalizado para cada sesión',
                                    'Flexibilidad total: elige tus horarios y reprograma fácilmente',
                                    'Portal de alumno disponible 24/7 para seguir tu progreso',
                                ].map((item, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-accent-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                        <span className="text-gray-700 font-medium">{item}</span>
                                    </div>
                                ))}
                            </div>
                            <a href="#metodologia" className="btn-primary text-base !px-8 !py-3.5">
                                Conocer más →
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ METHODOLOGY ══════════════════════════════ */}
            <section id="metodologia" className="py-24 px-4 bg-gray-50 relative border-t border-gray-200/50">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-20">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-primary-700 text-sm font-semibold mb-6 shadow-sm border border-gray-100">
                            ✨ Así aprenderás
                        </div>
                        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 uppercase tracking-tight" style={{ fontFamily: "'Oswald', sans-serif" }}>
                            METODOLOGÍA
                        </h2>
                        <p className="section-sub mt-6">Un enfoque comunicativo diseñado para que hables francés desde la primera clase.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {methodology.map((m, i) => (
                            <div key={i} className="bg-white rounded-3xl p-8 shadow-lg shadow-gray-200/50 border border-gray-100 hover:shadow-xl hover:-translate-y-2 transition-all duration-500 group">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white text-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-lg shadow-primary-500/20">
                                    {m.icon}
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-4" style={{ fontFamily: "'Oswald', sans-serif" }}>{m.title.toUpperCase()}</h3>
                                <p className="text-gray-500 leading-relaxed">{m.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ HOW IT WORKS ═════════════════════════════ */}
            <section id="como-funciona" className="py-24 px-4 bg-white relative overflow-hidden">
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-accent-100/20 to-transparent rounded-full blur-3xl translate-y-1/3 -translate-x-1/4"></div>
                <div className="max-w-6xl mx-auto relative z-10">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 uppercase tracking-tight" style={{ fontFamily: "'Oswald', sans-serif" }}>
                            ¿CÓMO FUNCIONA?
                        </h2>
                        <p className="section-sub mt-6">4 pasos simples para empezar tu camino hacia el francés.</p>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {howItWorks.map((s, i) => (
                            <div key={i} className="relative text-center group">
                                {/* Connector line */}
                                {i < howItWorks.length - 1 && (
                                    <div className="hidden lg:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary-300 to-primary-100"></div>
                                )}
                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-800 to-primary-900 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary-900/20 group-hover:scale-110 transition-transform duration-500 relative z-10">
                                    <span className="text-4xl">{s.icon}</span>
                                </div>
                                <div className="text-xs font-bold text-accent-500 uppercase tracking-widest mb-2" style={{ fontFamily: "'Oswald', sans-serif" }}>Paso {s.step}</div>
                                <h4 className="font-bold text-gray-900 text-lg mb-2">{s.title}</h4>
                                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ IMMERSIVE FRENCH SECTION ══════════════════ */}
            <section className="relative py-32 px-4 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <Image src="/images/french-materials.png" alt="Material de aprendizaje de francés" fill className="object-cover" />
                    <div className="absolute inset-0 bg-primary-900/80 backdrop-blur-sm"></div>
                </div>
                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <h2 className="text-4xl md:text-6xl font-bold text-white uppercase tracking-tight mb-8" style={{ fontFamily: "'Oswald', sans-serif" }}>
                        MATERIAL PERSONALIZADO PARA CADA CLASE
                    </h2>
                    <p className="text-xl text-white/80 leading-relaxed mb-10 max-w-2xl mx-auto">
                        Antes y después de cada sesión recibirás fichas de vocabulario, ejercicios de gramática, audios para comprensión oral y tareas diseñadas específicamente para tu nivel y objetivos.
                    </p>
                    <div className="grid sm:grid-cols-3 gap-6 text-white">
                        {[
                            { icon: '📖', text: 'Fichas de vocabulario temáticas' },
                            { icon: '🎧', text: 'Audios para comprensión oral' },
                            { icon: '✍️', text: 'Ejercicios de gramática práctica' },
                        ].map((item, i) => (
                            <div key={i} className="flex flex-col items-center gap-3 py-6 px-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
                                <span className="text-3xl">{item.icon}</span>
                                <span className="text-sm font-medium text-white/90">{item.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ LEVELS ═══════════════════════════════════ */}
            <section id="niveles" className="py-24 px-4 bg-white relative">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 uppercase tracking-tight" style={{ fontFamily: "'Oswald', sans-serif" }}>
                            NIVELES DE FRANCÉS
                        </h2>
                        <p className="section-sub mt-4">Marco Común Europeo de Referencia (MCER)</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                        {levels.map((l) => (
                            <div key={l.code} className="bg-white rounded-2xl p-6 text-center border border-gray-100 hover:shadow-2xl hover:shadow-gray-200/50 hover:-translate-y-1 transition-all duration-300 cursor-default group">
                                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${l.color} flex items-center justify-center text-white font-extrabold text-2xl mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-500`} style={{ fontFamily: "'Oswald', sans-serif" }}>
                                    {l.code}
                                </div>
                                <h4 className="font-bold text-gray-900 text-sm mb-1">{l.name}</h4>
                                <p className="text-xs text-gray-500 font-medium">{l.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ PRICING ══════════════════════════════════ */}
            <section id="precios" className="py-24 px-4 bg-gray-50 border-t border-gray-200/50">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 uppercase tracking-tight" style={{ fontFamily: "'Oswald', sans-serif" }}>
                            INVIERTE EN TU FUTURO
                        </h2>
                        <p className="section-sub mt-4">Todos los precios en pesos colombianos (COP). Sin costos ocultos.</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[...regularTypes, ...packTypes].map((t, i) => (
                            <div
                                key={t.id}
                                className={`relative transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${i === 1 ? 'z-10 scale-105 card-premium ring-4 ring-primary-100' : 'card bg-white'
                                    }`}
                            >
                                {i === 1 && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 bg-accent-500 text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-1.5 uppercase tracking-wide" style={{ fontFamily: "'Oswald', sans-serif" }}>
                                        <span>💎</span> Recomendado
                                    </div>
                                )}
                                <h3 className={`font-bold text-xl mb-2 ${i === 1 ? 'text-white' : 'text-gray-900'}`}>{t.name}</h3>
                                <p className={`text-sm mb-6 max-w-[200px] leading-relaxed ${i === 1 ? 'text-primary-200' : 'text-gray-500'}`}>{t.description}</p>
                                <div className="mb-6 flex items-baseline gap-1">
                                    <span className={`text-4xl font-extrabold tracking-tight ${i === 1 ? 'text-white' : 'text-gray-900'}`} style={{ fontFamily: "'Oswald', sans-serif" }}>{formatCOP(t.priceAmount)}</span>
                                    {t.isPackType && <span className={`text-sm font-medium ${i === 1 ? 'text-primary-300' : 'text-gray-400'}`}>/ {t.packSize} clases</span>}
                                </div>
                                <div className={`flex flex-col gap-3 text-sm font-medium mb-8 ${i === 1 ? 'text-primary-100' : 'text-gray-600'}`}>
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
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1 rounded-md ${i === 1 ? 'bg-primary-400/20 text-accent-400' : 'bg-primary-50 text-primary-600'}`}>✅</div>
                                        <span>Material incluido</span>
                                    </div>
                                </div>
                                <div className="mt-auto">
                                    <a
                                        href={`/t/${params.tenantSlug}/book`}
                                        className={`w-full ${i === 1
                                            ? 'btn-accent shadow-accent-500/25'
                                            : 'inline-flex items-center justify-center px-6 py-3 text-sm font-bold rounded-xl bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors'
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

            {/* ═══ TESTIMONIALS ══════════════════════════════ */}
            <section id="testimonios" className="py-24 px-4 bg-white relative">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 uppercase tracking-tight" style={{ fontFamily: "'Oswald', sans-serif" }}>
                            LO QUE DICEN MIS ESTUDIANTES
                        </h2>
                        <p className="section-sub mt-4">Reseñas reales de alumnos que ya están hablando francés.</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {testimonials.map((t, i) => (
                            <div key={i} className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                                <div className="flex items-center gap-1 mb-5 text-accent-500 text-lg">
                                    {'★★★★★'.split('').map((_, j) => <span key={j}>★</span>)}
                                </div>
                                <p className="text-gray-600 mb-6 leading-relaxed">&quot;{t.text}&quot;</p>
                                <div className="flex items-center justify-between pt-5 border-t border-gray-200">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{t.avatar}</span>
                                        <span className="font-bold text-gray-900">{t.name}</span>
                                    </div>
                                    <span className="badge-premium text-xs font-bold px-3 py-1">{t.level}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ STUDENT SECTION ═══════════════════════════ */}
            <section className="relative py-28 px-4 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <Image src="/images/student-studying.png" alt="Estudiante aprendiendo francés" fill className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-900/90 to-primary-900/70"></div>
                </div>
                <div className="max-w-4xl mx-auto relative z-10">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 className="text-4xl md:text-5xl font-bold text-white uppercase tracking-tight mb-6" style={{ fontFamily: "'Oswald', sans-serif" }}>
                                HABLA FRANCÉS DESDE EL DÍA UNO
                            </h2>
                            <p className="text-white/80 text-lg leading-relaxed mb-8">
                                Mi enfoque comunicativo te pone a hablar desde la primera sesión. No aprenderás solo reglas de gramática: aprenderás a comunicarte de verdad en situaciones reales.
                            </p>
                            <div className="space-y-4">
                                {[
                                    'Pronunciación guiada desde la primera clase',
                                    'Simulaciones de conversaciones reales',
                                    'Corrección inmediata y personalizada',
                                    'Progreso medible clase a clase',
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-3 text-white/90">
                                        <span className="text-accent-400">✓</span>
                                        <span className="font-medium">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="inline-block bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/10">
                                <div className="text-6xl mb-4">🎯</div>
                                <div className="text-5xl font-bold text-white mb-2" style={{ fontFamily: "'Oswald', sans-serif" }}>3-4</div>
                                <div className="text-white/70 font-medium">meses para avanzar<br />un nivel completo</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ FAQ ══════════════════════════════════════ */}
            <section id="faq" className="py-24 px-4 bg-white">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 uppercase tracking-tight" style={{ fontFamily: "'Oswald', sans-serif" }}>
                            PREGUNTAS FRECUENTES
                        </h2>
                        <p className="section-sub mt-4">Resolvemos todas tus dudas antes de empezar.</p>
                    </div>
                    <div className="space-y-4">
                        {faqs.map((f, i) => (
                            <div key={i} className="rounded-2xl overflow-hidden border border-gray-200 hover:border-primary-200 transition-colors duration-300 bg-gray-50">
                                <button
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-100/80 transition"
                                >
                                    <span className="font-bold text-gray-900 pr-4">{f.q}</span>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 flex-shrink-0 ${openFaq === i ? 'bg-primary-500 text-white rotate-45' : 'bg-gray-200 text-gray-500'}`}>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                                    </div>
                                </button>
                                {openFaq === i && (
                                    <div className="px-6 pb-6 pt-2 text-gray-600 leading-relaxed animate-slide-up bg-white border-t border-gray-100">
                                        {f.a}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ ASPIRATIONAL CTA ═════════════════════════ */}
            <section className="relative py-32 px-4 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <Image src="/images/paris-eiffel.png" alt="Torre Eiffel, París" fill className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70"></div>
                </div>
                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white uppercase tracking-tight mb-6" style={{ fontFamily: "'Oswald', sans-serif" }}>
                        ¿LISTO PARA DAR EL PRIMER PASO?
                    </h2>
                    <p className="text-xl text-white/80 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
                        Reserva tu clase de prueba hoy y descubre lo fácil que es dominar el francés con el apoyo adecuado. Tu futuro en francés empieza aquí.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
                        <a
                            href={`/t/${params.tenantSlug}/book`}
                            className="btn-accent text-lg !px-12 !py-5 w-full sm:w-auto shadow-xl"
                        >
                            👉 Reservar clase de prueba
                        </a>
                        <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center px-12 py-5 text-lg font-bold border border-white/30 text-white bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-xl transition-all duration-300 w-full sm:w-auto"
                        >
                            💬 Hablar por WhatsApp
                        </a>
                    </div>
                </div>
            </section>

            {/* ═══ FOOTER ═══════════════════════════════════ */}
            <footer className="py-16 px-4 bg-gray-900 text-gray-400 border-t border-gray-800">
                <div className="max-w-6xl mx-auto">
                    <div className="grid md:grid-cols-3 gap-12 mb-12">
                        {/* Brand */}
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-primary-800/50 flex items-center justify-center text-accent-500 font-bold text-lg border border-primary-700/50">F</div>
                                <span className="font-bold text-white text-lg" style={{ fontFamily: "'Oswald', sans-serif" }}>{info?.name || 'Profesora de Francés'}</span>
                            </div>
                            <p className="text-sm leading-relaxed text-gray-500">Clases de francés online personalizadas. Metodología comunicativa para todos los niveles.</p>
                        </div>

                        {/* Quick Links */}
                        <div>
                            <h4 className="text-white font-bold mb-4 uppercase text-sm tracking-wider" style={{ fontFamily: "'Oswald', sans-serif" }}>Enlaces rápidos</h4>
                            <div className="space-y-3 text-sm">
                                <a href="#metodologia" className="block hover:text-white transition-colors">Metodología</a>
                                <a href="#niveles" className="block hover:text-white transition-colors">Niveles</a>
                                <a href="#precios" className="block hover:text-white transition-colors">Precios</a>
                                <a href="#faq" className="block hover:text-white transition-colors">Preguntas frecuentes</a>
                            </div>
                        </div>

                        {/* Contact */}
                        <div>
                            <h4 className="text-white font-bold mb-4 uppercase text-sm tracking-wider" style={{ fontFamily: "'Oswald', sans-serif" }}>Contacto</h4>
                            <div className="space-y-3 text-sm">
                                <a href={`/t/${params.tenantSlug}/login`} className="block hover:text-white transition-colors">Portal del alumno</a>
                                <a href={`/t/${params.tenantSlug}/book`} className="block hover:text-white transition-colors">Reservar clase</a>
                                {info?.whatsappNumber && (
                                    <a href={waLink} target="_blank" rel="noopener noreferrer" className="block hover:text-white transition-colors">WhatsApp</a>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="pt-8 border-t border-gray-800 text-center text-sm">
                        <p>© {new Date().getFullYear()} {info?.name || 'Teach Pro'}. Todos los derechos reservados.</p>
                    </div>
                </div>
            </footer>

            {/* ═══ LEAD FORM MODAL ══════════════════════════ */}
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

            {/* ═══ WEBCHAT ══════════════════════════════════ */}
            <Webchat tenantSlug={params.tenantSlug} />
        </div>
    );
}
