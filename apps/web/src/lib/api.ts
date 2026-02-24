const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function apiFetch<T = any>(
    path: string,
    options: RequestInit = {},
): Promise<{ ok: boolean; data?: T; error?: string; message?: string }> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers,
    });

    const json = await res.json();
    return json;
}

export function formatCOP(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
    }).format(amount);
}

export function formatDate(date: string | Date, tz = 'America/Bogota'): string {
    return new Date(date).toLocaleDateString('es-CO', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: tz,
    });
}

export function formatTime(date: string | Date, tz = 'America/Bogota'): string {
    return new Date(date).toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: tz,
    });
}

export function statusBadgeClass(status: string): string {
    const map: Record<string, string> = {
        confirmed: 'badge-confirmed',
        reserved: 'badge-reserved',
        cancelled: 'badge-cancelled',
        completed: 'badge-completed',
        no_show: 'badge-cancelled',
        pending: 'badge-pending',
        approved: 'badge-approved',
        rejected: 'badge-rejected',
        failed: 'badge-rejected',
        covered_by_pack: 'badge-confirmed',
        refunded: 'badge-pending',
    };
    return map[status] || 'badge-pending';
}

export function statusLabel(status: string): string {
    const map: Record<string, string> = {
        confirmed: 'Confirmada',
        reserved: 'Reservada',
        cancelled: 'Cancelada',
        completed: 'Completada',
        no_show: 'No asistió',
        pending: 'Pendiente',
        approved: 'Aprobado',
        rejected: 'Rechazado',
        failed: 'Fallido',
        covered_by_pack: 'Pack',
        refunded: 'Reembolsado',
    };
    return map[status] || status;
}
