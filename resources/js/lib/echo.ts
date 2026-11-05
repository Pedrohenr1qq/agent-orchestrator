import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
    interface Window {
        Pusher: typeof Pusher;
        Echo: Echo<'reverb'>;
    }
}

window.Pusher = Pusher;

export function getEchoInstance(config?: {
    key?: string;
    host?: string;
    port?: number;
    scheme?: string;
}) {
    if (typeof window === 'undefined') return null;

    if (!window.Echo) {
        window.Echo = new Echo({
            broadcaster: 'reverb',
            key: config?.key || import.meta.env.VITE_REVERB_APP_KEY,
            wsHost: config?.host || import.meta.env.VITE_REVERB_HOST || window.location.hostname,
            wsPort: config?.port || import.meta.env.VITE_REVERB_PORT || 8080,
            wssPort: config?.port || import.meta.env.VITE_REVERB_PORT || 8080,
            forceTLS: (config?.scheme || import.meta.env.VITE_REVERB_SCHEME) === 'https',
            enabledTransports: ['ws', 'wss'],
        });
    }

    return window.Echo;
}
