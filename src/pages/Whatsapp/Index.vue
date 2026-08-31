<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useWhatsappStore } from '../../stores/whatsapp.js';
import AppLayout from '../../layouts/AppLayout.vue';
import Loader from '../../components/Loader.vue';
import Button from '../../components/Button.vue';

const store = useWhatsappStore();

const search = ref('');
const draft = ref('');
const thread = ref(null);

const filtered = computed(() => {
    const q = search.value.trim().toLowerCase();
    const rows = store.conversations;

    if (!q) {
        return rows;
    }

    return rows.filter((row) => (row.name ?? '').toLowerCase().includes(q) || (row.phone ?? '').includes(q));
});

const baseTitle = document.title;

watch(() => store.totalUnread, (count) => {
    document.title = count > 0 ? `(${count}) ${baseTitle}` : baseTitle;
});

function scrollThreadToBottom() {
    nextTick(() => {
        if (thread.value) {
            thread.value.scrollTop = thread.value.scrollHeight;
        }
    });
}

watch(() => store.messages.length, scrollThreadToBottom);

async function open(id) {
    await store.openConversation(id);
    scrollThreadToBottom();
}

async function send() {
    const body = draft.value;
    draft.value = '';
    await store.sendReply(body, true);
}

function fmtTime(iso) {
    if (!iso) {
        return '';
    }

    return new Date(iso).toLocaleString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtDay(iso) {
    if (!iso) {
        return '';
    }

    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
        return 'Today';
    }

    if (d.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    }

    return d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
}

// Day separators: mark the first message of each calendar day.
const threadWithDays = computed(() => {
    let lastDay = null;

    return store.messages.map((message) => {
        const day = message.at ? new Date(message.at).toDateString() : null;
        const showDay = day !== lastDay;
        lastDay = day;

        return { ...message, showDay };
    });
});

onMounted(() => {
    store.loadConversations();
    store.subscribe();
});

onUnmounted(() => {
    store.unsubscribe();
});
</script>

<template>
    <AppLayout title="WhatsApp" fluid>
        <div class="flex h-[calc(100vh-8rem)] overflow-hidden rounded-lg border border-gray-200 bg-white">
            <!-- Conversation list -->
            <aside
                class="flex w-full shrink-0 flex-col border-r border-gray-200 md:w-80 lg:w-96"
                :class="store.activeId ? 'hidden md:flex' : 'flex'"
            >
                <div class="border-b border-gray-200 p-3">
                    <input
                        v-model="search"
                        type="search"
                        placeholder="Search name or number…"
                        class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    >
                </div>

                <div class="min-h-0 flex-1 overflow-y-auto">
                    <Loader v-if="store.loadingList && store.conversations.length === 0" />

                    <p v-else-if="filtered.length === 0" class="p-4 text-center text-sm text-gray-400">
                        No conversations.
                    </p>

                    <button
                        v-for="row in filtered"
                        :key="row.id"
                        type="button"
                        class="flex w-full items-start gap-3 border-b border-gray-100 px-3 py-3 text-left hover:bg-gray-50"
                        :class="row.id === store.activeId ? 'bg-green-50' : ''"
                        @click="open(row.id)"
                    >
                        <span class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-semibold text-green-700">
                            {{ (row.name ?? '?').slice(0, 1).toUpperCase() }}
                        </span>
                        <span class="min-w-0 flex-1">
                            <span class="flex items-center justify-between gap-2">
                                <span class="truncate text-sm font-medium text-gray-900">{{ row.name }}</span>
                                <span class="shrink-0 text-[11px] text-gray-400">{{ fmtTime(row.last_message?.at ?? row.last_contact_at) }}</span>
                            </span>
                            <span class="mt-0.5 flex items-center justify-between gap-2">
                                <span class="truncate text-xs text-gray-500">
                                    <span v-if="row.last_message && row.last_message.direction !== 1" class="text-gray-400">You: </span>{{ row.last_message?.body ?? row.phone }}
                                </span>
                                <span
                                    v-if="row.unread_count > 0"
                                    class="shrink-0 rounded-full bg-green-500 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white"
                                >{{ row.unread_count }}</span>
                            </span>
                            <span v-if="!row.ai_enabled" class="mt-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">AI off</span>
                        </span>
                    </button>
                </div>
            </aside>

            <!-- Thread -->
            <section class="flex min-w-0 flex-1 flex-col" :class="store.activeId ? 'flex' : 'hidden md:flex'">
                <template v-if="store.active">
                    <header class="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
                        <div class="min-w-0">
                            <button type="button" class="mr-2 text-sm text-gray-500 md:hidden" @click="store.activeId = null">←</button>
                            <span class="text-sm font-semibold text-gray-900">{{ store.active.name }}</span>
                            <span class="ml-2 text-xs text-gray-400">{{ store.active.phone }}</span>
                        </div>
                        <label class="flex shrink-0 items-center gap-2 text-xs text-gray-500">
                            <input
                                type="checkbox"
                                :checked="store.active.ai_enabled"
                                @change="store.toggleAi(store.active.id, $event.target.checked)"
                            >
                            AI auto-reply
                        </label>
                    </header>

                    <div ref="thread" class="min-h-0 flex-1 space-y-1 overflow-y-auto bg-gray-50 px-4 py-4">
                        <Loader v-if="store.loadingThread" />

                        <template v-else>
                            <button
                                v-if="store.hasOlder"
                                type="button"
                                class="mx-auto block rounded border border-gray-300 bg-white px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
                                @click="store.loadOlder()"
                            >Load earlier messages</button>

                            <template v-for="message in threadWithDays" :key="message.id">
                                <div v-if="message.showDay" class="my-3 text-center">
                                    <span class="rounded bg-gray-200 px-2 py-0.5 text-[11px] text-gray-500">{{ fmtDay(message.at) }}</span>
                                </div>
                                <div class="flex" :class="message.direction === 1 ? 'justify-start' : 'justify-end'">
                                    <div
                                        class="max-w-[75%] rounded-lg px-3 py-2 text-sm shadow-sm"
                                        :class="message.direction === 1 ? 'bg-white text-gray-800' : (message.direction === 3 ? 'bg-green-100 text-gray-800' : 'bg-green-500 text-white')"
                                    >
                                        <p class="whitespace-pre-wrap break-words">{{ message.body }}</p>
                                        <p class="mt-1 text-right text-[10px] opacity-70">
                                            <span v-if="message.direction === 2 && message.user">{{ message.user }} · </span>
                                            <span v-else-if="message.direction === 3">AI · </span>
                                            {{ fmtTime(message.at) }}
                                        </p>
                                    </div>
                                </div>
                            </template>
                        </template>
                    </div>

                    <form class="flex items-end gap-2 border-t border-gray-200 px-3 py-3" @submit.prevent="send">
                        <textarea
                            v-model="draft"
                            rows="1"
                            placeholder="Type a reply… (sending pauses AI for this chat)"
                            class="max-h-32 min-h-[38px] flex-1 resize-none rounded border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500"
                            @keydown.enter.exact.prevent="send"
                        />
                        <Button type="submit" variant="primary" :disabled="store.sending || !draft.trim()">
                            {{ store.sending ? 'Sending…' : 'Send' }}
                        </Button>
                    </form>
                </template>

                <div v-else class="flex flex-1 items-center justify-center text-sm text-gray-400">
                    Select a conversation.
                </div>
            </section>
        </div>
    </AppLayout>
</template>
