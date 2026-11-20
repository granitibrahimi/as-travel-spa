<script setup>
import { formatPhone, normalizePhone } from '../../helpers/phone.js';
import SpamBadge from './SpamBadge.vue';
import FromBossBadge from './FromBossBadge.vue';
import SpamIcon from './SpamIcon.vue';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
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
import TypeBadge from './TypeBadge.vue';
import { useRequestViewing } from '../../composables/useRequestViewing.js';
import AddOfferDialog from './AddOfferDialog.vue';
import DestinationsSection from './DestinationsSection.vue';
import CustomerSection from './CustomerSection.vue';
import CustomerOverviewDialog from './CustomerOverviewDialog.vue';
import DeleteRequestDialog from './DeleteRequestDialog.vue';
import SuggestionsBox from '../../components/LinkSuggestions/SuggestionsBox.vue';
import { contactFieldsFromTask, emptyContactFields, requestPayload } from './customerContact.js';

const route = useRoute();
// Boards show a "working" icon while this request is open here.
useRequestViewing(() => route.params.id);
const auth = useAuthStore();
const router = useRouter();

// Deleting for good (simpleTasks.delete): back to the list afterwards.
const deleting = ref(null);
function onDeleted() {
    deleting.value = null;
    router.push(routeUrl('simpleTasks.list'));
}

const task = ref(null);
const options = ref({ statuses: [], sources: [], agents: [] });

const assignee = ref(null);
const assigning = ref(false);
const assignError = ref('');

const statusComment = ref('');
const savingStatus = ref(false);

const editing = ref(false);
// Customer whose overview popup (invoices, requests, persons) is open.
const overviewCustomer = ref(null);
const editForm = reactive({ ...emptyContactFields(), source: null, type: null, description: '', urgent: false, from_flamur: false, from_vesa: false, spam: false, combo: false, specific_hotel: '' });
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
            {
                // Stored numbers are digits with country code: dial them with "+".
                const number = normalizePhone(contact);
                if (/^\d{7,}$/.test(number)) {
                    return `tel:+${number}`;
                }
                return contact.replace(/[^\d+]/g, '').length >= 6 ? `tel:${contact.replace(/[^\d+]/g, '')}` : null;
            }
    }
});

const agentOptions = computed(() => options.value.agents.map((a) => ({ value: a.id, label: a.name })));
const sourceOptions = computed(() => options.value.sources.map((s) => ({ value: s.id, label: s.name })));
const typeOptions = computed(() => (options.value.types ?? []).map((t) => ({ value: t.id, label: t.name })));

async function load() {
    const { data } = await api.get(`/simple-tasks/${route.params.id}`);
    const loaded = castResource(data);
    // Empty lists can be left out of the API response.
    task.value = { ...loaded, offers: loaded.offers ?? [], history: loaded.history ?? [] };
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

// Offers are added one by one (several per request); closing is a status.
const offerDialog = ref(false);

async function offerSaved() {
    offerDialog.value = false;
    await load();
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
        ...contactFieldsFromTask(task.value),
        source: task.value.source.id,
        type: task.value.type?.id ?? null,
        description: task.value.description ?? '',
        urgent: Boolean(task.value.urgent),
        from_flamur: Boolean(task.value.from_flamur),
        from_vesa: Boolean(task.value.from_vesa),
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
        await api.put(`/simple-tasks/${task.value.id}`, { ...requestPayload(editForm, options.value.sources), parent_destination_ids: editDestinations.value.map((d) => d.id) });
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
                <SuggestionsBox
                    v-if="! task.contact && ! task.spam"
                    :params="{ simple_task_id: task.id }"
                    context="request"
                    title="Is this the traveler?"
                    @linked="load"
                />
                <FullWidthBox :title="`#${task.id} · ${task.customer_name}`" :collapsible="false">
                    <template #actions>
                        <FromBossBadge :task="task" size="md" />
                        <span v-if="task.urgent" class="rounded bg-red-600 px-2 py-0.5 text-xs font-semibold uppercase text-white">Urgent</span>
                        <SpamBadge v-if="task.spam" size="md" />
                        <span class="text-sm text-gray-500">
                            Assigned to:
                            <span class="font-medium" :class="task.assigned_to ? 'text-gray-900' : 'text-red-600'">{{ task.assigned_to?.name ?? 'Nobody yet' }}</span>
                        </span>
                        <Button v-if="auth.can('simpleTasks.delete')" size="sm" variant="danger" @click="deleting = task">Delete</Button>
                    </template>

                    <template v-if="! editing">
                        <div v-if="task.spam" class="mb-4 flex items-center gap-2 rounded border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800">
                            <SpamIcon class="h-4 w-4 shrink-0" />
                            This request is flagged as spam. It keeps its status and doesn't count as waiting.
                        </div>
                        <dl class="space-y-4 text-sm">
                            <!-- Who wrote to us (the person) vs. the customer account they belong to. -->
                            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div class="rounded border border-gray-200 bg-gray-50 px-3 py-2">
                                    <dt class="flex items-center gap-1.5 text-xs uppercase text-gray-500">
                                        <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0H3Z" /></svg>
                                        Contact person
                                    </dt>
                                    <dd v-if="task.contact?.person" class="mt-1">
                                        <RouterLink :to="routeUrl('persons.show', task.contact.person.id)" class="font-medium text-red-600 hover:underline">{{ task.contact.person.name }}</RouterLink>
                                        <p class="text-xs text-gray-500">{{ task.contact.type.name }} · {{ formatPhone(task.contact.reference) }}</p>
                                    </dd>
                                    <dd v-else class="mt-1">
                                        <span class="font-medium">{{ task.customer_name }}</span>
                                        <p class="text-xs text-gray-400">Not saved as a traveler yet (Edit to link)</p>
                                    </dd>
                                </div>
                                <div class="rounded border px-3 py-2" :class="task.contact?.customers?.length ? 'border-blue-200 bg-blue-50' : 'border-dashed border-gray-300'">
                                    <dt class="flex items-center gap-1.5 text-xs uppercase" :class="task.contact?.customers?.length ? 'text-blue-700' : 'text-gray-500'">
                                        <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M4 3h8v14H4V3Zm9 5h3v9h-3V8ZM6 5v2h2V5H6Zm0 4v2h2V9H6Zm0 4v2h2v-2H6Z" /></svg>
                                        {{ (task.contact?.customers?.length ?? 0) > 1 ? 'Customers' : 'Customer' }}
                                    </dt>
                                    <dd v-if="task.contact?.customers?.length" class="mt-1 space-y-1">
                                        <div v-for="customer in task.contact.customers" :key="customer.id" class="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                                            <RouterLink :to="routeUrl('customers.show', customer.id)" class="font-medium text-red-600 hover:underline">{{ customer.name }}</RouterLink>
                                            <span v-if="customer.relation" class="rounded bg-white px-1.5 py-0.5 text-xs text-blue-700">as {{ customer.relation }}</span>
                                            <button
                                                type="button"
                                                class="ml-auto inline-flex items-center gap-1.5 rounded border border-blue-300 bg-white px-2.5 py-1 text-xs font-medium text-blue-700 shadow-sm hover:bg-blue-100"
                                                title="Debt, invoices, requests and persons of this customer"
                                                @click="overviewCustomer = customer"
                                            >
                                                <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M3 16h14v1.5H3V16Zm1-6h2.5v5H4v-5Zm4.75-4h2.5v9h-2.5V6Zm4.75 2.5H16V15h-2.5V8.5Z" /></svg>
                                                Stats
                                            </button>
                                        </div>
                                    </dd>
                                    <dd v-else class="mt-1 text-sm text-gray-400">Not connected to a customer</dd>
                                </div>
                            </div>
                            <div v-if="task.type">
                                <dt class="text-xs uppercase text-gray-400">Type</dt>
                                <dd class="mt-1"><TypeBadge :type="task.type" /></dd>
                            </div>
                            <div>
                                <dt class="text-xs uppercase text-gray-400">Source</dt>
                                <dd class="mt-1 flex flex-wrap items-center gap-2">
                                    <SourceIcon :source="task.source" />
                                    <span class="font-medium">{{ task.source.name }}</span>
                                    <template v-if="task.customer_contact">
                                        <span class="text-gray-300">·</span>
                                        <a v-if="contactHref" :href="contactHref" target="_blank" rel="noopener" class="text-red-600 hover:underline">{{ formatPhone(task.customer_contact) }}</a>
                                        <span v-else>{{ formatPhone(task.customer_contact) }}</span>
                                    </template>
                                </dd>
                            </div>
                            <div v-if="destinations.length || task.combo || task.specific_hotel" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <dt class="text-xs uppercase text-gray-400">Destinations</dt>
                                    <dd class="mt-1 flex flex-wrap items-center gap-1.5">
                                        <span v-if="task.combo" class="rounded bg-indigo-100 px-2 py-0.5 text-xs font-semibold uppercase text-indigo-700">Combo</span>
                                        <span v-for="d in destinations" :key="d.id" class="rounded-full border border-gray-300 bg-gray-50 px-2.5 py-0.5 font-medium">{{ d.name }}</span>
                                        <span v-if="! destinations.length" class="font-medium">—</span>
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
                            <div>
                                <dt class="flex items-center justify-between text-xs uppercase text-gray-400">
                                    <span>{{ task.offers.length }} {{ task.offers.length === 1 ? 'offer' : 'offers' }} sent</span>
                                    <Button v-if="auth.can('simpleTasks.changeStatus')" size="sm" variant="primary" @click="offerDialog = true">+ Add offer</Button>
                                </dt>
                                <dd v-if="task.offers.length" class="mt-2 space-y-2">
                                    <div v-for="(offer, index) in task.offers" :key="offer.id ?? 'legacy'" class="rounded border border-green-200 bg-green-50 p-3">
                                        <p class="mb-1 text-xs text-gray-500">Offer {{ index + 1 }}<template v-if="offer.user"> · {{ offer.user }}</template><template v-if="offer.created_at"> · {{ offer.created_at }}</template></p>
                                        <p class="whitespace-pre-line text-gray-800">{{ offer.offer_text }}</p>
                                    </div>
                                </dd>
                                <dd v-else class="mt-1 text-gray-400">No offer sent yet.</dd>
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
                        <Select v-model="editForm.source" label="Source *" :options="sourceOptions" :error="editErrors.source" />
                        <div class="hidden md:block" />
                        <div class="md:col-span-2">
                            <CustomerSection
                                :form="editForm"
                                :errors="editErrors"
                                :sources="options.sources"
                                :relation-types="options.relation_types ?? []"
                                :initial-contact="task.contact"
                            />
                        </div>
                        <Select v-model="editForm.type" label="Type *" :options="typeOptions" :error="editErrors.type" />
                        <InputText v-model="editForm.specific_hotel" label="Specific hotel" placeholder="Optional" :error="editErrors.specific_hotel" />
                        <div class="md:col-span-2">
                            <DestinationsSection v-model:destinations="editDestinations" v-model:combo="editForm.combo" :errors="editErrors" />
                        </div>
                        <div class="flex flex-wrap gap-6 md:col-span-2">
                            <NiceCheckbox v-model="editForm.urgent" label="Urgent" :error="editErrors.urgent" />
                            <NiceCheckbox v-model="editForm.from_flamur" label="Request from Flamur" :error="editErrors.from_flamur" />
                            <NiceCheckbox v-model="editForm.from_vesa" label="Request from Vesa" :error="editErrors.from_vesa" />
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
                        <p class="text-xs text-gray-400">Closed finishes the request and notifies the responsible agents.</p>
                        <div class="border-t border-gray-100 pt-3">
                            <button
                                type="button"
                                :disabled="savingSpam"
                                class="flex w-full items-center gap-2 rounded border px-3 py-2 text-left text-sm font-medium disabled:opacity-60"
                                :class="task.spam ? 'border-orange-500 bg-orange-500 text-white hover:bg-orange-600' : 'border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100'"
                                @click="toggleSpam"
                            >
                                <SpamIcon class="h-4 w-4 shrink-0" />
                                {{ task.spam ? 'Flagged as spam · click to remove' : 'Mark as spam' }}
                            </button>
                            <p class="mt-1 text-xs text-gray-400">A flag, like Urgent: the status stays. Marking notifies the responsible agents.</p>
                        </div>
                    </div>
                </FullWidthBox>
            </div>
        </div>

        <AddOfferDialog :show="offerDialog" :task="task" @saved="offerSaved" @cancel="offerDialog = false" />
        <CustomerOverviewDialog :customer="overviewCustomer" @close="overviewCustomer = null" />
        <DeleteRequestDialog :task="deleting" @close="deleting = null" @deleted="onDeleted" />
    </AppLayout>
</template>
