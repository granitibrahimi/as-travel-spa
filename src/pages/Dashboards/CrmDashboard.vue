<script setup>
import ViewersBadge from '../Requests/ViewersBadge.vue';
import SourceIcon from '../Requests/SourceIcon.vue';
import TypeBadge from '../Requests/TypeBadge.vue';
import SpamBadge from '../Requests/SpamBadge.vue';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
import DropdownMenu from '../../components/DropdownMenu.vue';
import InputText from '../../components/Form/InputText.vue';
import Loader from '../../components/Loader.vue';
import StatCard from '../../components/StatCard.vue';
import AddOfferDialog from '../Requests/AddOfferDialog.vue';
import api from '../../helpers/api';
import { money } from '../../helpers/money';
import { routeUrl } from '../../helpers/route.js';
import { useAuthStore } from '../../stores/auth';

// Status ids from the API's SimpleTaskStatus enum.
const OFFER_SENT = 3;
const IN_PROGRESS = 5;
// Not a status: the card action that flags a request as spam.
const SPAM_FLAG = 'spam';
const REFRESH_MS = 60_000;

// Board columns (keys from the API): dot colour and the line under the title.
const COLUMN_STYLE = {
    open: { dot: 'bg-red-500', hint: 'Not taken by anyone yet, oldest first' },
    assigned: { dot: 'bg-amber-500', hint: 'Assigned to you, not started yet' },
    in_progress: { dot: 'bg-blue-500', hint: 'You are working on these' },
    offer_sent: { dot: 'bg-green-500', hint: null },
};

const auth = useAuthStore();
const canChangeStatus = computed(() => auth.can('simpleTasks.changeStatus'));
const loading = ref(true);
const error = ref(null);
const metrics = ref(null);

async function load({ quiet = false } = {}) {
    if (! quiet) {
        loading.value = true;
    }
    error.value = null;

    try {
        const { data } = await api.get('/dashboards/crm');
        metrics.value = data.data;
    } catch {
        if (! quiet) {
            error.value = 'Could not load your dashboard right now.';
        }
    } finally {
        loading.value = false;
    }
}

// The requests card and board only for users who work on requests.
const worksOnRequests = computed(() => auth.canAny(['simpleTasks.receive', 'simpleTasks.list', 'simpleTasks.listAll']));
const requests = computed(() => (worksOnRequests.value ? metrics.value?.requests ?? null : null));
// The user's own waiting requests (the Open column belongs to everyone).
const waitingCount = computed(() => (requests.value?.columns ?? [])
    .filter((column) => ! column.finished && column.key !== 'open')
    .reduce((sum, column) => sum + column.total, 0));

// From a card: take an Open request, start working on one, send the offer, or flag it as spam.
const move = ref(null); // { task, status, name }
const moveComment = ref('');
const moveError = ref('');
const moving = ref(false);

const cardActions = (task, column) => [
    { label: 'View', href: routeUrl('simpleTasks.show', task.id) },
    ...(canChangeStatus.value && ! column.finished
        ? [
            ...(column.key === 'open'
                ? [{ label: 'Take it (In progress)', action: () => openMove(task, IN_PROGRESS, 'In progress') }]
                : column.key !== 'in_progress'
                    ? [{ label: 'Move to In progress', action: () => openMove(task, IN_PROGRESS, 'In progress') }]
                    : []),
            { label: 'Add offer…', action: () => { offerTask.value = task; } },
            ...(column.key !== 'open' ? [{ label: 'Move to Closed', action: () => openMove(task, OFFER_SENT, 'Closed') }] : []),
            ...(task.spam ? [] : [{ label: 'Mark as spam', danger: true, action: () => openMove(task, SPAM_FLAG, 'Spam') }]),
        ]
        : []),
];

const moveMessage = computed(() => {
    if (! move.value) {
        return '';
    }
    if (move.value.status === SPAM_FLAG) {
        return `${move.value.task.customer_name}: the request keeps its status and gets the Spam flag. The responsible agents are notified.`;
    }
    if (move.value.status === IN_PROGRESS) {
        return `${move.value.task.customer_name}: you are working on it now.${move.value.task.assigned_to ? '' : ' It is assigned to you.'}`;
    }
    return `${move.value.task.customer_name}: this finishes the request and notifies the responsible agents.`;
});

function openMove(task, status, name) {
    move.value = { task, status, name };
    moveComment.value = '';
    moveError.value = '';
}

// Add an offer from a card (the request stays where it is).
const offerTask = ref(null);

async function offerSaved() {
    offerTask.value = null;
    await load({ quiet: true });
}

async function confirmMove() {
    moving.value = true;
    moveError.value = '';

    try {
        if (move.value.status === SPAM_FLAG) {
            await api.put(`/simple-tasks/${move.value.task.id}/spam`, { spam: true });
        } else {
            await api.put(`/simple-tasks/${move.value.task.id}/status`, {
                status: move.value.status,
                comment: moveComment.value.trim() || null,
            });
        }
        move.value = null;
        await load({ quiet: true });
    } catch (e) {
        const errors = e.response?.data?.errors ?? {};
        moveError.value = Object.values(errors)[0]?.[0] ?? e.response?.data?.message ?? 'Could not move the request.';
    } finally {
        moving.value = false;
    }
}

// Quiet refresh while the tab is visible, so newly assigned requests show up.
let timer = null;

onMounted(() => {
    load();
    timer = setInterval(() => {
        if (document.visibilityState === 'visible' && ! move.value && ! offerTask.value) {
            load({ quiet: true });
        }
    }, REFRESH_MS);
});

onBeforeUnmount(() => clearInterval(timer));

const router = useRouter();

// Clicking anywhere on a card opens the request, except on its own links,
// buttons and menu (and not when the user was selecting text).
const openTask = (event, task) => {
    if (event.target.closest('a, button, input, textarea, select, [role="menu"], [role="menuitem"]')) return;
    if (window.getSelection()?.toString()) return;
    const url = routeUrl('simpleTasks.show', task.id);
    if (event.metaKey || event.ctrlKey) {
        window.open(router.resolve(url).href, '_blank');
        return;
    }
    router.push(url);
};
</script>

<template>
    <div class="space-y-6">
        <Loader v-if="loading" message="Loading your dashboard"/>

        <p v-else-if="error" class="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {{ error }}
        </p>

        <template v-else-if="metrics">
            <div class="grid grid-cols-1 gap-4" :class="requests ? 'sm:grid-cols-3' : 'sm:grid-cols-2'">
                <StatCard
                    accent
                    label="Cash on hand to hand over"
                    :value="money(metrics.cash_on_hand)"
                    sub="Undeposited cash you have collected"
                />
                <StatCard
                    label="Invoices today"
                    :value="metrics.invoices.count"
                    :sub="money(metrics.invoices.amount)"
                />
                <StatCard
                    v-if="requests"
                    label="Requests today"
                    :value="requests?.today_count ?? 0"
                    :sub="`${waitingCount} waiting in total`"
                />
            </div>

            <div v-if="requests" class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <section
                    v-for="column in requests.columns"
                    :key="column.key"
                    class="rounded-lg border border-gray-200 bg-gray-50 p-3"
                >
                    <h2 class="mb-1 flex items-center justify-between text-sm font-semibold uppercase text-gray-600">
                        <span class="flex items-center gap-2">
                            <span class="inline-block h-2.5 w-2.5 rounded-full" :class="COLUMN_STYLE[column.key]?.dot ?? 'bg-gray-400'" />
                            {{ column.name }}
                        </span>
                        <span class="rounded bg-gray-200 px-2 py-0.5 text-xs">{{ column.total }}</span>
                    </h2>
                    <p class="mb-3 text-xs text-gray-400">
                        <template v-if="column.finished">
                            Closed since {{ requests.finished_from }}<template v-if="column.total > column.tasks.length"> · latest {{ column.tasks.length }} shown</template>
                        </template>
                        <template v-else>{{ COLUMN_STYLE[column.key]?.hint }}</template>
                    </p>

                    <p v-if="column.tasks.length === 0" class="py-2 text-center text-xs text-gray-400">No requests.</p>

                    <div class="space-y-3">
                        <div
                            v-for="task in column.tasks"
                            :key="task.id"
                            class="cursor-pointer rounded-lg border bg-white p-3 shadow-sm hover:border-red-200"
                            :class="[task.urgent ? 'border-red-300' : 'border-gray-200', task.spam ? '!border-orange-300 !bg-orange-50' : '']"
                            @click="openTask($event, task)"
                        >
                            <div class="flex items-start justify-between gap-2">
                                <RouterLink :to="routeUrl('simpleTasks.show', task.id)" class="font-medium text-gray-900 hover:text-red-600">#{{ task.id }} · {{ task.customer_name }}</RouterLink>
                                <span class="ml-1 flex shrink-0 gap-1">
                                    <span v-if="task.urgent" class="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">Urgent</span>
                                    <SpamBadge v-if="task.spam" />
                                </span>
                                <DropdownMenu :items="cardActions(task, column)" />
                            </div>

                            <ViewersBadge :viewers="task.viewers ?? []" class="mt-1" />
                            <p class="mt-1 flex items-center gap-2 text-xs text-gray-500">
                                <SourceIcon :source="task.source" badge />
                                <span v-if="task.customer_contact" class="truncate">{{ task.customer_contact }}</span>
                            </p>
                            <p v-if="task.type || task.parent_destinations?.length || task.parent_destination || task.specific_hotel || task.combo" class="mt-1 text-xs text-gray-700">
                                <TypeBadge :type="task.type" class="mr-1" />
                                <span v-if="task.combo" class="mr-1 rounded bg-indigo-100 px-1 py-0.5 text-[10px] font-semibold uppercase text-indigo-700">Combo</span>
                                {{ [(task.parent_destinations ?? []).map((d) => d.name).join(', ') || task.parent_destination?.name, task.specific_hotel].filter(Boolean).join(' · ') }}
                            </p>
                            <p v-if="column.key === 'open' || column.key === 'in_progress'" class="mt-1 text-xs text-gray-400">
                                <template v-if="task.assigned_to">{{ task.assigned_to.name }}</template>
                                <template v-else>Not assigned</template>
                            </p>
                            <p v-if="task.description" class="mt-1 line-clamp-2 text-xs text-gray-500">{{ task.description }}</p>

                            <p v-if="task.offers_count" class="mt-1 text-xs"><span class="rounded bg-green-50 px-1.5 py-0.5 text-green-700">{{ task.offers_count }} {{ task.offers_count === 1 ? 'offer' : 'offers' }} sent</span></p>
                            <div class="mt-2 text-xs text-gray-400" :title="column.finished ? task.finished_at : (task.assigned_at ?? task.created_at)">
                                <template v-if="column.finished">{{ task.finished_since }}</template>
                                <template v-else>Created {{ task.created_since }}</template>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </template>

        <AddOfferDialog :show="Boolean(offerTask)" :task="offerTask" @saved="offerSaved" @cancel="offerTask = null" />

        <ConfirmDialog
            :show="Boolean(move)"
            :title="move ? (move.status === SPAM_FLAG ? `Mark #${move.task.id} as spam?` : `Move #${move.task.id} to ${move.name}?`) : ''"
            :message="moveMessage"
            :confirm-label="move ? (move.status === SPAM_FLAG ? 'Mark as spam' : `Move to ${move.name}`) : ''"
            :confirm-variant="move?.status === SPAM_FLAG ? 'danger' : 'primary'"
            :processing="moving"
            @confirm="confirmMove()"
            @cancel="move = null"
        >
            <div v-if="move?.status !== SPAM_FLAG" class="mt-3">
                <InputText v-model="moveComment" label="Comment (optional)" maxlength="200" />
            </div>
            <p v-if="moveError" class="mt-2 text-xs text-red-600">{{ moveError }}</p>
        </ConfirmDialog>
    </div>
</template>
