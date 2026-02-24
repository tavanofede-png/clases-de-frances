'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const statusLabels: Record<string, string> = {
    confirmed: 'Confirmada', reserved: 'Reservada', completed: 'Completada',
    cancelled: 'Cancelada', no_show: 'No asistió',
};
const payLabels: Record<string, string> = {
    pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado',
    covered_by_pack: 'Pack', refunded: 'Reembolsado', failed: 'Fallido',
};
const statusColors: Record<string, string> = {
    confirmed: 'bg-emerald-50 text-emerald-700', reserved: 'bg-amber-50 text-amber-700',
    completed: 'bg-blue-50 text-blue-700', cancelled: 'bg-red-50 text-red-700',
    no_show: 'bg-red-50 text-red-700', pending: 'bg-gray-100 text-gray-600',
    approved: 'bg-emerald-50 text-emerald-700', covered_by_pack: 'bg-primary-50 text-primary-700',
    rejected: 'bg-red-50 text-red-700', failed: 'bg-red-50 text-red-700',
};

const formatCOP = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
const fmtDate = (d: string) => new Date(d).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtTime = (d: string) => new Date(d).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

export default function DashboardPage({ params }: { params: { tenantSlug: string } }) {
    const [tab, setTab] = useState<'agenda' | 'students' | 'payments' | 'config' | 'reports'>('agenda');
    const [lessons, setLessons] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [reports, setReports] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const router = useRouter();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    useEffect(() => {
        const token = localStorage.getItem('token');
        const stored = localStorage.getItem('user');
        if (!token || !stored) { router.push(`/t/${params.tenantSlug}/login`); return; }
        const u = JSON.parse(stored);
        if (u.role !== 'tenant_admin' && u.role !== 'super_admin') {
            router.push(`/t/${params.tenantSlug}/portal`);
            return;
        }
        setUser(u);
        loadData(token);
    }, [params.tenantSlug]);

    const loadData = async (token: string) => {
        const headers = { Authorization: `Bearer ${token}` };
        const [lRes, sRes, pRes, rRes] = await Promise.all([
            fetch(`${apiUrl}/t/${params.tenantSlug}/admin/lessons`, { headers }).then(r => r.json()),
            fetch(`${apiUrl}/t/${params.tenantSlug}/admin/students`, { headers }).then(r => r.json()),
            fetch(`${apiUrl}/t/${params.tenantSlug}/admin/payments`, { headers }).then(r => r.json()),
            fetch(`${apiUrl}/t/${params.tenantSlug}/admin/reports/summary`, { headers }).then(r => r.json()),
        ]);
        if (lRes.ok) setLessons(lRes.data);
        if (sRes.ok) setStudents(sRes.data);
        if (pRes.ok) setPayments(pRes.data);
        if (rRes.ok) setReports(rRes.data);
    };

    const handleLogout = () => { localStorage.clear(); router.push(`/t/${params.tenantSlug}/login`); };

    const handleMarkStatus = async (lessonId: string, status: string) => {
        const token = localStorage.getItem('token');
        await fetch(`${apiUrl}/t/${params.tenantSlug}/admin/lessons/${lessonId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ status }),
        });
        loadData(token!);
    };

    const tabs = [
        { key: 'agenda' as const, label: '📅 Agenda', count: lessons.filter(l => ['confirmed', 'reserved'].includes(l.status)).length },
        { key: 'students' as const, label: '👥 Alumnos', count: students.length },
        { key: 'payments' as const, label: '💳 Pagos', count: payments.length },
        { key: 'reports' as const, label: '📊 Reportes' },
        { key: 'config' as const, label: '⚙️ Config' },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Sidebar / Header */}
            <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-sm">F</div>
                        <span className="font-bold text-gray-900 hidden sm:block">Dashboard</span>
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto">
                        {tabs.map(t => (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${tab === t.key ? 'bg-primary-50 text-primary-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                {t.label} {t.count !== undefined && <span className="text-xs ml-1">({t.count})</span>}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500 hidden md:block">{user?.name}</span>
                        <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-600">Salir</button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* ═══ Agenda ═══ */}
                {tab === 'agenda' && (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Agenda de clases</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left text-xs text-gray-400 font-medium py-3 px-4">Fecha</th>
                                        <th className="text-left text-xs text-gray-400 font-medium py-3 px-4">Hora</th>
                                        <th className="text-left text-xs text-gray-400 font-medium py-3 px-4">Alumno</th>
                                        <th className="text-left text-xs text-gray-400 font-medium py-3 px-4">Tipo</th>
                                        <th className="text-left text-xs text-gray-400 font-medium py-3 px-4">Estado</th>
                                        <th className="text-left text-xs text-gray-400 font-medium py-3 px-4">Pago</th>
                                        <th className="text-left text-xs text-gray-400 font-medium py-3 px-4">Meet</th>
                                        <th className="text-left text-xs text-gray-400 font-medium py-3 px-4">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lessons.map(l => (
                                        <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                                            <td className="py-3 px-4 text-sm text-gray-900">{fmtDate(l.startsAt)}</td>
                                            <td className="py-3 px-4 text-sm text-gray-600">{fmtTime(l.startsAt)}</td>
                                            <td className="py-3 px-4">
                                                <p className="text-sm font-medium text-gray-900">{l.student?.user?.name}</p>
                                                <p className="text-xs text-gray-400">{l.student?.user?.email}</p>
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-600">{l.lessonType?.name}</td>
                                            <td className="py-3 px-4"><span className={`badge ${statusColors[l.status] || ''}`}>{statusLabels[l.status]}</span></td>
                                            <td className="py-3 px-4"><span className={`badge ${statusColors[l.paymentStatus] || ''}`}>{payLabels[l.paymentStatus]}</span></td>
                                            <td className="py-3 px-4">
                                                {l.meetingJoinUrl && (
                                                    <a href={l.meetingJoinUrl} target="_blank" rel="noopener" className="text-xs text-primary-600 hover:text-primary-700">Link →</a>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex gap-1">
                                                    {l.status === 'confirmed' && (
                                                        <>
                                                            <button onClick={() => handleMarkStatus(l.id, 'completed')} className="text-xs text-emerald-600 hover:underline">✓</button>
                                                            <button onClick={() => handleMarkStatus(l.id, 'no_show')} className="text-xs text-red-500 hover:underline ml-2">NS</button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {lessons.length === 0 && <p className="text-center text-gray-400 py-8">Sin clases registradas.</p>}
                        </div>
                    </div>
                )}

                {/* ═══ Students ═══ */}
                {tab === 'students' && (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Alumnos</h2>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {students.map((s: any) => (
                                <div key={s.id} className="card hover:shadow-xl transition-all hover:-translate-y-0.5">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold">
                                            {s.user.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 text-sm">{s.user.name}</p>
                                            <p className="text-xs text-gray-400">{s.user.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap mb-3">
                                        {s.level && <span className="badge badge-confirmed">{s.level}</span>}
                                        <span className={`badge ${s.isActive ? 'badge-confirmed' : 'badge-cancelled'}`}>
                                            {s.isActive ? 'Activo' : 'Inactivo'}
                                        </span>
                                        <span className="badge badge-pending">{s._count.lessons} clases</span>
                                    </div>
                                    {s.objectives && <p className="text-xs text-gray-500 mb-2">🎯 {s.objectives.substring(0, 80)}...</p>}
                                    {s.packs.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-gray-50">
                                            {s.packs.map((p: any) => (
                                                <p key={p.id} className="text-xs text-primary-600">📦 {p.lessonType.name}: {p.totalCredits - p.usedCredits} créditos</p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ═══ Payments ═══ */}
                {tab === 'payments' && (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Pagos</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left text-xs text-gray-400 font-medium py-3 px-4">Fecha</th>
                                        <th className="text-left text-xs text-gray-400 font-medium py-3 px-4">Alumno</th>
                                        <th className="text-left text-xs text-gray-400 font-medium py-3 px-4">Clase</th>
                                        <th className="text-left text-xs text-gray-400 font-medium py-3 px-4">Monto</th>
                                        <th className="text-left text-xs text-gray-400 font-medium py-3 px-4">Estado</th>
                                        <th className="text-left text-xs text-gray-400 font-medium py-3 px-4">Referencia</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {payments.map((p: any) => (
                                        <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                            <td className="py-3 px-4 text-sm">{new Date(p.createdAt).toLocaleDateString('es-CO')}</td>
                                            <td className="py-3 px-4 text-sm">{p.lesson?.student?.user?.name || '—'}</td>
                                            <td className="py-3 px-4 text-sm">{p.lesson?.lessonType?.name || '—'}</td>
                                            <td className="py-3 px-4 text-sm font-semibold">{formatCOP(p.amount)}</td>
                                            <td className="py-3 px-4"><span className={`badge ${statusColors[p.status] || ''}`}>{payLabels[p.status]}</span></td>
                                            <td className="py-3 px-4 text-xs text-gray-400 font-mono">{p.providerReference || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {payments.length === 0 && <p className="text-center text-gray-400 py-8">Sin pagos registrados.</p>}
                        </div>
                    </div>
                )}

                {/* ═══ Reports ═══ */}
                {tab === 'reports' && reports && (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Reportes</h2>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            {[
                                { label: 'Ingresos este mes', value: formatCOP(reports.thisMonthIncome), icon: '💰', color: 'from-emerald-500 to-emerald-700' },
                                { label: 'Clases este mes', value: reports.lessonsThisMonth, icon: '📅', color: 'from-blue-500 to-blue-700' },
                                { label: 'Alumnos activos', value: reports.activeStudents, icon: '👥', color: 'from-primary-500 to-primary-700' },
                                { label: 'Ocupación semanal', value: `${reports.occupationRate}%`, icon: '📊', color: 'from-accent-500 to-accent-700' },
                            ].map((r, i) => (
                                <div key={i} className="card relative overflow-hidden">
                                    <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${r.color} opacity-10 rounded-bl-full`}></div>
                                    <span className="text-2xl mb-2 block">{r.icon}</span>
                                    <p className="text-2xl font-bold text-gray-900">{r.value}</p>
                                    <p className="text-xs text-gray-400 mt-1">{r.label}</p>
                                </div>
                            ))}
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="card">
                                <h3 className="font-semibold text-gray-900 mb-3">Detalle</h3>
                                <div className="space-y-2 text-sm text-gray-600">
                                    <div className="flex justify-between"><span>Ingresos mes pasado</span><span className="font-medium">{formatCOP(reports.lastMonthIncome)}</span></div>
                                    <div className="flex justify-between"><span>Transacciones este mes</span><span className="font-medium">{reports.thisMonthTransactions}</span></div>
                                    <div className="flex justify-between"><span>Próximas (esta semana)</span><span className="font-medium">{reports.upcomingThisWeek}</span></div>
                                    <div className="flex justify-between"><span>Capacidad semanal (slots)</span><span className="font-medium">{reports.weeklyCapacity}</span></div>
                                </div>
                            </div>
                            <div className="card">
                                <h3 className="font-semibold text-gray-900 mb-3">Accesos rápidos</h3>
                                <div className="space-y-2">
                                    <a href={`/t/${params.tenantSlug}`} target="_blank" className="block text-sm text-primary-600 hover:text-primary-700">🌐 Ver landing pública →</a>
                                    <button onClick={() => setTab('config')} className="block text-sm text-primary-600 hover:text-primary-700">⚙️ Configuración →</button>
                                    <button onClick={() => setTab('students')} className="block text-sm text-primary-600 hover:text-primary-700">👥 Ver alumnos →</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ═══ Config ═══ */}
                {tab === 'config' && (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Configuración</h2>
                        <div className="grid sm:grid-cols-2 gap-6">
                            <div className="card">
                                <h3 className="font-semibold text-gray-900 mb-4">📋 Políticas</h3>
                                <div className="space-y-3 text-sm text-gray-600">
                                    <p>• Reprogramación: mínimo 24h antes</p>
                                    <p>• Cancelación: mínimo 24h antes</p>
                                    <p>• No-show: se consume crédito del pack</p>
                                    <p>• Pago requerido para confirmar: Sí</p>
                                </div>
                            </div>
                            <div className="card">
                                <h3 className="font-semibold text-gray-900 mb-4">📅 Disponibilidad</h3>
                                <div className="space-y-2 text-sm text-gray-600">
                                    <p>Lun–Vie: 09:00 – 18:00</p>
                                    <p>Slot: 60 minutos</p>
                                    <p>Timezone: America/Bogota (UTC-5)</p>
                                </div>
                            </div>
                            <div className="card">
                                <h3 className="font-semibold text-gray-900 mb-4">💳 Integraciones</h3>
                                <div className="space-y-2 text-sm text-gray-600">
                                    <p>Wompi: Configurar keys en .env</p>
                                    <p>Google Calendar: Configurar OAuth</p>
                                    <p>Email (Resend): Configurar API key</p>
                                </div>
                            </div>
                            <div className="card">
                                <h3 className="font-semibold text-gray-900 mb-4">🎨 Branding</h3>
                                <div className="space-y-2 text-sm text-gray-600">
                                    <p>Color primario: <span className="inline-block w-4 h-4 rounded bg-primary-500 align-middle"></span> #6366f1</p>
                                    <p>Color acento: <span className="inline-block w-4 h-4 rounded bg-accent-500 align-middle"></span> #f59e0b</p>
                                    <p>WhatsApp: Configurar número</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
