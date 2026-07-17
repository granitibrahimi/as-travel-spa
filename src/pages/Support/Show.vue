<script setup>
import { onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import api from '../../helpers/api';
import { downloadFile } from '../../helpers/download';
import { useAuthStore } from '../../stores/auth';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import Button from '../../components/Button.vue';
import Textarea from '../../components/Form/Textarea.vue';
import Loader from '../../components/Loader.vue';

const route = useRoute();
const auth = useAuthStore();

const ticket = ref(null);
const newComment = ref('');
const commentError = ref('');
const posting = ref(false);
const savingStatus = ref(false);

const statuses = [
    { value: 1, label: 'Open' },
    { value: 2, label: 'Working on it' },
    { value: 3, label: 'Resolved' },
];

const statusClass = (status) => ({
    1: 'bg-red-100 text-red-700',
    2: 'bg-amber-100 text-amber-700',
    3: 'bg-green-100 text-green-700',
}[status] ?? 'bg-gray-100 text-gray-600');

async function load() {
    ticket.value = null;
    const { data } = await api.get(`/support-tickets/${route.params.id}`);
    ticket.value = data.data ?? data;
}

onMounted(load);
watch(() => route.params.id, load);

async function addComment() {
    if (posting.value || !newComment.value.trim()) {
        commentError.value = newComment.value.trim() ? '' : 'A comment is required.';
        return;
    }

    posting.value = true;
    commentError.value = '';

    try {
        await api.post(`/support-tickets/${ticket.value.id}/comments`, { comment: newComment.value.trim() });
        newComment.value = '';
        await load();
    } finally {
        posting.value = false;
    }
}

async function changeStatus(status) {
    if (savingStatus.value || status === ticket.value.status) {
        return;
    }

    savingStatus.value = true;

    try {
        await api.patch(`/support-tickets/${ticket.value.id}/status`, { status });
        await load();
    } finally {
        savingStatus.value = false;
    }
}

async function downloadAttachment() {
    await downloadFile(`/support-tickets/${ticket.value.id}/attachment`, {
        fallbackName: `ticket-${ticket.value.id}-attachment`,
    });
}
</script>

<template>
    <AppLayout :title="ticket ? `Ticket #${ticket.id}` : 'Ticket'" fluid>
        <Loader v-if="! ticket" />

        <div v-else class="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div class="lg:col-span-2 space-y-6">
                <FullWidthBox :title="ticket.title" :collapsible="false">
                    <div class="mb-3 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                        <span class="rounded px-2 py-0.5 text-xs font-medium" :class="statusClass(ticket.status)">{{ ticket.status_label }}</span>
                        <span>Opened by {{ ticket.user ?? '—' }}</span>
                        <span>· {{ ticket.created_at }}</span>
                    </div>

                    <p class="whitespace-pre-line text-sm text-gray-800">{{ ticket.description }}</p>

                    <div v-if="ticket.has_attachment" class="mt-4">
                        <Button variant="secondary" size="sm" @click="downloadAttachment">📎 Download attachment</Button>
                    </div>

                    <template #footer>
                        <RouterLink to="/support" class="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50">Back to list</RouterLink>
                    </template>
                </FullWidthBox>

                <FullWidthBox title="Comments" :collapsible="false">
                    <p v-if="ticket.comments.length === 0" class="text-sm text-gray-400">No comments yet.</p>
                    <ul v-else class="space-y-3">
                        <li v-for="comment in ticket.comments" :key="comment.id" class="rounded border border-gray-200 px-3 py-2">
                            <div class="mb-1 flex items-center justify-between text-xs text-gray-400">
                                <span class="font-medium text-gray-600">{{ comment.user ?? '—' }}</span>
                                <span>{{ comment.created_at }}</span>
                            </div>
                            <p class="whitespace-pre-line text-sm text-gray-800">{{ comment.comment }}</p>
                        </li>
                    </ul>

                    <form v-if="auth.can('supportTickets.addComment')" class="mt-4 space-y-2" @submit.prevent="addComment">
                        <Textarea v-model="newComment" label="Add a comment" :rows="3" :error="commentError" />
                        <div class="flex justify-end">
                            <Button type="submit" variant="primary" size="sm" :disabled="posting">
                                {{ posting ? 'Posting…' : 'Post comment' }}
                            </Button>
                        </div>
                    </form>
                </FullWidthBox>
            </div>

            <FullWidthBox v-if="auth.can('supportTickets.updateStatus')" title="Status" :collapsible="false">
                <p class="mb-3 text-sm text-gray-500">Move this ticket through its lifecycle.</p>
                <div class="flex flex-col gap-2">
                    <button
                        v-for="s in statuses"
                        :key="s.value"
                        type="button"
                        :disabled="savingStatus || s.value === ticket.status"
                        class="rounded border px-3 py-2 text-left text-sm disabled:opacity-60"
                        :class="s.value === ticket.status ? 'border-red-500 bg-red-50 font-medium text-red-700' : 'border-gray-300 hover:bg-gray-50'"
                        @click="changeStatus(s.value)"
                    >
                        {{ s.label }}
                        <span v-if="s.value === ticket.status" class="text-xs">(current)</span>
                    </button>
                </div>
                <p v-if="ticket.status === 3 && ticket.resolved_by" class="mt-3 text-xs text-gray-400">
                    Resolved by {{ ticket.resolved_by }} · {{ ticket.resolved_at }}
                </p>
            </FullWidthBox>
        </div>
    </AppLayout>
</template>
