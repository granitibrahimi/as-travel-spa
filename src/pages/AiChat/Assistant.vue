<script setup>
import { nextTick, onMounted, ref } from 'vue';
import api from '../../helpers/api';
import { markdown } from '../../helpers/markdown.js';
import { castResource } from '../../types/responses.js';
import AppLayout from '../../layouts/AppLayout.vue';
import Loader from '../../components/Loader.vue';

// The signed-in user's own conversation with the AS Travel assistant (the
// same one as in the AS Travel app). It answers in Albanian, only from the
// instructions managed in Administration → AI Chat → Instructions.
const SUGGESTIONS = [
    'Sa kushton një çantë shtesë?',
    'Sa paradhënie paguan klienti?',
    'Cili është orari i zyrës?',
    'Si ta dërgoj linkun e pagesës online?',
];

const messages = ref(null);
const draft = ref('');
const busy = ref(false);
const typing = ref(false);
const error = ref('');
const thread = ref(null);
const input = ref(null);

function scrollDown() {
    nextTick(() => requestAnimationFrame(() => {
        if (thread.value) {
            thread.value.scrollTop = thread.value.scrollHeight;
        }
    }));
}

function fit() {
    const el = input.value;
    if (el) {
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }
}

async function load() {
    const { data } = await api.get('/ai-chat/messages');
    messages.value = castResource(data).messages;
    scrollDown();
}

async function ask(text) {
    const message = text.trim();

    if (! message || busy.value) {
        return;
    }

    error.value = '';
    messages.value = [...messages.value, { id: `local-${Date.now()}`, role: 'user', content: message, created_at: '' }];
    draft.value = '';
    busy.value = true;
    typing.value = true;
    nextTick(fit);
    scrollDown();

    try {
        const { data } = await api.post('/ai-chat/messages', { message });
        const result = castResource(data);
        messages.value = [...messages.value.slice(0, -1), result.question, result.reply];
    } catch (e) {
        messages.value = messages.value.slice(0, -1);
        draft.value = message;
        nextTick(fit);
        error.value = e.response?.status === 503
            ? (e.response.data?.message ?? 'Asistenti nuk është i disponueshëm për momentin.')
            : e.response?.status === 429
                ? 'Shumë pyetje njëherësh. Prit një minutë dhe provo përsëri.'
                : 'Diçka shkoi keq. Provo përsëri.';
    } finally {
        busy.value = false;
        typing.value = false;
        scrollDown();
    }
}

onMounted(load);
</script>

<template>
    <AppLayout title="Assistant" fluid>
        <div class="mx-auto flex h-[calc(100vh-8rem)] max-w-4xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
            <header class="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
                <span class="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-600 text-xs font-bold text-white">
                    AS
                    <b class="absolute -bottom-1.5 -right-2 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 px-1 text-[9px] leading-tight text-white ring-2 ring-white">AI</b>
                </span>
                <div>
                    <p class="text-sm font-semibold text-gray-900">AS Travel Assistant</p>
                    <p class="text-xs text-gray-400">Përgjigjet sipas udhëzimeve të zyrës</p>
                </div>
            </header>

            <div ref="thread" class="min-h-0 flex-1 space-y-4 overflow-y-auto bg-gray-50 px-4 py-5">
                <Loader v-if="messages === null" />

                <section v-else-if="messages.length === 0 && ! typing" class="flex h-full flex-col items-center justify-center text-center">
                    <span class="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-red-600 text-xl font-bold text-white">
                        AS
                        <b class="absolute -bottom-2 -right-3 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 px-1.5 text-xs leading-snug text-white ring-2 ring-gray-50">AI</b>
                    </span>
                    <h2 class="mt-4 text-lg font-semibold text-gray-900">Pyete asistentin</h2>
                    <p class="mt-1 max-w-sm text-sm text-gray-500">Çmime, procedura dhe rregulla të zyrës, sipas udhëzimeve të AS Travel.</p>
                    <div class="mt-6 grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
                        <button
                            v-for="text in SUGGESTIONS"
                            :key="text"
                            type="button"
                            class="rounded-lg border border-gray-200 bg-white px-3 py-3 text-left text-sm font-medium text-gray-700 hover:border-red-300 hover:bg-red-50"
                            @click="ask(text)"
                        >{{ text }}</button>
                    </div>
                </section>

                <template v-else>
                    <div v-for="m in messages" :key="m.id" class="flex gap-2" :class="m.role === 'user' ? 'justify-end' : 'justify-start'">
                        <span v-if="m.role === 'assistant'" class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-red-600 text-[10px] font-bold text-white">AS</span>
                        <div
                            class="max-w-[80%] rounded-lg px-3 py-2 text-sm shadow-sm"
                            :class="m.role === 'user' ? 'whitespace-pre-wrap break-words bg-red-600 text-white' : 'ai-prose bg-white text-gray-800'"
                        >
                            <template v-if="m.role === 'user'">{{ m.content }}</template>
                            <div v-else v-html="markdown(m.content)" />
                        </div>
                    </div>

                    <div v-if="typing" class="flex gap-2">
                        <span class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-red-600 text-[10px] font-bold text-white">AS</span>
                        <div class="flex gap-1 rounded-lg bg-white px-3 py-3 shadow-sm">
                            <i class="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                            <i class="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
                            <i class="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
                        </div>
                    </div>
                </template>
            </div>

            <p v-if="error" class="border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">{{ error }}</p>

            <form class="flex items-end gap-2 border-t border-gray-200 px-3 py-3" @submit.prevent="ask(draft)">
                <textarea
                    ref="input"
                    v-model="draft"
                    rows="1"
                    maxlength="4000"
                    placeholder="Shkruaj pyetjen…"
                    class="max-h-40 min-h-[38px] flex-1 resize-none rounded border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    @input="fit"
                    @keydown.enter.exact.prevent="ask(draft)"
                />
                <button
                    type="submit"
                    class="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-default disabled:bg-gray-200 disabled:text-gray-400"
                    :disabled="busy || ! draft.trim()"
                >Dërgo</button>
            </form>
        </div>
    </AppLayout>
</template>
