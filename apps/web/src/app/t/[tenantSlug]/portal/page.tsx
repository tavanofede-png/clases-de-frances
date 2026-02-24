'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Lesson {
    id: string;
    startsAt: string;
    endsAt: string;
    status: string;
    paymentStatus: string;
    meetingJoinUrl: string | null;
    lessonType: { name: string; durationMin: number; priceAmount: number };
}

interface Pack {
    id: string;
    totalCredits: number;
    usedCredits: number;
    expiresAt: string | null;
    isActive: boolean;
    remainingCredits: number;
    expired: boolean;
    lessonType: { name: string };
}

const statusLabels: Record<string, string> = {
    confirmed: 'Confirmada', reserved: 'Reservada', completed: 'Completada',
    cancelled: 'Cancelada', no_show: 'No asistió',
};
const payStatusLabels: Record<string, string> = {
    pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado',
    covered_by_pack: 'Pack', refunded: 'Reembolsado',
};
const statusColors: Record<string, string> = {
    confirmed: 'bg-emerald-50 text-emerald-700', reserved: 'bg-amber-50 text-amber-700',
    completed: 'bg-blue-50 text-blue-700', cancelled: 'bg-red-50 text-red-700',
    no_show: 'bg-red-50 text-red-700', pending: 'bg-gray-100 text-gray-600',
    approved: 'bg-emerald-50 text-emerald-700', covered_by_pack: 'bg-emerald-50 text-emerald-700',
};

export default function PortalPage({ params }: { params: { tenantSlug: string } }) {
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [packs, setPacks] = useState<Pack[]>([]);
    const [tab, setTab] = useState<'upcoming' | 'history' | 'packs'>('upcoming');
    const [user, setUser] = useState<any>(null);
    const router = useRouter();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    useEffect(() => {
        const token = localStorage.getItem('token');
        const stored = localStorage.getItem('user');
        if (!token || !stored) { router.push(`/t/${params.tenantSlug}/login`); return; }
        setUser(JSON.parse(stored));

        fetch(`${apiUrl}/t/${params.tenantSlug}/me/lessons`, {
            headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json()).then(r => { if (r.ok) setLessons(r.data); });

        fetch(`${apiUrl}/t/${params.tenantSlug}/me/packs`, {
            headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json()).then(r => { if (r.ok) setPacks(r.data); });
    }, [params.tenantSlug, apiUrl, router]);

    const upcoming = lessons.filter(l => new Date(l.startsAt) > new Date() && ['confirmed', 'reserved'].includes(l.status));
    const history = lessons.filter(l => new Date(l.startsAt) <= new Date() || ['completed', 'cancelled', 'no_show'].includes(l.status));

    const handleLogout = () => {
        localStorage.clear();
        router.push(`/t/${params.tenantSlug}/login`);
    };

    const formatCOP = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
    const fmtDate = (d: string) => new Date(d).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
    const fmtTime = (d: string) => new Date(d).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

    const handleCheckout = async (lessonId: string) => {
        const token = localStorage.getItem('token');
        const res = await fetch(`${apiUrl}/t/${params.tenantSlug}/payments/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ lessonId }),
        });
        const data = await res.json();
        if (data.ok && data.data.checkoutUrl) {
            window.open(data.data.checkoutUrl, '_blank');
        }
    };

    const handleCancel = async (lessonId: string) => {
        if (!confirm('¿Seguro que quieres cancelar esta clase?')) return;
        const token = localStorage.getItem('token');
        await fetch(`${apiUrl}/t/${params.tenantSlug}/lessons/${lessonId}/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ reason: 'Cancelada por el alumno desde el portal' }),
        });
        location.reload();
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-sm">F</div>
                        <span className="font-bold text-gray-900 hidden sm:block">Mi Portal</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">{user?.name}</span>
                        <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-600">Salir</button>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 py-8">
                {/* Tabs */}
                <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-8 max-w-md">
                    {[
                        { key: 'upcoming' as const, label: 'Próximas', count: upcoming.length },
                        { key: 'history' as const, label: 'Historial', count: history.length },
                        { key: 'packs' as const, label: 'Packs', count: packs.length },
                    ].map(t => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {t.label} <span className="text-xs text-gray-400 ml-1">({t.count})</span>
                        </button>
                    ))}
                </div>

                {/* Upcoming */}
                {tab === 'upcoming' && (
                    <div className="space-y-4">
                        {upcoming.length === 0 && (
                            <div className="card text-center py-12">
                                <span className="text-4xl mb-4 block">📅</span>
                                <p className="text-gray-500">No tienes clases programadas.</p>
                                <a href={`/t/${params.tenantSlug}`} className="btn-primary mt-4 inline-block">Reservar clase</a>
                            </div>
                        )}
                        {upcoming.map(l => (
                            <div key={l.id} className="card flex flex-col sm:flex-row sm:items-center gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="font-semibold text-gray-900">{l.lessonType.name}</h3>
                                        <span className={`badge ${statusColors[l.status] || ''}`}>{statusLabels[l.status]}</span>
                                        <span className={`badge ${statusColors[l.paymentStatus] || ''}`}>{payStatusLabels[l.paymentStatus]}</span>
                                    </div>
                                    <p className="text-sm text-gray-500">
                                        📅 {fmtDate(l.startsAt)} · ⏰ {fmtTime(l.startsAt)} – {fmtTime(l.endsAt)} · ⏱️ {l.lessonType.durationMin} min
                                    </p>
                                    {l.meetingJoinUrl && l.status === 'confirmed' && (
                                        <a href={l.meetingJoinUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 mt-2">
                                            🖥️ Conectarme a la clase →
                                        </a>
                                    )}
                                </div>
                                <div className="flex gap-2 flex-shrink-0">
                                    {l.paymentStatus === 'pending' && (
                                        <button onClick={() => handleCheckout(l.id)} className="btn-primary !py-2 !px-4 text-xs">
                                            💳 Pagar
                                        </button>
                                    )}
                                    <button onClick={() => handleCancel(l.id)} className="btn-secondary !py-2 !px-4 text-xs !border-red-300 !text-red-600 hover:!bg-red-50">
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* History */}
                {tab === 'history' && (
                    <div className="space-y-3">
                        {history.length === 0 && (
                            <div className="card text-center py-12">
                                <p className="text-gray-500">Sin historial de clases.</p>
                            </div>
                        )}
                        {history.map(l => (
                            <div key={l.id} className="card !p-4 flex items-center gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-900 text-sm">{l.lessonType.name}</span>
                                        <span className={`badge text-xs ${statusColors[l.status] || ''}`}>{statusLabels[l.status]}</span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">{fmtDate(l.startsAt)} · {fmtTime(l.startsAt)}</p>
                                </div>
                                <span className="text-sm font-semibold text-gray-600">{formatCOP(l.lessonType.priceAmount)}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Packs */}
                {tab === 'packs' && (
                    <div className="grid sm:grid-cols-2 gap-6">
                        {packs.length === 0 && (
                            <div className="card text-center py-12 col-span-2">
                                <span className="text-4xl mb-4 block">📦</span>
                                <p className="text-gray-500">No tienes packs activos.</p>
                            </div>
                        )}
                        {packs.map(p => (
                            <div key={p.id} className={`card ${p.expired ? 'opacity-50' : ''}`}>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-gray-900">{p.lessonType.name}</h3>
                                    <span className={`badge ${p.isActive && !p.expired ? 'badge-confirmed' : 'badge-cancelled'}`}>
                                        {p.expired ? 'Vencido' : p.isActive ? 'Activo' : 'Inactivo'}
                                    </span>
                                </div>
                                <div className="flex items-end gap-4 mb-3">
                                    <div>
                                        <p className="text-3xl font-bold text-primary-600">{p.remainingCredits}</p>
                                        <p className="text-xs text-gray-400">créditos restantes</p>
                                    </div>
                                    <div className="flex-1">
                                        <div className="w-full bg-gray-100 rounded-full h-2">
                                            <div
                                                className="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full transition-all"
                                                style={{ width: `${(p.remainingCredits / p.totalCredits) * 100}%` }}
                                            ></div>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">{p.usedCredits} de {p.totalCredits} usados</p>
                                    </div>
                                </div>
                                {p.expiresAt && (
                                    <p className="text-xs text-gray-400">
                                        Vence: {new Date(p.expiresAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
