'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface LessonType {
    id: string;
    name: string;
    description: string;
    durationMin: number;
    priceAmount: number;
    currency: string;
    isPackType: boolean;
    packSize: number | null;
}

interface Slot {
    start: string;
    end: string;
    available: boolean;
}

export default function BookPage({ params }: { params: { tenantSlug: string } }) {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [lessonTypes, setLessonTypes] = useState<LessonType[]>([]);
    const [selectedType, setSelectedType] = useState<LessonType | null>(null);
    const [selectedDate, setSelectedDate] = useState('');
    const [slots, setSlots] = useState<Slot[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
    const [loading, setLoading] = useState(false);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const router = useRouter();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    // Load lesson types on mount
    useEffect(() => {
        fetch(`${apiUrl}/t/${params.tenantSlug}/public/lesson-types`)
            .then(r => r.json())
            .then(r => {
                if (r.ok) setLessonTypes(r.data);
            })
            .catch(() => { });
    }, [apiUrl, params.tenantSlug]);

    // Load slots when date changes
    useEffect(() => {
        if (!selectedType || !selectedDate) return;
        setSlotsLoading(true);
        const from = selectedDate;
        const to = selectedDate;
        fetch(`${apiUrl}/t/${params.tenantSlug}/public/slots?lessonTypeId=${selectedType.id}&from=${from}&to=${to}&tz=America/Bogota`)
            .then(r => r.json())
            .then(r => {
                if (r.ok) setSlots(r.data.filter((s: Slot) => s.available));
                setSlotsLoading(false);
            })
            .catch(() => setSlotsLoading(false));
    }, [selectedType, selectedDate, apiUrl, params.tenantSlug]);

    const handleBook = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push(`/t/${params.tenantSlug}/login`);
            return;
        }
        if (!selectedType || !selectedSlot) return;

        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${apiUrl}/t/${params.tenantSlug}/bookings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    lessonTypeId: selectedType.id,
                    startsAt: selectedSlot.start,
                }),
            });
            const data = await res.json();

            if (!data.ok) {
                setError(data.error || 'Error al reservar');
                setLoading(false);
                return;
            }

            setSuccess(data.message || '¡Clase reservada exitosamente!');
            setLoading(false);
        } catch (err) {
            setError('Error de conexión');
            setLoading(false);
        }
    };

    const handleBookPack = async (packType: LessonType) => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push(`/t/${params.tenantSlug}/login`);
            return;
        }

        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${apiUrl}/t/${params.tenantSlug}/packs/purchase`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    lessonTypeId: packType.id,
                }),
            });
            const data = await res.json();

            if (!data.ok) {
                setError(data.error || 'Error al procesar el paquete');
                setLoading(false);
                return;
            }

            if (data.data?.checkoutUrl) {
                window.location.href = data.data.checkoutUrl;
            } else {
                setSuccess(data.message || 'Paquete listo');
                setLoading(false);
            }
        } catch (err) {
            setError('Error de conexión');
            setLoading(false);
        }
    };

    const formatCOP = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
    const fmtTime = (d: string) => new Date(d).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
    const fmtDateFull = (d: string) => new Date(d).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });

    // Generate next 14 days for date picker
    const dates = Array.from({ length: 14 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i + 1);
        return d.toISOString().split('T')[0];
    });

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 px-4">
                <div className="card max-w-md w-full text-center">
                    <span className="text-6xl mb-4 block">🎉</span>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Reserva confirmada!</h1>
                    <p className="text-gray-500 mb-6">{success}</p>
                    <div className="space-y-3">
                        <button onClick={() => router.push(`/t/${params.tenantSlug}/portal`)} className="btn-primary w-full">
                            Ir a mi portal
                        </button>
                        <button onClick={() => { setSuccess(''); setStep(1); setSelectedType(null); setSelectedSlot(null); }} className="btn-secondary w-full">
                            Reservar otra clase
                        </button>
                        <a href={`/t/${params.tenantSlug}`} className="block text-sm text-primary-600 hover:text-primary-700 pt-2 font-medium">
                            Volver al inicio
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40">
                <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
                    <a href={`/t/${params.tenantSlug}`} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-sm">F</div>
                        <span className="font-bold text-gray-900">Reservar clase</span>
                    </a>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}>1</span>
                        <span className="w-4 h-px bg-gray-300"></span>
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</span>
                        <span className="w-4 h-px bg-gray-300"></span>
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step >= 3 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}>3</span>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-8">
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">
                        {error}
                        <button onClick={() => setError('')} className="ml-2 underline">cerrar</button>
                    </div>
                )}

                {/* Step 1: Choose lesson type */}
                {step === 1 && (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">¿Qué tipo de clase quieres?</h2>
                        <p className="text-gray-500 mb-6">Elige el formato que mejor se adapte a ti</p>
                        <div className="grid gap-4">
                            {lessonTypes.map(lt => (
                                <button
                                    key={lt.id}
                                    onClick={() => {
                                        if (lt.isPackType) {
                                            handleBookPack(lt);
                                        } else {
                                            setSelectedType(lt);
                                            setStep(2);
                                        }
                                    }}
                                    disabled={loading}
                                    className="card text-left hover:border-primary-300 hover:shadow-lg transition-all group relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-700">{lt.name}</h3>
                                                {lt.isPackType && (
                                                    <span className="inline-block px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-bold rounded-full border border-primary-200">
                                                        Pack de {lt.packSize} clases
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500 mt-1">{lt.description}</p>
                                            <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
                                                <span>⏱️ {lt.durationMin} min {lt.isPackType ? '/ clase' : ''}</span>
                                                <span className="font-medium text-gray-600">💰 {formatCOP(lt.priceAmount)}</span>
                                            </div>
                                        </div>
                                        <span className="text-2xl group-hover:translate-x-1 transition-transform text-primary-400">→</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 2: Choose date and time */}
                {step === 2 && selectedType && (
                    <div>
                        <button onClick={() => { setStep(1); setSelectedSlot(null); setSlots([]); setSelectedDate(''); }} className="text-sm text-primary-600 hover:text-primary-700 mb-4 inline-flex items-center gap-1">
                            ← Cambiar tipo de clase
                        </button>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Elige fecha y hora</h2>
                        <p className="text-gray-500 mb-6">{selectedType.name} · {selectedType.durationMin} min · {formatCOP(selectedType.priceAmount)}</p>

                        {/* Date picker */}
                        <div className="mb-6">
                            <h3 className="text-sm font-medium text-gray-700 mb-3">📅 Fecha</h3>
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                {dates.map(date => {
                                    const d = new Date(date + 'T12:00:00');
                                    const day = d.toLocaleDateString('es-CO', { weekday: 'short' });
                                    const num = d.getDate();
                                    const month = d.toLocaleDateString('es-CO', { month: 'short' });
                                    return (
                                        <button
                                            key={date}
                                            onClick={() => { setSelectedDate(date); setSelectedSlot(null); }}
                                            className={`flex-shrink-0 w-16 py-3 rounded-xl border text-center transition-all ${selectedDate === date
                                                ? 'bg-primary-600 text-white border-primary-600 shadow-lg'
                                                : 'bg-white border-gray-200 hover:border-primary-300'
                                                }`}
                                        >
                                            <p className={`text-xs ${selectedDate === date ? 'text-primary-100' : 'text-gray-400'}`}>{day}</p>
                                            <p className="text-lg font-bold">{num}</p>
                                            <p className={`text-xs ${selectedDate === date ? 'text-primary-100' : 'text-gray-400'}`}>{month}</p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Time slots */}
                        {selectedDate && (
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-3">⏰ Horarios disponibles</h3>
                                {slotsLoading ? (
                                    <div className="text-center py-8 text-gray-400">Cargando horarios...</div>
                                ) : slots.length === 0 ? (
                                    <div className="card text-center py-8">
                                        <p className="text-gray-500">No hay horarios disponibles para esta fecha.</p>
                                        <p className="text-sm text-gray-400 mt-1">Intenta con otra fecha.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                        {slots.map(slot => (
                                            <button
                                                key={slot.start}
                                                onClick={() => { setSelectedSlot(slot); setStep(3); }}
                                                className={`py-3 px-2 rounded-xl border text-sm font-medium transition-all ${selectedSlot?.start === slot.start
                                                    ? 'bg-primary-600 text-white border-primary-600'
                                                    : 'bg-white border-gray-200 hover:border-primary-300 hover:bg-primary-50 text-gray-700'
                                                    }`}
                                            >
                                                {fmtTime(slot.start)}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Step 3: Confirm */}
                {step === 3 && selectedType && selectedSlot && (
                    <div>
                        <button onClick={() => setStep(2)} className="text-sm text-primary-600 hover:text-primary-700 mb-4 inline-flex items-center gap-1">
                            ← Cambiar horario
                        </button>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Confirmar reserva</h2>

                        <div className="card mb-6">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">Clase</span>
                                    <span className="font-semibold text-gray-900">{selectedType.name}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">Fecha</span>
                                    <span className="font-semibold text-gray-900">{fmtDateFull(selectedSlot.start)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">Hora</span>
                                    <span className="font-semibold text-gray-900">{fmtTime(selectedSlot.start)} – {fmtTime(selectedSlot.end)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">Duración</span>
                                    <span className="font-semibold text-gray-900">{selectedType.durationMin} minutos</span>
                                </div>
                                <hr className="border-gray-100" />
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-700 font-medium">Total</span>
                                    <span className="text-xl font-bold text-primary-700">{formatCOP(selectedType.priceAmount)}</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleBook}
                            disabled={loading}
                            className="btn-primary w-full text-lg !py-4 disabled:opacity-50"
                        >
                            {loading ? 'Reservando...' : '✅ Confirmar reserva'}
                        </button>

                        <p className="text-xs text-gray-400 text-center mt-4">
                            Si tienes un pack activo, el crédito se descontará automáticamente.
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
}
