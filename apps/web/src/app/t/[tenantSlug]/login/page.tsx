'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage({ params }: { params: { tenantSlug: string } }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch(`${apiUrl}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();

            if (!data.ok) {
                setError(data.error || 'Error al iniciar sesión');
                setLoading(false);
                return;
            }

            localStorage.setItem('token', data.data.accessToken);
            localStorage.setItem('refreshToken', data.data.refreshToken);
            localStorage.setItem('user', JSON.stringify(data.data.user));

            // Redirect based on role
            if (data.data.user.role === 'tenant_admin') {
                router.push(`/t/${params.tenantSlug}/dashboard`);
            } else if (data.data.user.role === 'super_admin') {
                router.push('/admin');
            } else {
                router.push(`/t/${params.tenantSlug}/portal`);
            }
        } catch (err) {
            setError('Error de conexión');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 px-4">
            <div className="absolute top-20 right-20 w-64 h-64 bg-primary-200/30 rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 left-20 w-80 h-80 bg-accent-200/20 rounded-full blur-3xl"></div>

            <div className="card max-w-md w-full relative z-10">
                <div className="text-center mb-8">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">F</div>
                    <h1 className="text-2xl font-bold text-gray-900">Iniciar sesión</h1>
                    <p className="text-gray-500 text-sm mt-1">Ingresa a tu cuenta</p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">Email</label>
                        <input type="email" required className="input-field" placeholder="tu@email.com"
                            value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">Contraseña</label>
                        <input type="password" required className="input-field" placeholder="••••••••"
                            value={password} onChange={e => setPassword(e.target.value)} />
                    </div>
                    <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
                        {loading ? 'Ingresando...' : 'Iniciar sesión'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <a href={`/t/${params.tenantSlug}`} className="text-sm text-primary-600 hover:text-primary-700">
                        ← Volver al inicio
                    </a>
                </div>

                <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-400 font-medium mb-2">Cuentas demo:</p>
                    <p className="text-xs text-gray-500">Admin: profe@profefrances.co / Profe123!</p>
                    <p className="text-xs text-gray-500">Alumno: carlos@example.com / Student123!</p>
                </div>
            </div>
        </div>
    );
}
