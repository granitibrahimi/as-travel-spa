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
import NiceCheckbox from '../../components/Form/NiceCheckbox.vue';
import Loader from '../../components/Loader.vue';
import SourceIcon from './SourceIcon.vue';
import OfferSentDialog from './OfferSentDialog.vue';
import DestinationsSection from './DestinationsSection.vue';

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
const editForm = reactive({ customer_name: '', customer_contact: '', source: null, description: '', urgent: false, spam: false, combo: false, specific_hotel: '' });
const editDestinations = ref([]);
const destinations = computed(() => task.value?.parent_destinations ?? (task.value?.parent_destination ? [task.value.parent_destination] : []));
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

// Status id from the API's SimpleTaskStatus enum: Offer sent asks for the offer text first.
const OFFER_SENT = 3;
const offerDialog = ref(false);
const offerError = ref('');

async function changeStatus(statusId, extra = {}) {
    if (savingStatus.value || statusId === task.value.status.id) {
        return;
    }

    if (statusId === OFFER_SENT && ! extra.offer_text) {
        offerError.value = '';
        offerDialog.value = true;
        return;
    }

    savingStatus.value = true;

    try {
        await api.put(`/simple-tasks/${task.value.id}/status`, { status: statusId, comment: statusComment.value || null, ...extra });
        statusComment.value = '';
        offerDialog.value = false;
        await load();
    } catch (error) {
        if (error.response?.status !== 422 || ! offerDialog.value) {
            throw error;
        }
        offerError.value = Object.values(firstErrors(error))[0] ?? 'Could not save.';
    } finally {
        savingStatus.value = false;
    }
}

// Spam is a flag (like Urgent), not a status.
const savingSpam = ref(false);

async function toggleSpam() {
    if (savingSpam.value) {
        return;
    }

    savingSpam.value = true;

    try {
        await api.put(`/simple-tasks/${task.value.id}/spam`, { spam: ! task.value.spam });
        await load();
    } finally {
        savingSpam.value = false;
    }
}

function confirmOfferSent({ offerText, comment }) {
    statusComment.value = comment ?? '';
    changeStatus(OFFER_SENT, { offer_text: offerText });
}

const savingComment = ref(false);
const commentError = ref('');

async function saveComment() {
    if (savingComment.value || ! statusComment.value.trim()) {
        return;
    }

    savingComment.value = true;
    commentError.value = '';

    try {
        await api.post(`/simple-tasks/${task.value.id}/comments`, { comment: statusComment.value.trim() });
        statusComment.value = '';
        await load();
    } catch (error) {
        if (error.response?.status !== 422) {
            throw error;
        }
        commentError.value = firstErrors(error).comment ?? 'Could not save the comment.';
    } finally {
        savingComment.value = false;
    }
}

function startEdit() {
    Object.assign(editForm, {
        customer_name: task.value.customer_name,
        customer_contact: task.value.customer_contact ?? '',
        source: task.value.source.id,
        description: task.value.description ?? '',
        urgent: Boolean(task.value.urgent),
        spam: Boolean(task.value.spam),
        combo: Boolean(task.value.combo),
        specific_hotel: task.value.specific_hotel ?? '',
    });
    editDestinations.value = destinations.value.map((d) => ({ id: d.id, name: d.name }));
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
        await api.put(`/simple-tasks/${task.value.id}`, { ...editForm, parent_destination_ids: editDestinations.value.map((d) => d.id) });
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
                        <span v-if="task.urgent" class="rounded bg-red-600 px-2 py-0.5 text-xs font-semibold uppercase text-white">Urgent</span>
                        <span v-if="task.spam" class="rounded bg-gray-700 px-2 py-0.5 text-xs font-semibold uppercase text-white">Spam</span>
                        <span class="text-sm text-gray-500">
                            Assigned to:
                            <span class="font-medium" :class="task.assigned_to ? 'text-gray-900' : 'text-red-600'">{{ task.assigned_to?.name ?? 'Nobody yet' }}</span>
                        </span>
                    </template>

                    <template v-if="! editing">
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
                            <div v-if="destinations.length || task.combo || task.specific_hotel" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <dt class="text-xs uppercase text-gray-400">Destinations</dt>
                                    <dd class="mt-1 flex flex-wrap items-center gap-1.5">
                                        <span v-for="d in destinations" :key="d.id" class="rounded-full border border-gray-300 bg-gray-50 px-2.5 py-0.5 font-medium">{{ d.name }}</span>
                                        <span v-if="! destinations.length" class="font-medium">—</span>
                                        <span v-if="task.combo" class="rounded bg-indigo-100 px-2 py-0.5 text-xs font-semibold uppercase text-indigo-700">Combo</span>
                                    </dd>
                                </div>
                                <div>
                                    <dt class="text-xs uppercase text-gray-400">Specific hotel</dt>
                                    <dd class="mt-1 font-medium">{{ task.specific_hotel || '—' }}</dd>
                                </div>
                            </div>
                            <div>
                                <dt class="text-xs uppercase text-gray-400">What does the customer want?</dt>
                                <dd class="mt-1 whitespace-pre-line text-gray-800">{{ task.description || '—' }}</dd>
                            </div>
                            <div v-if="task.offer_text">
                                <dt class="text-xs uppercase text-gray-400">Offer sent<template v-if="task.offer_sent_at"> · {{ task.offer_sent_at }}</template></dt>
                                <dd class="mt-1 whitespace-pre-line rounded border border-green-200 bg-green-50 p-3 text-gray-800">{{ task.offer_text }}</dd>
                            </div>
                            <div v-if="task.finished_at">
                                <dt class="text-xs uppercase text-gray-400">Finished</dt>
                                <dd class="mt-1">{{ task.finished_by?.name ?? '—' }} · {{ task.finished_at }}</dd>
                            </div>
                        </dl>

                        <div class="mt-6 border-t border-gray-100 pt-4">
                            <Textarea v-model="statusComment" label="Comment" :rows="3" maxlength="200" :error="commentError" />
                            <div class="mt-2 flex flex-wrap items-center justify-between gap-2">
                                <p class="text-xs text-gray-400">
                                    Saved in the history.<template v-if="auth.can('simpleTasks.changeStatus')"> Changing the status also saves it, together with the change.</template>
                                </p>
                                <Button size="sm" variant="primary" :disabled="savingComment || ! statusComment.trim()" @click="saveComment">
                                    {{ savingComment ? 'Saving…' : 'Save comment' }}
                                </Button>
                            </div>
                        </div>
                    </template>

                    <form v-else class="grid grid-cols-1 gap-4 md:grid-cols-2" @submit.prevent="saveEdit">
                        <InputText v-model="editForm.customer_name" label="Customer name *" :error="editErrors.customer_name" />
                        <InputText v-model="editForm.customer_contact" label="Phone / email / username" :error="editErrors.customer_contact" />
                        <Select v-model="editForm.source" label="Source *" :options="sourceOptions" :error="editErrors.source" />
                        <InputText v-model="editForm.specific_hotel" label="Specific hotel" placeholder="Optional" :error="editErrors.specific_hotel" />
                        <div class="md:col-span-2">
                            <DestinationsSection v-model:destinations="editDestinations" v-model:combo="editForm.combo" :errors="editErrors" />
                        </div>
                        <div class="flex flex-wrap gap-6 md:col-span-2">
                            <NiceCheckbox v-model="editForm.urgent" label="Urgent" :error="editErrors.urgent" />
                            <NiceCheckbox v-model="editForm.spam" label="Spam" :error="editErrors.spam" />
                        </div>
                        <div class="md:col-span-2">
                            <Textarea v-model="editForm.description" label="What does the customer want? *" :rows="5" :error="editErrors.description" />
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
                        <p class="text-xs text-gray-400">Offer sent finishes the request and notifies the responsible agents.</p>
                        <div class="border-t border-gray-100 pt-3">
                            <button
                                type="button"
                                :disabled="savingSpam"
                                class="w-full rounded border px-3 py-2 text-left text-sm disabled:opacity-60"
                                :class="task.spam ? 'border-gray-700 bg-gray-700 text-white hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'"
                                @click="toggleSpam"
                            >{{ task.spam ? 'Marked as spam · click to remove' : 'Mark as spam' }}</button>
                            <p class="mt-1 text-xs text-gray-400">A flag, like Urgent: the status stays. Marking notifies the responsible agents.</p>
                        </div>
                    </div>
                </FullWidthBox>
            </div>
        </div>

        <OfferSentDialog
            :show="offerDialog"
            :task="task"
            :processing="savingStatus"
            :error="offerError"
            :initial-comment="statusComment"
            @confirm="confirmOfferSent"
            @cancel="offerDialog = false"
        />
    </AppLayout>
</template>
