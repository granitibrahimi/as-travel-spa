<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../../helpers/api';
import { markdown } from '../../helpers/markdown.js';
import { castResource } from '../../types/responses.js';
import AppLayout from '../../layouts/AppLayout.vue';
import Loader from '../../components/Loader.vue';

// Each agent's conversation with the AS Travel assistant (read only).
const route = useRoute();
const router = useRouter();

const conversations = ref(null);
const search = ref('');
const active = ref(null);
const loadingThread = ref(false);
const thread = ref(null);

const activeId = computed(() => (route.query.agent ? Number(route.query.agent) : null));

const filtered = computed(() => {
    const term = search.value.trim().toLowerCase();

    return (conversations.value ?? []).filter((row) => ! term || row.user.name.toLowerCase().includes(term));
});

async function loadList() {
    const { data } = await api.get('/ai-chat/conversations');
    conversations.value = castResource(data);
}

async function loadThread(id) {
    if (! id) {
        active.value = null;
        return;
    }

    loadingThread.value = true;

    try {
        const { data } = await api.get(`/ai-chat/conversations/${id}`);
        active.value = castResource(data);
    } finally {
        loadingThread.value = false;
    }

    await nextTick();
    requestAnimationFrame(() => {
        if (thread.value) {
            thread.value.scrollTop = thread.value.scrollHeight;
        }
    });
}

function open(id) {
    router.replace({ query: { ...route.query, agent: id } });
}

watch(activeId, loadThread);

onMounted(() => {
    loadList();
    loadThread(activeId.value);
});

function initials(name) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('');
}
</script>

<template>
    <AppLayout title="AI Chat Conversations" fluid>
        <div class="flex h-[calc(100vh-8rem)] overflow-hidden rounded-lg border border-gray-200 bg-white">
            <aside class="flex w-full shrink-0 flex-col border-r border-gray-200 md:w-80 lg:w-96" :class="activeId ? 'hidden md:flex' : 'flex'">
                <div class="border-b border-gray-200 p-3">
                    <input
                        v-model="search"
                        type="search"
                        placeholder="Search agent…"
                        class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    >
                </div>

                <div class="min-h-0 flex-1 overflow-y-auto">
                    <Loader v-if="conversations === null" />

                    <p v-else-if="filtered.length === 0" class="p-4 text-center text-sm text-gray-400">
                        {{ search.trim() ? 'No agent matches.' : 'No agent has used the assistant yet.' }}
                    </p>

                    <button
                        v-for="row in filtered"
                        :key="row.user.id"
                        type="button"
                        class="flex w-full items-start gap-3 border-b border-gray-100 px-3 py-3 text-left hover:bg-gray-50"
                        :class="row.user.id === activeId ? 'bg-red-50' : ''"
                        @click="open(row.user.id)"
                    >
                        <span class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-semibold text-red-700">
                            {{ initials(row.user.name) }}
                        </span>
                        <span class="min-w-0 flex-1">
                            <span class="flex items-center justify-between gap-2">
                                <span class="truncate text-sm font-medium text-gray-900">{{ row.user.name }}</span>
                                <span class="shrink-0 text-[11px] text-gray-400">{{ row.last_at }}</span>
                            </span>
                            <span class="mt-0.5 block truncate text-xs text-gray-500">{{ row.last_message }}</span>
                            <span class="mt-1 block text-[11px] text-gray-400">{{ row.questions }} {{ row.questions === 1 ? 'question' : 'questions' }}</span>
                        </span>
                    </button>
                </div>
            </aside>

            <section class="flex min-w-0 flex-1 flex-col" :class="activeId ? 'flex' : 'hidden md:flex'">
                <template v-if="activeId">
                    <header class="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
                        <button type="button" class="text-sm text-gray-500 md:hidden" @click="open(undefined)">←</button>
                        <span class="text-sm font-semibold text-gray-900">{{ active?.user.name ?? '…' }}</span>
                        <span v-if="active" class="text-xs text-gray-400">{{ active.messages.length }} messages</span>
                    </header>

                    <div ref="thread" class="min-h-0 flex-1 space-y-3 overflow-y-auto bg-gray-50 px-4 py-4">
                        <Loader v-if="loadingThread" />

                        <template v-else-if="active">
                            <div
                                v-for="message in active.messages"
                                :key="message.id"
                                class="flex"
                                :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
                            >
                                <div
                                    class="max-w-[80%] rounded-lg px-3 py-2 text-sm shadow-sm"
                                    :class="message.role === 'user' ? 'bg-red-600 text-white' : 'bg-white text-gray-800'"
                                >
                                    <p v-if="message.role === 'user'" class="whitespace-pre-wrap break-words">{{ message.content }}</p>
                                    <div v-else class="ai-prose" v-html="markdown(message.content)" />
                                    <p class="mt-1 text-right text-[10px] opacity-70">
                                        {{ message.role === 'user' ? active.user.name : 'Assistant' }} · {{ message.created_at }}
                                    </p>
                                </div>
                            </div>
                        </template>
                    </div>
                </template>

                <div v-else class="flex flex-1 items-center justify-center text-sm text-gray-400">
                    Select an agent to read their conversation.
                </div>
            </section>
        </div>
    </AppLayout>
</template>

<style scoped>
.ai-prose :deep(p),
.ai-prose :deep(ul),
.ai-prose :deep(ol),
.ai-prose :deep(blockquote),
.ai-prose :deep(pre) {
    margin: 0.35rem 0;
}

.ai-prose :deep(:first-child) {
    margin-top: 0;
}

.ai-prose :deep(:last-child) {
    margin-bottom: 0;
}

.ai-prose :deep(ul) {
    list-style: disc;
    padding-left: 1.2rem;
}

.ai-prose :deep(ol) {
    list-style: decimal;
    padding-left: 1.2rem;
}

.ai-prose :deep(h3),
.ai-prose :deep(h4),
.ai-prose :deep(h5),
.ai-prose :deep(h6) {
    margin: 0.5rem 0 0.25rem;
    font-weight: 600;
}

.ai-prose :deep(blockquote) {
    border-left: 3px solid #e5e7eb;
    padding-left: 0.6rem;
    color: #6b7280;
}

.ai-prose :deep(code) {
    border-radius: 0.25rem;
    background: #f3f4f6;
    padding: 0 0.25rem;
    font-size: 0.85em;
}

.ai-prose :deep(pre) {
    overflow-x: auto;
    border-radius: 0.375rem;
    background: #f3f4f6;
    padding: 0.5rem;
}

.ai-prose :deep(a) {
    color: #b91c1c;
    text-decoration: underline;
}
</style>
