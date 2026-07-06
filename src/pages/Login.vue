<script setup>
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const form = reactive({ email: '', password: '' });
const error = ref('');
const processing = ref(false);

// Shown when the previous session ended via the idle auto-logout.
const idleLogout = ref(route.query.reason === 'idle');

async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    error.value = '';

    try {
        await auth.login(form);
        router.push(route.query.redirect ? String(route.query.redirect) : { name: 'home' });
    } catch (e) {
        error.value = e.response?.status === 422
            ? (Object.values(e.response.data.errors ?? {})[0]?.[0] ?? 'Invalid credentials.')
            : 'Something went wrong. Please try again.';
    } finally {
        processing.value = false;
    }
}
</script>

<template>
    <!-- Travel-agency backdrop: a full-viewport illustrated scene rendered
         entirely with CSS + inline SVG (no external assets). -->
    <div class="travel-bg" aria-hidden="true">
        <div class="travel-bg__sun"></div>
        <div class="travel-bg__cloud travel-bg__cloud--1"></div>
        <div class="travel-bg__cloud travel-bg__cloud--2"></div>
        <div class="travel-bg__cloud travel-bg__cloud--3"></div>

        <!-- Dashed flight path + airplane -->
        <svg class="travel-bg__flight" viewBox="0 0 1440 500" preserveAspectRatio="xMidYMid slice">
            <path
                d="M-40 380 C 300 240, 620 300, 900 180 S 1320 60, 1520 20"
                fill="none"
                stroke="rgba(220,38,38,0.55)"
                stroke-width="3"
                stroke-dasharray="2 12"
                stroke-linecap="round"
            />
            <g transform="translate(900 180) rotate(-24)">
                <path
                    d="M0 -6 L34 0 L0 6 L-6 2 L-2 0 L-6 -2 Z"
                    fill="#dc2626"
                />
                <path d="M2 -3 L18 -13 L10 -2 Z" fill="#b91c1c" />
                <path d="M2 3 L18 13 L10 2 Z" fill="#b91c1c" />
            </g>
        </svg>

        <!-- Layered mountain / hill silhouettes -->
        <svg class="travel-bg__mountains" viewBox="0 0 1440 320" preserveAspectRatio="xMidYMax slice">
            <path fill="rgba(30,58,90,0.35)" d="M0 220 L220 90 L400 210 L620 70 L820 220 L1040 110 L1260 230 L1440 130 L1440 320 L0 320 Z" />
            <path fill="rgba(20,42,66,0.55)" d="M0 260 L180 160 L380 260 L560 150 L760 270 L980 170 L1180 280 L1440 190 L1440 320 L0 320 Z" />
            <path fill="rgba(12,28,46,0.8)" d="M0 300 L240 230 L480 300 L720 240 L960 305 L1200 250 L1440 300 L1440 320 L0 320 Z" />
        </svg>
    </div>

    <div class="relative flex min-h-[70vh] items-center justify-center">
        <div class="w-full max-w-sm rounded-xl border border-white/40 bg-white/80 p-6 shadow-xl backdrop-blur-md">
            <div class="mb-1 flex justify-center">
                <img src="/logo.svg" alt="AS Travel" class="h-12 w-auto">
            </div>

            <p v-if="idleLogout" class="mb-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                You were signed out due to inactivity. Please sign in again.
            </p>

            <form class="space-y-4" @submit.prevent="submit">
                <div>
                    <label class="mb-1 block text-sm font-medium text-gray-700">Email</label>
                    <input
                        v-model="form.email"
                        type="email"
                        autocomplete="username"
                        class="w-full rounded border border-gray-300 px-3 py-2 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    >
                </div>
                <div>
                    <label class="mb-1 block text-sm font-medium text-gray-700">Password</label>
                    <input
                        v-model="form.password"
                        type="password"
                        autocomplete="current-password"
                        class="w-full rounded border border-gray-300 px-3 py-2 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    >
                </div>

                <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

                <button
                    type="submit"
                    :disabled="processing"
                    class="w-full rounded bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:opacity-60"
                >
                    {{ processing ? 'Signing in…' : 'Sign in' }}
                </button>
            </form>
        </div>
    </div>
</template>

<style scoped>
/* Full-viewport travel scene sitting behind the login card. */
.travel-bg {
    position: fixed;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
    background: linear-gradient(180deg, #7dd3fc 0%, #bae6fd 35%, #e0f2fe 60%, #fef3c7 88%, #fed7aa 100%);
}

/* Warm sun glow, upper-right. */
.travel-bg__sun {
    position: absolute;
    top: 8%;
    right: 12%;
    width: 160px;
    height: 160px;
    border-radius: 9999px;
    background: radial-gradient(circle, rgba(255, 244, 214, 0.95) 0%, rgba(253, 224, 155, 0.7) 40%, rgba(253, 224, 155, 0) 72%);
}

/* Soft drifting clouds. */
.travel-bg__cloud {
    position: absolute;
    height: 40px;
    border-radius: 9999px;
    background: rgba(255, 255, 255, 0.85);
    filter: blur(6px);
    animation: travel-drift 60s linear infinite;
}
.travel-bg__cloud--1 { top: 18%; left: -10%; width: 220px; animation-duration: 70s; }
.travel-bg__cloud--2 { top: 30%; left: -20%; width: 320px; height: 52px; animation-duration: 95s; }
.travel-bg__cloud--3 { top: 12%; left: -15%; width: 180px; height: 32px; animation-duration: 55s; }

@keyframes travel-drift {
    from { transform: translateX(0); }
    to { transform: translateX(130vw); }
}

.travel-bg__flight {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 60%;
}

.travel-bg__mountains {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 45%;
}

@media (prefers-reduced-motion: reduce) {
    .travel-bg__cloud { animation: none; }
}
</style>
