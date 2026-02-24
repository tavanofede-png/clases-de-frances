'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
    id: string;
    sender: 'user' | 'bot';
    text: string;
    quickReplies?: Array<{ label: string; value: string }>;
}

export default function Webchat({ tenantSlug }: { tenantSlug: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            sendMessage('hola');
        }
    }, [isOpen]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async (text: string) => {
        const userMsg: Message = { id: Date.now().toString(), sender: 'user', text };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const res = await fetch(`${apiUrl}/t/${tenantSlug}/bot/incoming`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channel: 'webchat',
                    from: 'webchat-visitor',
                    messageText: text,
                    tz: 'America/Bogota',
                    locale: 'es-CO',
                }),
            });
            const data = await res.json();
            if (data.ok) {
                const botMsg: Message = {
                    id: (Date.now() + 1).toString(),
                    sender: 'bot',
                    text: data.data.replyText,
                    quickReplies: data.data.quickReplies,
                };
                setMessages(prev => [...prev, botMsg]);
            }
        } catch (err) {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                sender: 'bot',
                text: 'Lo siento, hubo un error. Intenta de nuevo.',
            }]);
        }
        setLoading(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) sendMessage(input.trim());
    };

    return (
        <>
            {/* Bubble */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-xl shadow-primary-500/30 flex items-center justify-center hover:scale-110 transition-transform"
            >
                {isOpen ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                )}
            </button>

            {/* Chat window */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-bounce-in" style={{ height: '500px' }}>
                    {/* Header */}
                    <div className="bg-gradient-to-r from-primary-500 to-primary-700 px-5 py-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">🇫🇷</div>
                        <div>
                            <p className="text-white font-semibold text-sm">Asistente Virtual</p>
                            <p className="text-primary-100 text-xs">Clases de francés · Respuesta inmediata</p>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] ${msg.sender === 'user'
                                    ? 'bg-primary-500 text-white rounded-2xl rounded-tr-md'
                                    : 'bg-white text-gray-700 rounded-2xl rounded-tl-md shadow-sm border border-gray-100'
                                    } px-4 py-3 text-sm animate-slide-up`}>
                                    <p className="whitespace-pre-line">{msg.text}</p>
                                    {msg.quickReplies && msg.quickReplies.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {msg.quickReplies.map((qr, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => {
                                                        if (qr.value.startsWith('http')) {
                                                            window.open(qr.value, '_blank');
                                                        } else if (qr.value.startsWith('/')) {
                                                            window.location.href = qr.value;
                                                        } else {
                                                            sendMessage(qr.value);
                                                        }
                                                    }}
                                                    className="px-3 py-1.5 text-xs font-medium bg-primary-50 text-primary-700 rounded-full hover:bg-primary-100 transition border border-primary-100"
                                                >
                                                    {qr.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white rounded-2xl rounded-tl-md px-4 py-3 shadow-sm border border-gray-100">
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-gray-100 flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder="Escribe tu mensaje..."
                            className="flex-1 px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/10"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || loading}
                            className="px-4 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        </button>
                    </form>
                </div>
            )}
        </>
    );
}
