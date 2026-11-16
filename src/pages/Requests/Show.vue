<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import api from '../../helpers/api';
import { routeUrl } from '../../helpers/route.js';
import { castResource } from '../../types/responses.js';
import { useAuthStore } from '../../stores/auth';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import Button from '../../components/Button.vue';
import InputText from '../../components/Form/InputText.vue';
import Select from '../../components/Form/Select.vue';
import Textarea from '../../components/Form/Textarea.vue';
import Loader from '../../components/Loader.vue';
import SourceIcon from './SourceIcon.vue';
import { requestStatusClass } from './statusClass.js';

const route = useRoute();
const auth = useAuthStore();

const task = ref(null);
const options = ref({ statuses: [], sources: [], agents: [] });

const assignee = ref(null);
const assigning = ref(false);
const assignError = ref('');

const statusComment = ref('');
const savingStatus = ref(false);

const editing = ref(false);
const editForm = reactive({ customer_name: '', customer_contact: '', source: null, description: '' });
const editErrors = ref({});
const savingEdit = ref(false);

/** Where the contact opens: the Instagram / Facebook profile, a WhatsApp chat, a call or an e-mail. */
const contactHref = computed(() => {
    const contact = (task.value?.customer_contact ?? '').trim();
    if (! contact) {
        return null;
    }
    const handle = contact.replace(/^.*(instagram|facebook)\.com\//i, '').replace(/^[@/]+/, '').replace(/\/+$/, '');
    switch (task.value.source.id) {
        case 6: return /^[\w.]+$/.test(handle) ? `https://instagram.com/${handle}` : null;
        case 7: return /^[\w.]+$/.test(handle) ? `https://facebook.com/${handle}` : null;
        case 2: {
            const digits = contact.replace(/\D/g, '').replace(/^00/, '');
            return digits.length >= 8 ? `https://wa.me/${digits}` : null;
        }
        default:
            if (/^\S+@\S+\.\S+$/.test(contact)) {
                return `mailto:${contact}`;
            }
            return contact.replace(/[^\d+]/g, '').length >= 6 ? `tel:${contact.replace(/[^\d+]/g, '')}` : null;
    }
});

const agentOptions = computed(() => options.value.agents.map((a) => ({ value: a.id, label: a.name })));
const sourceOptions = computed(() => options.value.sources.map((s) => ({ value: s.id, label: s.name })));

async function load() {
    const { data } = await api.get(`/simple-tasks/${route.params.id}`);
    task.value = castResource(data);
    assignee.value = task.value.assigned_to?.id ?? null;
}

onMounted(async () => {
    task.value = null;
    const [, optionsResponse] = await Promise.all([load(), api.get('/simple-tasks/options')]);
    options.value = castResource(optionsResponse.data);
});
watch(() => route.params.id, () => {
    task.value = null;
    load();
});

function firstErrors(error) {
    return Object.fromEntries(
        Object.entries(error.response?.data?.errors ?? {}).map(([field, messages]) => [field, messages[0]]),
    );
}

async function saveAssignee() {
    if (assigning.value) {
        return;
    }

    assigning.value = true;
    assignError.value = '';

    try {
        await api.put(`/simple-tasks/${task.value.id}/assignee`, { assigned_to: assignee.value });
        await load();
    } catch (error) {
        if (error.response?.status !== 422) {
            throw error;
        }
        assignError.value = firstErrors(error).assigned_to ?? 'Could not assign.';
    } finally {
        assigning.value = false;
    }
}

async function changeStatus(statusId) {
    if (savingStatus.value || statusId === task.value.status.id) {
        return;
    }

    savingStatus.value = true;

    try {
        await api.put(`/simple-tasks/${task.value.id}/status`, { status: statusId, comment: statusComment.value || null });
        statusComment.value = '';
        await load();
    } finally {
        savingStatus.value = false;
    }
}

function startEdit() {
    Object.assign(editForm, {
        customer_name: task.value.customer_name,
        customer_contact: task.value.customer_contact ?? '',
        source: task.value.source.id,
        description: task.value.description ?? '',
    });
    editErrors.value = {};
    editing.value = true;
}

async function saveEdit() {
    if (savingEdit.value) {
        return;
    }

    savingEdit.value = true;
    editErrors.value = {};

    try {
        await api.put(`/simple-tasks/${task.value.id}`, editForm);
        editing.value = false;
        await load();
    } catch (error) {
        if (error.response?.status !== 422) {
            throw error;
        }
        editErrors.value = firstErrors(error);
    } finally {
        savingEdit.value = false;
    }
}
</script>

<template>
    <AppLayout :title="task ? `Request #${task.id}` : 'Request'" fluid>
        <Loader v-if="! task" />

        <div v-else class="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div class="space-y-6 lg:col-span-2">
                <FullWidthBox :title="`#${task.id} · ${task.customer_name}`" :collapsible="false">
                    <template #actions>
                        <span class="text-sm text-gray-500">
                            Assigned to:
                            <span class="font-medium" :class="task.assigned_to ? 'text-gray-900' : 'text-red-600'">{{ task.assigned_to?.name ?? 'Nobody yet' }}</span>
                        </span>
                    </template>

                    <template v-if="! editing">
                        <div class="mb-4">
                            <span class="rounded px-2 py-0.5 text-xs font-medium" :class="requestStatusClass(task.status)">{{ task.status.name }}</span>
                        </div>

                        <dl class="space-y-4 text-sm">
                            <div>
                                <dt class="text-xs uppercase text-gray-400">Source</dt>
                                <dd class="mt-1 flex flex-wrap items-center gap-2">
                                    <SourceIcon :source="task.source" />
                                    <span class="font-medium">{{ task.source.name }}</span>
                                    <template v-if="task.customer_contact">
                                        <span class="text-gray-300">·</span>
                                        <a v-if="contactHref" :href="contactHref" target="_blank" rel="noopener" class="text-red-600 hover:underline">{{ task.customer_contact }}</a>
                                        <span v-else>{{ task.customer_contact }}</span>
                                    </template>
                                </dd>
                            </div>
                            <div>
                                <dt class="text-xs uppercase text-gray-400">What does the customer want?</dt>
                                <dd class="mt-1 whitespace-pre-line text-gray-800">{{ task.description || '—' }}</dd>
                            </div>
                            <div v-if="task.finished_at">
                                <dt class="text-xs uppercase text-gray-400">Finished</dt>
                                <dd class="mt-1">{{ task.finished_by?.name ?? '—' }} · {{ task.finished_at }}</dd>
                            </div>
                        </dl>

                        <div v-if="auth.can('simpleTasks.changeStatus')" class="mt-6 border-t border-gray-100 pt-4">
                            <Textarea v-model="statusComment" label="Comment (optional)" :rows="3" maxlength="200" />
                            <p class="mt-1 text-xs text-gray-400">Saved in the history with the next status change.</p>
                        </div>
                    </template>

                    <form v-else class="grid grid-cols-1 gap-4 md:grid-cols-2" @submit.prevent="saveEdit">
                        <InputText v-model="editForm.customer_name" label="Customer name *" :error="editErrors.customer_name" />
                        <InputText v-model="editForm.customer_contact" label="Phone / email / username" :error="editErrors.customer_contact" />
                        <Select v-model="editForm.source" label="Source *" :options="sourceOptions" :error="editErrors.source" />
                        <div class="md:col-span-2">
                            <Textarea v-model="editForm.description" label="What does the customer want?" :rows="5" :error="editErrors.description" />
                        </div>
                        <div class="flex justify-end gap-2 md:col-span-2">
                            <Button type="button" size="sm" @click="editing = false">Cancel</Button>
                            <Button type="submit" variant="primary" size="sm" :disabled="savingEdit">{{ savingEdit ? 'Saving…' : 'Save' }}</Button>
                        </div>
                    </form>

                    <template #footer>
                        <div class="flex gap-2">
                            <RouterLink :to="routeUrl('simpleTasks.list')" class="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50">Back to list</RouterLink>
                            <Button v-if="auth.can('simpleTasks.edit') && ! editing" size="sm" @click="startEdit">Edit</Button>
                        </div>
                    </template>
                </FullWidthBox>

                <FullWidthBox title="History" :collapsible="false">
                    <p v-if="task.history.length === 0" class="text-sm text-gray-400">No history yet.</p>
                    <ul v-else class="space-y-2">
                        <li v-for="entry in task.history" :key="entry.id" class="flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-100 pb-2 text-sm">
                            <span>
                                <span class="font-medium">{{ entry.type }}</span>
                                <span v-if="entry.comment" class="text-gray-600"> · {{ entry.comment }}</span>
                            </span>
                            <span class="text-xs text-gray-400">{{ entry.user ?? 'System' }} · {{ entry.created_at }}</span>
                        </li>
                    </ul>
                </FullWidthBox>
            </div>

            <div class="space-y-6">
                <FullWidthBox v-if="auth.can('simpleTasks.assign')" title="Assign" :collapsible="false">
                    <div class="space-y-3">
                        <Select v-model="assignee" :options="agentOptions" placeholder="Not assigned" :error="assignError" />
                        <Button
                            variant="primary"
                            size="sm"
                            :disabled="assigning || assignee === (task.assigned_to?.id ?? null)"
                            @click="saveAssignee"
                        >{{ assigning ? 'Saving…' : (assignee ? 'Assign' : 'Unassign') }}</Button>
                        <p class="text-xs text-gray-400">The agent gets a notification.</p>
                    </div>
                </FullWidthBox>

                <FullWidthBox v-if="auth.can('simpleTasks.changeStatus')" title="Status" :collapsible="false">
                    <div class="space-y-3">
                        <div class="flex flex-col gap-2">
                            <button
                                v-for="s in options.statuses"
                                :key="s.id"
                                type="button"
                                :disabled="savingStatus || s.id === task.status.id"
                                class="rounded border px-3 py-2 text-left text-sm disabled:opacity-60"
                                :class="s.id === task.status.id ? 'border-red-500 bg-red-50 font-medium text-red-700' : 'border-gray-300 hover:bg-gray-50'"
                                @click="changeStatus(s.id)"
                            >
                                {{ s.name }}
                                <span v-if="s.id === task.status.id" class="text-xs">(current)</span>
                            </button>
                        </div>
                        <p class="text-xs text-gray-400">Offer sent and Spam finish the request and notify the responsible agents.</p>
                    </div>
                </FullWidthBox>
            </div>
        </div>
    </AppLayout>
</template>
