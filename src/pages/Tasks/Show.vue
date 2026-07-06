<script setup>
import { onMounted, reactive, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import api from '../../helpers/api';
import AppLayout from '../../layouts/AppLayout.vue';
import Button from '../../components/Button.vue';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
import DropdownMenu from '../../components/DropdownMenu.vue';
import AsyncSelect from '../../components/Form/AsyncSelect.vue';
import InputNumber from '../../components/Form/InputNumber.vue';
import SearchSelect from '../../components/Form/SearchSelect.vue';
import Select from '../../components/Form/Select.vue';
import Loader from '../../components/Loader.vue';

const route = useRoute();
const id = route.params.id;

// Child-destination lookup lives under /api/customers (sibling of /api/v1).
const apiOrigin = new URL(import.meta.env.VITE_API_URL ?? '/api/v1', window.location.origin).origin;
const destinationsUrl = `${apiOrigin}/api/customers/child-destinations`;

const task = ref(null);
const contactReference = ref(null);
const offerRequests = ref([]);
const agents = ref([]);
const types = ref([]);
const history = ref([]);
const ready = ref(false);

const tab = ref('requests');

async function loadTask() {
    const [{ data: detail }, { data: meta }] = await Promise.all([
        api.get(`/tasks/${id}`),
        api.get(`/tasks/${id}/meta`),
    ]);

    const payload = detail.data ?? detail;
    task.value = payload.task;
    contactReference.value = payload.contactReference;
    offerRequests.value = (payload.offerRequests?.data ?? payload.offerRequests) ?? [];
    agents.value = meta.agents ?? [];
    types.value = meta.types ?? [];
    history.value = (meta.history?.data ?? meta.history) ?? [];

    assignForm.user_id = task.value.assigned_to?.id ?? null;
    if (types.value.length && requestForm.type === null) {
        requestForm.type = types.value[0].value;
    }
    ready.value = true;
}

onMounted(loadTask);

// --- AI conversation modal ---
const conversationOpen = ref(false);
const conversationLoading = ref(false);
const conversationMessages = ref([]);

async function openConversation() {
    conversationOpen.value = true;
    conversationLoading.value = true;
    conversationMessages.value = [];

    try {
        const { data } = await api.get(`/tasks/${id}/conversation`);
        conversationMessages.value = data.messages ?? [];
    } finally {
        conversationLoading.value = false;
    }
}

// --- Assign ---
const assignForm = reactive({ user_id: null });
const assigning = ref(false);
const assignErrors = ref({});

async function assign() {
    if (assigning.value || !assignForm.user_id) {
        return;
    }

    assigning.value = true;
    assignErrors.value = {};

    try {
        await api.post(`/tasks/${id}/assign`, { user_id: assignForm.user_id });
        await loadTask();
    } catch (error) {
        if (error.response?.status === 422) {
            assignErrors.value = Object.fromEntries(
                Object.entries(error.response.data.errors ?? {}).map(([field, messages]) => [field, messages[0]]),
            );
        } else {
            throw error;
        }
    } finally {
        assigning.value = false;
    }
}

async function unassign() {
    await api.delete(`/tasks/${id}/assign`);
    await loadTask();
}

// --- New offer request ---
const requestForm = reactive({
    type: null,
    destinations: [{ destination_id: null, nights: null, taxes_included: false }],
    adults_nr: 1,
    children_nr: 0,
    children_age: [],
    travel_from: '',
    travel_to: '',
    budget: null,
});
const requestProcessing = ref(false);
const requestErrors = ref({});

function seedRequestForm() {
    requestForm.adults_nr = task.value?.adults ?? 1;
    requestForm.children_nr = task.value?.children ?? 0;
    requestForm.children_age = [...(task.value?.children_ages ?? [])];
}

const addLeg = () => requestForm.destinations.push({ destination_id: null, nights: null, taxes_included: false });
const removeLeg = (index) => requestForm.destinations.splice(index, 1);

// Keep one age input per child.
watch(() => Number(requestForm.children_nr), (count) => {
    const target = Math.max(0, count || 0);
    const ages = [...requestForm.children_age];

    if (target > ages.length) {
        while (ages.length < target) {
            ages.push(null);
        }
    } else {
        ages.length = target;
    }

    requestForm.children_age = ages;
});

watch(tab, (value) => {
    if (value === 'createRequest') {
        seedRequestForm();
    }
});

async function storeRequest() {
    if (requestProcessing.value) {
        return;
    }

    requestProcessing.value = true;
    requestErrors.value = {};

    try {
        await api.post(`/tasks/${id}/offer-requests`, requestForm);
        Object.assign(requestForm, {
            type: types.value[0]?.value ?? null,
            destinations: [{ destination_id: null, nights: null, taxes_included: false }],
            travel_from: '',
            travel_to: '',
            budget: null,
        });
        tab.value = 'requests';
        await loadTask();
    } catch (error) {
        if (error.response?.status === 422) {
            requestErrors.value = Object.fromEntries(
                Object.entries(error.response.data.errors ?? {}).map(([field, messages]) => [field, messages[0]]),
            );
        } else {
            throw error;
        }
    } finally {
        requestProcessing.value = false;
    }
}

const requestActions = (request) => [
    ...request.offers.map((offer) => ({ label: `View ${offer.name}`, action: () => {} })),
    ...(request.obsolete ? [] : [{ label: 'Mark obsolete', danger: true, action: () => (requestToObsolete.value = request) }]),
];

// --- Mark offer request as obsolete ---
const requestToObsolete = ref(null);
const markingObsolete = ref(false);

async function confirmMarkObsolete() {
    if (markingObsolete.value) {
        return;
    }

    markingObsolete.value = true;

    try {
        await api.patch(`/tasks/${id}/offer-requests/${requestToObsolete.value.id}/obsolete`);
        requestToObsolete.value = null;
        await loadTask();
    } finally {
        markingObsolete.value = false;
    }
}

const tabs = [
    { key: 'requests', label: 'Offer requests' },
    { key: 'createRequest', label: 'Create request' },
    { key: 'assign', label: 'Assign' },
    { key: 'history', label: 'History' },
    { key: 'contact', label: 'Contact' },
];
</script>

<template>
    <AppLayout :title="task ? `Task #${task.id}` : 'Task'" fluid>
        <Loader v-if="! ready" />
        <div v-else class="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <!-- Left: task details -->
            <div class="space-y-6 lg:sticky lg:top-20 lg:self-start">
                <section class="rounded-lg border border-gray-200 bg-white p-5 shadow-lg">
                    <div class="mb-3 flex items-center justify-between">
                        <h2 class="text-lg font-semibold">Task details</h2>
                        <span class="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{{ task.status }}</span>
                    </div>

                    <table class="w-full border-collapse rounded border border-gray-300 text-sm">
                        <tbody>
                            <tr>
                                <td class="border border-gray-300 px-2 py-2 text-gray-500">Assigned to</td>
                                <td class="border border-gray-300 px-2 py-2 text-right font-medium">
                                    {{ task.assigned_to?.name ?? 'Not assigned' }}
                                    <button type="button" class="ml-1 text-xs text-red-600 hover:underline" @click="tab = 'assign'">Change</button>
                                </td>
                            </tr>
                            <tr>
                                <td class="border border-gray-300 px-2 py-2 text-gray-500">Type</td>
                                <td class="border border-gray-300 px-2 py-2 text-right font-medium">{{ task.type }}</td>
                            </tr>
                            <tr>
                                <td class="border border-gray-300 px-2 py-2 text-gray-500">Travellers</td>
                                <td class="border border-gray-300 px-2 py-2 text-right font-medium">
                                    {{ task.adults }} adults
                                    <template v-if="task.children"> + {{ task.children }} children ({{ task.children_ages.join(', ') }} y)</template>
                                </td>
                            </tr>
                            <tr v-if="task.travel_period">
                                <td class="border border-gray-300 px-2 py-2 text-gray-500">Travel period</td>
                                <td class="border border-gray-300 px-2 py-2 text-right font-medium">{{ task.travel_period }}</td>
                            </tr>
                            <tr v-if="task.budget">
                                <td class="border border-gray-300 px-2 py-2 text-gray-500">Budget</td>
                                <td class="border border-gray-300 px-2 py-2 text-right font-medium">{{ task.budget }}</td>
                            </tr>
                            <tr>
                                <td class="border border-gray-300 px-2 py-2 text-gray-500">Created</td>
                                <td class="border border-gray-300 px-2 py-2 text-right font-medium">
                                    {{ task.created_at }}
                                    <span class="block text-xs font-normal text-gray-400">{{ task.created_since }} by {{ task.created_by }}</span>
                                </td>
                            </tr>
                            <tr v-if="task.extra_notes">
                                <td class="border border-gray-300 px-2 py-2 text-gray-500">Notes</td>
                                <td class="border border-gray-300 px-2 py-2 text-right text-sm whitespace-pre-line">{{ task.extra_notes }}</td>
                            </tr>
                        </tbody>
                    </table>

                    <button
                        v-if="task.has_conversation"
                        type="button"
                        class="mt-3 inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        @click="openConversation"
                    >
                        <span>💬</span> View AI Conversation
                    </button>
                </section>
            </div>

            <!-- Right: tabs -->
            <div class="lg:col-span-2">
                <div class="rounded-lg border border-gray-200 bg-white shadow-lg">
                    <nav class="flex flex-wrap gap-1 border-b border-gray-200 px-3 pt-3">
                        <button v-for="item in tabs" :key="item.key" type="button"
                                class="rounded-t px-4 py-2 text-sm font-medium"
                                :class="tab === item.key ? 'border border-b-0 border-gray-200 bg-white text-red-600' : 'text-gray-500 hover:text-gray-800'"
                                @click="tab = item.key">
                            {{ item.label }}
                        </button>
                    </nav>

                    <div class="p-5">
                        <!-- Offer requests -->
                        <div v-if="tab === 'requests'">
                            <p v-if="offerRequests.length === 0" class="text-sm text-gray-400">
                                No offer requests yet.
                                <button type="button" class="text-red-600 hover:underline" @click="tab = 'createRequest'">Create one</button>
                            </p>
                            <table v-else class="w-full border-collapse border border-gray-300 text-sm">
                                <thead>
                                    <tr class="text-left text-xs uppercase text-gray-500">
                                        <th class="border border-gray-300 px-2 py-2" style="width: 50px;">ID</th>
                                        <th class="border border-gray-300 px-2 py-2">Request</th>
                                        <th class="border border-gray-300 px-2 py-2">Created</th>
                                        <th class="border border-gray-300 px-2 py-2 text-center" style="width: 90px;">Status</th>
                                        <th class="border border-gray-300 px-2 py-2 text-center" style="width: 60px;">Views</th>
                                        <th class="border border-gray-300 px-2 py-2 text-center" style="width: 110px;">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="request in offerRequests" :key="request.id"
                                        class="hover:bg-gray-50" :class="request.obsolete ? 'opacity-50' : ''">
                                        <td class="border border-gray-300 px-2 py-2 text-center font-medium">{{ request.id }}</td>
                                        <td class="border border-gray-300 px-2 py-2">
                                            <span class="font-medium">{{ request.type }}</span>
                                            <span v-for="(leg, li) in request.destinations" :key="li" class="block text-xs">
                                                {{ leg.name }}<template v-if="leg.nights">: {{ leg.nights }} nights</template>
                                                <span v-if="leg.taxes_included" class="ml-1 rounded bg-green-100 px-1 text-[10px] font-medium text-green-700">taxes incl.</span>
                                            </span>
                                            <span class="block text-xs text-gray-400">
                                                {{ request.adults }} adults<template v-if="request.children"> + {{ request.children }} children ({{ request.children_ages.join(', ') }})</template>
                                                <template v-if="request.travel_from || request.travel_to"> · {{ request.travel_from ?? '…' }} – {{ request.travel_to ?? '…' }}</template>
                                                <template v-if="request.budget"> · budget {{ request.budget }}</template>
                                            </span>
                                            <span v-for="offer in request.offers" :key="offer.id" class="block text-xs text-gray-500">
                                                ↳ {{ offer.name }} · {{ offer.created_at }}
                                            </span>
                                        </td>
                                        <td class="border border-gray-300 px-2 py-2 text-xs">
                                            {{ request.created_at }}
                                            <span class="block text-gray-400">by {{ request.created_by }}</span>
                                        </td>
                                        <td class="border border-gray-300 px-2 py-2 text-center text-xs">{{ request.status }}</td>
                                        <td class="border border-gray-300 px-2 py-2 text-center">{{ request.views ?? 0 }}</td>
                                        <td class="border border-gray-300 px-2 py-2 text-center">
                                            <DropdownMenu v-if="requestActions(request).length" :items="requestActions(request)" />
                                            <span v-else class="text-gray-300">—</span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <!-- Create offer request -->
                        <form v-else-if="tab === 'createRequest'" class="space-y-4" @submit.prevent="storeRequest">
                            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Select v-model="requestForm.type" :options="types" label="Type *" :placeholder="null" :error="requestErrors.type" />
                            </div>

                            <div>
                                <p class="mb-1 text-sm font-medium text-gray-700">Destinations *</p>
                                <p v-if="requestErrors.destinations" class="mb-1 text-xs text-red-600">{{ requestErrors.destinations }}</p>
                                <div v-for="(leg, li) in requestForm.destinations" :key="li" class="mb-2 grid grid-cols-1 gap-3 md:grid-cols-12">
                                    <div class="md:col-span-5">
                                        <AsyncSelect v-model="leg.destination_id" :url="destinationsUrl"
                                                     :placeholder="`Destination ${li + 1}…`"
                                                     :error="requestErrors[`destinations.${li}.destination_id`]" />
                                    </div>
                                    <div class="md:col-span-2">
                                        <InputNumber v-model="leg.nights" min="1" placeholder="Nights"
                                                     :error="requestErrors[`destinations.${li}.nights`]" />
                                    </div>
                                    <div class="flex items-center md:col-span-3">
                                        <label class="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                                            <input v-model="leg.taxes_included" type="checkbox"
                                                   class="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500">
                                            Taxes included
                                        </label>
                                    </div>
                                    <div class="flex items-center md:col-span-2">
                                        <button v-if="requestForm.destinations.length > 1" type="button"
                                                class="text-sm text-red-600 hover:underline" @click="removeLeg(li)">
                                            Remove
                                        </button>
                                    </div>
                                </div>
                                <button type="button" class="text-sm text-red-600 hover:underline" @click="addLeg">
                                    + Add destination
                                </button>
                            </div>

                            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label class="mb-1 block text-sm font-medium text-gray-700">Travel from</label>
                                    <input v-model="requestForm.travel_from" type="date"
                                           class="w-full rounded border border-gray-300 px-3 py-1.5 text-base font-normal leading-normal focus:border-red-500 focus:ring-1 focus:ring-red-500">
                                    <p v-if="requestErrors.travel_from" class="mt-1 text-xs text-red-600">{{ requestErrors.travel_from }}</p>
                                </div>
                                <div>
                                    <label class="mb-1 block text-sm font-medium text-gray-700">Travel to</label>
                                    <input v-model="requestForm.travel_to" type="date"
                                           class="w-full rounded border border-gray-300 px-3 py-1.5 text-base font-normal leading-normal focus:border-red-500 focus:ring-1 focus:ring-red-500">
                                    <p v-if="requestErrors.travel_to" class="mt-1 text-xs text-red-600">{{ requestErrors.travel_to }}</p>
                                </div>
                                <InputNumber v-model="requestForm.adults_nr" label="Adults *" min="1" :error="requestErrors.adults_nr" />
                                <InputNumber v-model="requestForm.children_nr" label="Children *" min="0" :error="requestErrors.children_nr" />
                                <InputNumber v-model="requestForm.budget" label="Budget (€)" min="0" step="0.01" :error="requestErrors.budget" />
                            </div>

                            <div v-if="requestForm.children_age.length">
                                <label class="mb-1 block text-sm font-medium text-gray-700">Child ages *</label>
                                <div class="flex flex-wrap gap-3">
                                    <div v-for="(age, ci) in requestForm.children_age" :key="ci" class="w-28">
                                        <InputNumber v-model="requestForm.children_age[ci]" min="0"
                                                     :placeholder="`Child ${ci + 1}`"
                                                     :error="requestErrors[`children_age.${ci}`]" />
                                    </div>
                                </div>
                            </div>
                            <div class="flex justify-end">
                                <Button type="submit" variant="primary" :disabled="requestProcessing">
                                    {{ requestProcessing ? 'Saving…' : 'Create request' }}
                                </Button>
                            </div>
                        </form>

                        <!-- Assign -->
                        <div v-else-if="tab === 'assign'" class="space-y-4">
                            <div v-if="task.assigned_to" class="flex items-center justify-between rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
                                <span>Currently assigned to <strong>{{ task.assigned_to.name }}</strong></span>
                                <button type="button" class="text-red-600 hover:underline" @click="unassign">Unassign</button>
                            </div>

                            <form class="flex flex-wrap items-end gap-3" @submit.prevent="assign">
                                <div class="w-full md:max-w-sm">
                                    <SearchSelect v-model="assignForm.user_id" :options="agents" label="Agent"
                                                  placeholder="Search agent…" :error="assignErrors.user_id" />
                                </div>
                                <Button type="submit" variant="primary" :disabled="assigning || !assignForm.user_id">
                                    {{ assigning ? 'Assigning…' : 'Assign' }}
                                </Button>
                            </form>
                        </div>

                        <!-- History -->
                        <div v-else-if="tab === 'history'">
                            <p v-if="history.length === 0" class="text-sm text-gray-400">No history yet.</p>
                            <ol v-else class="space-y-2">
                                <li v-for="entry in history" :key="entry.id" class="rounded border border-gray-100 bg-gray-50 px-3 py-2 text-sm">
                                    <span class="font-medium">{{ entry.type }}</span>
                                    <template v-if="entry.comment"> — {{ entry.comment }}</template>
                                    <span class="block text-xs text-gray-400">{{ entry.created_at }} · {{ entry.user }}</span>
                                </li>
                            </ol>
                        </div>

                        <!-- Contact -->
                        <div v-else-if="tab === 'contact'">
                            <table class="w-full border-collapse rounded border border-gray-300 text-sm md:max-w-lg">
                                <tbody>
                                    <tr>
                                        <td class="border border-gray-300 px-2 py-2 text-gray-500">Name</td>
                                        <td class="border border-gray-300 px-2 py-2 text-right font-medium">{{ contactReference?.name || '—' }}</td>
                                    </tr>
                                    <tr>
                                        <td class="border border-gray-300 px-2 py-2 text-gray-500">Reference</td>
                                        <td class="border border-gray-300 px-2 py-2 text-right font-medium">{{ contactReference?.reference }}</td>
                                    </tr>
                                    <tr>
                                        <td class="border border-gray-300 px-2 py-2 text-gray-500">Source</td>
                                        <td class="border border-gray-300 px-2 py-2 text-right font-medium">{{ contactReference?.source }}</td>
                                    </tr>
                                    <tr v-if="contactReference?.customer">
                                        <td class="border border-gray-300 px-2 py-2 text-gray-500">Customer</td>
                                        <td class="border border-gray-300 px-2 py-2 text-right font-medium">
                                            <RouterLink :to="`/customers/${contactReference.customer.id}`" class="text-red-600 hover:underline">{{ contactReference.customer.name }}</RouterLink>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div class="mt-4 flex justify-end">
                    <RouterLink to="/tasks" class="inline-block rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">← All tasks</RouterLink>
                </div>
            </div>
        </div>

        <ConfirmDialog
            :show="Boolean(requestToObsolete)"
            title="Mark request as obsolete?"
            :message="requestToObsolete ? `Request #${requestToObsolete.id} will be kept for history but marked obsolete.` : ''"
            confirm-label="Yes, mark obsolete"
            :processing="markingObsolete"
            @confirm="confirmMarkObsolete"
            @cancel="requestToObsolete = null"
        />

        <!-- AI conversation modal (messenger-style) -->
        <div
            v-if="conversationOpen"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            @click.self="conversationOpen = false"
        >
            <div class="flex h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-xl">
                <div class="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                    <h3 class="font-semibold text-gray-900">💬 AI Conversation</h3>
                    <button type="button" class="text-gray-400 hover:text-gray-600" @click="conversationOpen = false">✕</button>
                </div>

                <div class="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4">
                    <p v-if="conversationLoading" class="text-center text-sm text-gray-400">Loading…</p>
                    <p v-else-if="!conversationMessages.length" class="text-center text-sm text-gray-400">No messages.</p>

                    <div
                        v-for="message in conversationMessages"
                        :key="message.id"
                        class="flex"
                        :class="message.incoming ? 'justify-start' : 'justify-end'"
                    >
                        <div
                            class="max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm"
                            :class="message.incoming ? 'bg-white text-gray-800' : 'bg-red-600 text-white'"
                        >
                            <p class="whitespace-pre-line">{{ message.message }}</p>
                            <p class="mt-1 text-right text-[10px] opacity-70">{{ message.from }} · {{ message.at }}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </AppLayout>
</template>
