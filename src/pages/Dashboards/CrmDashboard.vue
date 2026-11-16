<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
import DropdownMenu from '../../components/DropdownMenu.vue';
import InputText from '../../components/Form/InputText.vue';
import Loader from '../../components/Loader.vue';
import StatCard from '../../components/StatCard.vue';
import api from '../../helpers/api';
import { money } from '../../helpers/money';
import { routeUrl } from '../../helpers/route.js';
import { useAuthStore } from '../../stores/auth';

// Status ids from the API's SimpleTaskStatus enum.
const OFFER_SENT = 3;
const SPAM = 4;
const REFRESH_MS = 60_000;

// Board columns (keys from the API): dot colour and the line under the title.
const COLUMN_STYLE = {
    old: { dot: 'bg-red-500', hint: 'Waiting since before today, oldest first' },
    today: { dot: 'bg-amber-500', hint: 'Assigned today, oldest first' },
    offer_sent: { dot: 'bg-green-500', hint: null },
    spam: { dot: 'bg-gray-400', hint: null },
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
const waitingCount = computed(() => (requests.value?.columns ?? [])
    .filter((column) => ! column.finished)
    .reduce((sum, column) => sum + column.total, 0));

// Close a request from its card: Offer sent or Spam, with an optional comment.
const move = ref(null); // { task, status, name }
const moveComment = ref('');
const moveError = ref('');
const moving = ref(false);

const cardActions = (task, column) => [
    { label: 'View', href: routeUrl('simpleTasks.show', task.id) },
    ...(canChangeStatus.value && ! column.finished
        ? [
            { label: 'Move to Offer sent', action: () => openMove(task, OFFER_SENT, 'Offer sent') },
            { label: 'Move to Spam', danger: true, action: () => openMove(task, SPAM, 'Spam') },
        ]
        : []),
];

function openMove(task, status, name) {
    move.value = { task, status, name };
    moveComment.value = '';
    moveError.value = '';
}

async function confirmMove() {
    moving.value = true;
    moveError.value = '';

    try {
        await api.put(`/simple-tasks/${move.value.task.id}/status`, {
            status: move.value.status,
            comment: moveComment.value.trim() || null,
        });
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
        if (document.visibilityState === 'visible' && ! move.value) {
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
                            Finished since {{ requests.finished_from }}<template v-if="column.total > column.tasks.length"> · latest {{ column.tasks.length }} shown</template>
                        </template>
                        <template v-else>{{ COLUMN_STYLE[column.key]?.hint }}</template>
                    </p>

                    <p v-if="column.tasks.length === 0" class="py-2 text-center text-xs text-gray-400">No requests.</p>

                    <div class="space-y-3">
                        <div
                            v-for="task in column.tasks"
                            :key="task.id"
                            class="cursor-pointer rounded-lg border border-gray-200 bg-white p-3 shadow-sm hover:border-red-200"
                            @click="openTask($event, task)"
                        >
                            <div class="flex items-start justify-between gap-2">
                                <RouterLink :to="routeUrl('simpleTasks.show', task.id)" class="font-medium text-gray-900 hover:text-red-600">#{{ task.id }} · {{ task.customer_name }}</RouterLink>
                                <DropdownMenu :items="cardActions(task, column)" />
                            </div>

                            <p class="mt-1 text-xs text-gray-500">
                                {{ task.source.name }}<template v-if="task.customer_contact"> · {{ task.customer_contact }}</template>
                            </p>
                            <p v-if="task.description" class="mt-1 line-clamp-2 text-xs text-gray-500">{{ task.description }}</p>

                            <div class="mt-2 text-xs text-gray-400" :title="column.finished ? task.finished_at : (task.assigned_at ?? task.created_at)">
                                <template v-if="column.finished">{{ task.finished_since }}</template>
                                <template v-else>Created {{ task.created_since }}</template>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </template>

        <ConfirmDialog
            :show="Boolean(move)"
            :title="move ? `Move #${move.task.id} to ${move.name}?` : ''"
            :message="move ? `${move.task.customer_name}: this finishes the request and notifies the responsible agents.` : ''"
            :confirm-label="move ? `Move to ${move.name}` : ''"
            :confirm-variant="move?.status === SPAM ? 'danger' : 'primary'"
            :processing="moving"
            @confirm="confirmMove"
            @cancel="move = null"
        >
            <div class="mt-3">
                <InputText v-model="moveComment" label="Comment (optional)" maxlength="200" />
            </div>
            <p v-if="moveError" class="mt-2 text-xs text-red-600">{{ moveError }}</p>
        </ConfirmDialog>
    </div>
</template>
