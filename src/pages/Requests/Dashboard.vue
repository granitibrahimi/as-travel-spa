<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import api from '../../helpers/api';
import { routeUrl } from '../../helpers/route.js';
import { castResource } from '../../types/responses.js';
import { useAuthStore } from '../../stores/auth';
import AppLayout from '../../layouts/AppLayout.vue';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
import DropdownMenu from '../../components/DropdownMenu.vue';
import InputText from '../../components/Form/InputText.vue';
import Select from '../../components/Form/Select.vue';
import Loader from '../../components/Loader.vue';
import { requestStatusDotClass } from './statusClass.js';

// Status ids from the API's SimpleTaskStatus enum.
const OPEN = 1;
const ASSIGNED = 2;

const REFRESH_MS = 60_000;

const auth = useAuthStore();
const canAssign = computed(() => auth.can('simpleTasks.assign'));
const canChangeStatus = computed(() => auth.can('simpleTasks.changeStatus'));

const board = ref(null);
const loading = ref(false);
const period = ref(null);
// Board filter: an agent id, 'none' (not assigned), or null (everyone).
const agentFilter = ref(null);
const agentOptions = ref([]);

async function fetchBoard() {
    loading.value = true;

    try {
        const { data } = await api.get('/simple-tasks/dashboard', {
            params: { period: period.value || undefined },
        });
        board.value = castResource(data);
    } finally {
        loading.value = false;
    }
}

function setPeriod(value) {
    period.value = value;
    fetchBoard();
}

function toggleAgent(value) {
    agentFilter.value = agentFilter.value === value ? null : value;
}

const columns = computed(() => (board.value?.columns ?? []).map((column) => {
    const tasks = column.tasks.filter((task) => {
        if (agentFilter.value === null) {
            return true;
        }
        if (agentFilter.value === 'none') {
            return ! task.assigned_to;
        }
        return task.assigned_to?.id === agentFilter.value;
    });

    return { ...column, tasks, count: agentFilter.value === null ? column.total : tasks.length };
}));

const agents = computed(() => board.value?.agents ?? null);
const filterName = computed(() => {
    if (agentFilter.value === 'none') {
        return 'Not assigned';
    }
    return agents.value?.find((agent) => agent.id === agentFilter.value)?.name ?? null;
});

// Quiet auto-refresh while the tab is visible and nothing is in progress.
let timer = null;

onMounted(async () => {
    fetchBoard();
    timer = setInterval(() => {
        if (document.visibilityState === 'visible' && ! dragging.value && ! move.value && ! moving.value) {
            fetchBoard();
        }
    }, REFRESH_MS);

    if (canAssign.value) {
        const { data } = await api.get('/simple-tasks/options');
        agentOptions.value = castResource(data).agents.map((agent) => ({ value: agent.id, label: agent.name }));
    }
});

onBeforeUnmount(() => clearInterval(timer));

// --- Moving requests: drag a card onto a column or an agent ---
const dragging = ref(null); // the task being dragged
const dropTarget = ref(null); // 'status-<id>' | 'agent-<id>' while hovering

function canMoveTo(task, status) {
    if (! task || task.status.id === status.id) {
        return false;
    }
    if (status.id === OPEN) {
        return task.assigned_to ? canAssign.value : canChangeStatus.value;
    }
    if (status.id === ASSIGNED) {
        return canAssign.value;
    }
    return canChangeStatus.value;
}

function onDragStart(event, task) {
    dragging.value = task;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(task.id));
}

function onDragEnd() {
    dragging.value = null;
    dropTarget.value = null;
}

function onDropOnColumn(status) {
    const task = dragging.value;
    onDragEnd();

    if (canMoveTo(task, status)) {
        openMove(task, status);
    }
}

function onDropOnAgent(agent) {
    const task = dragging.value;
    onDragEnd();

    if (task && canAssign.value && task.assigned_to?.id !== agent.id) {
        runMove(task, ASSIGNED, { agentId: agent.id });
    }
}

// The move dialog: Assigned asks for the agent, finished statuses take an optional comment.
const move = ref(null); // { task, status }
const moveAgent = ref(null);
const moveComment = ref('');
const moveError = ref('');
const moving = ref(false);

function openMove(task, status) {
    if (status.id === OPEN) {
        runMove(task, OPEN);
        return;
    }

    move.value = { task, status };
    moveAgent.value = task.assigned_to?.id ?? null;
    moveComment.value = '';
    moveError.value = '';
}

async function confirmMove() {
    if (move.value.status.id === ASSIGNED && ! moveAgent.value) {
        moveError.value = 'Choose an agent.';
        return;
    }

    const ok = await runMove(move.value.task, move.value.status.id, {
        agentId: moveAgent.value,
        comment: moveComment.value.trim() || null,
    });

    if (ok) {
        move.value = null;
    }
}

/**
 * Open: unassign (and reopen a finished request). Assigned: assign to the
 * agent (and reopen a finished request). Anything else: change the status.
 */
async function runMove(task, statusId, { agentId = null, comment = null } = {}) {
    if (moving.value) {
        return false;
    }

    moving.value = true;
    moveError.value = '';

    try {
        const url = `/simple-tasks/${task.id}`;

        if (statusId === OPEN) {
            if (task.assigned_to) {
                await api.put(`${url}/assignee`, { assigned_to: null });
            }
            // Unassigning only reopens an Assigned request.
            if (task.status.id !== OPEN && ! (task.status.id === ASSIGNED && task.assigned_to)) {
                await api.put(`${url}/status`, { status: OPEN });
            }
        } else if (statusId === ASSIGNED) {
            if (task.assigned_to?.id !== agentId) {
                await api.put(`${url}/assignee`, { assigned_to: agentId });
            }
            // Assigning only moves an Open request to Assigned.
            if (task.status.id !== ASSIGNED && task.status.id !== OPEN) {
                await api.put(`${url}/status`, { status: ASSIGNED });
            }
        } else {
            await api.put(`${url}/status`, { status: statusId, comment });
        }

        return true;
    } catch (error) {
        if (error.response?.status !== 422 && error.response?.status !== 403) {
            throw error;
        }
        const errors = error.response?.data?.errors ?? {};
        moveError.value = Object.values(errors)[0]?.[0] ?? error.response?.data?.message ?? 'Could not move the request.';
        if (! move.value) {
            move.value = { task, status: { id: statusId, name: 'Move' }, failed: true };
        }
        return false;
    } finally {
        moving.value = false;
        await fetchBoard();
    }
}

const statuses = computed(() => (board.value?.columns ?? []).map((column) => column.status));

const cardActions = (task) => [
    { label: 'View', href: routeUrl('simpleTasks.show', task.id) },
    ...statuses.value
        .filter((status) => canMoveTo(task, status))
        .map((status) => ({
            label: status.id === ASSIGNED ? (task.assigned_to ? 'Reassign…' : 'Assign…') : `Move to ${status.name}`,
            danger: status.name === 'Spam',
            action: () => openMove(task, status),
        })),
];

const dialogTitle = computed(() => {
    if (! move.value) {
        return '';
    }
    if (move.value.failed) {
        return `Could not update #${move.value.task.id}`;
    }
    if (move.value.status.id === ASSIGNED) {
        return `Assign #${move.value.task.id}`;
    }
    return `Move #${move.value.task.id} to ${move.value.status.name}?`;
});

const dialogMessage = computed(() => {
    if (! move.value || move.value.failed) {
        return '';
    }
    if (move.value.status.id === ASSIGNED) {
        return `${move.value.task.customer_name}: the agent gets a notification.`;
    }
    return `${move.value.task.customer_name}: this finishes the request and notifies the responsible agents.`;
});

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
    <AppLayout title="Requests dashboard" fluid>
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div class="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
                <button v-for="option in [
                            { value: null, label: 'All' },
                            { value: 'today', label: 'Today' },
                            { value: 'this_week', label: 'This week' },
                        ]"
                        :key="option.label"
                        type="button"
                        class="rounded px-4 py-1.5 text-sm font-medium"
                        :class="period === option.value ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-gray-50'"
                        @click="setPeriod(option.value)">
                    {{ option.label }}
                </button>
            </div>

            <div class="flex items-center gap-2">
                <span v-if="loading && board" class="text-xs text-gray-400">Refreshing…</span>
                <RouterLink v-if="auth.can('simpleTasks.create')" :to="routeUrl('simpleTasks.create')" class="inline-block rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700">+ New request</RouterLink>
                <RouterLink :to="routeUrl('simpleTasks.list')" class="inline-block rounded border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50">List view</RouterLink>
            </div>
        </div>

        <Loader v-if="! board" />

        <template v-else>
            <!-- Agents: who is holding how many waiting requests. Drop a card on an agent to assign it. -->
            <section v-if="agents" class="mb-4 rounded-lg border border-gray-200 bg-white p-3">
                <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h2 class="text-sm font-semibold uppercase text-gray-600">Agents</h2>
                    <p class="text-xs text-gray-400">
                        Waiting = assigned and not finished · Sent/Spam since {{ board.finished_from }}
                        <template v-if="canAssign"> · Drop a card on an agent to assign it</template>
                    </p>
                </div>

                <div class="flex gap-2 overflow-x-auto pb-1">
                    <button
                        type="button"
                        class="min-w-36 shrink-0 rounded-lg border px-3 py-2 text-left"
                        :class="agentFilter === 'none' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:bg-gray-50'"
                        @click="toggleAgent('none')"
                    >
                        <span class="block text-sm font-medium text-gray-900">Not assigned</span>
                        <span class="mt-1 block text-2xl font-semibold" :class="board.unassigned ? 'text-red-600' : 'text-gray-300'">{{ board.unassigned }}</span>
                        <span class="block text-xs text-gray-400">waiting for an agent</span>
                    </button>

                    <button
                        v-for="agent in agents"
                        :key="agent.id"
                        type="button"
                        class="min-w-44 shrink-0 rounded-lg border px-3 py-2 text-left transition"
                        :class="[
                            agentFilter === agent.id ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:bg-gray-50',
                            dropTarget === `agent-${agent.id}` ? 'ring-2 ring-red-300' : '',
                        ]"
                        @click="toggleAgent(agent.id)"
                        @dragover.prevent="dragging && canAssign && (dropTarget = `agent-${agent.id}`)"
                        @dragleave="dropTarget === `agent-${agent.id}` && (dropTarget = null)"
                        @drop.prevent="onDropOnAgent(agent)"
                    >
                        <span class="block truncate text-sm font-medium text-gray-900">{{ agent.name }}</span>
                        <span class="mt-1 flex items-baseline gap-1">
                            <span class="text-2xl font-semibold" :class="agent.waiting ? 'text-amber-600' : 'text-gray-300'">{{ agent.waiting }}</span>
                            <span class="text-xs text-gray-400">waiting</span>
                        </span>
                        <span class="block text-xs text-gray-500">
                            <template v-if="agent.oldest_waiting_since">Oldest {{ agent.oldest_waiting_since }}</template>
                            <template v-else>Nothing waiting</template>
                        </span>
                        <span class="block text-xs text-gray-400">{{ agent.offers_sent }} sent · {{ agent.spam }} spam</span>
                    </button>
                </div>
            </section>

            <p v-if="filterName" class="mb-3 text-sm text-gray-600">
                Showing requests for <span class="font-medium">{{ filterName }}</span> ·
                <button type="button" class="text-red-600 hover:underline" @click="agentFilter = null">Show everyone</button>
            </p>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <section
                    v-for="column in columns"
                    :key="column.status.id"
                    class="rounded-lg border bg-gray-50 p-3 transition"
                    :class="dropTarget === `status-${column.status.id}` ? 'border-red-400 ring-2 ring-red-200' : 'border-gray-200'"
                    @dragover.prevent="canMoveTo(dragging, column.status) && (dropTarget = `status-${column.status.id}`)"
                    @dragleave.self="dropTarget === `status-${column.status.id}` && (dropTarget = null)"
                    @drop.prevent="onDropOnColumn(column.status)"
                >
                    <h2 class="mb-1 flex items-center justify-between text-sm font-semibold uppercase text-gray-600">
                        <span class="flex items-center gap-2">
                            <span class="inline-block h-2.5 w-2.5 rounded-full" :class="requestStatusDotClass(column.status)" />
                            {{ column.status.name }}
                        </span>
                        <span class="rounded bg-gray-200 px-2 py-0.5 text-xs">{{ column.count }}</span>
                    </h2>
                    <p class="mb-3 text-xs text-gray-400">
                        <template v-if="column.status.finished">
                            Finished since {{ board.finished_from }}<template v-if="column.total > column.tasks.length && agentFilter === null"> · latest {{ column.tasks.length }} shown</template>
                        </template>
                        <template v-else>Waiting, oldest first</template>
                    </p>

                    <p v-if="column.tasks.length === 0" class="py-2 text-center text-xs text-gray-400">No requests.</p>

                    <div class="space-y-3">
                        <div
                            v-for="task in column.tasks"
                            :key="task.id"
                            class="cursor-pointer rounded-lg border border-gray-200 bg-white p-3 shadow-sm hover:border-red-200"
                            @click="openTask($event, task)"
                            :class="[
                                (canAssign || canChangeStatus) ? 'active:cursor-grabbing' : '',
                                dragging?.id === task.id ? 'opacity-50 ring-2 ring-red-300' : '',
                            ]"
                            :draggable="canAssign || canChangeStatus"
                            @dragstart="onDragStart($event, task)"
                            @dragend="onDragEnd"
                        >
                            <div class="flex items-start justify-between gap-2">
                                <RouterLink :to="routeUrl('simpleTasks.show', task.id)" class="font-medium text-gray-900 hover:text-red-600">#{{ task.id }} · {{ task.customer_name }}</RouterLink>
                                <div class="flex items-center gap-1">
                                    <span v-if="canAssign || canChangeStatus" class="select-none text-gray-300" title="Drag to move">⠿</span>
                                    <DropdownMenu :items="cardActions(task)" />
                                </div>
                            </div>

                            <p class="mt-1 text-xs text-gray-500">
                                {{ task.source.name }}<template v-if="task.customer_contact"> · {{ task.customer_contact }}</template>
                            </p>
                            <p v-if="task.description" class="mt-1 line-clamp-2 text-xs text-gray-500">{{ task.description }}</p>

                            <div class="mt-2 flex items-center justify-between gap-2 text-xs text-gray-400">
                                <span :title="column.status.finished ? task.finished_at : task.created_at">
                                    <template v-if="column.status.finished">{{ task.finished_since }}</template>
                                    <template v-else>{{ task.created_since }}</template>
                                </span>
                                <span v-if="task.assigned_to" class="truncate rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">{{ task.assigned_to.name }}</span>
                                <span v-else-if="! column.status.finished" class="rounded bg-red-50 px-1.5 py-0.5 text-red-600">Not assigned</span>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </template>

        <ConfirmDialog
            :show="Boolean(move)"
            :title="dialogTitle"
            :message="dialogMessage"
            :confirm-label="move?.failed ? 'OK' : (move?.status.id === ASSIGNED ? 'Assign' : `Move to ${move?.status.name}`)"
            :confirm-variant="move?.status.name === 'Spam' ? 'danger' : 'primary'"
            :processing="moving"
            @confirm="move?.failed ? (move = null) : confirmMove()"
            @cancel="move = null"
        >
            <div v-if="move && ! move.failed" class="mt-3">
                <Select
                    v-if="move.status.id === ASSIGNED"
                    v-model="moveAgent"
                    label="Agent *"
                    :options="agentOptions"
                    placeholder="Choose an agent"
                />
                <InputText v-else v-model="moveComment" label="Comment (optional)" maxlength="200" />
            </div>
            <p v-if="moveError" class="mt-2 text-xs text-red-600">{{ moveError }}</p>
        </ConfirmDialog>
    </AppLayout>
</template>
