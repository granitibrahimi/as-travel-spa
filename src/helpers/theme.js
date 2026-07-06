import { ref } from 'vue';

// Light/dark theme. The `dark` class on <html> drives Tailwind's dark variants
// and the neutral remaps in app.css. The choice is persisted; first visit
// follows the OS preference.
const STORAGE_KEY = 'as.theme';

// Shared singleton state (module-level ref) so any component stays in sync.
export const isDark = ref(false);

function apply(dark) {
    isDark.value = dark;
    document.documentElement.classList.toggle('dark', dark);
}

// Call once on boot, before mount, to avoid a flash of the wrong theme.
export function initTheme() {
    let saved = null;

    try {
        saved = localStorage.getItem(STORAGE_KEY);
    } catch {
        // localStorage unavailable (private mode) — fall back to OS preference.
    }

    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;

    apply(saved ? saved === 'dark' : prefersDark);
}

export function toggleTheme() {
    apply(!isDark.value);

    try {
        localStorage.setItem(STORAGE_KEY, isDark.value ? 'dark' : 'light');
    } catch {
        // Ignore storage failures — the toggle still works for the session.
    }
}
