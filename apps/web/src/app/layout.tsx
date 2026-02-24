import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'Teach Pro — Clases Online',
    description: 'Plataforma para agendar y gestionar clases de idiomas online',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="es">
            <body className="min-h-screen bg-gray-50 antialiased">{children}</body>
        </html>
    );
}
