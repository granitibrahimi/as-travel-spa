<script setup>
import FromBossBadge from './FromBossBadge.vue';
import ViewersBadge from './ViewersBadge.vue';
import SourceIcon from './SourceIcon.vue';
import TypeBadge from './TypeBadge.vue';
import SpamBadge from './SpamBadge.vue';
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
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
import AddOfferDialog from './AddOfferDialog.vue';
import { getEcho } from '../../helpers/echo';
import { flip } from '../../composables/useFlip.js';
import { useListFilters } from '../../composables/useListFilters.js';
import { useLiveFilters } from '../../composables/useLiveFilters.js';
import RequestFilters from './RequestFilters.vue';

// Status ids from the API's SimpleTaskStatus enum.
const OPEN = 1;
const ASSIGNED = 2;
const IN_PROGRESS = 5;

const REFRESH_MS = 60_000;

const auth = useAuthStore();
const canAssign = computed(() => auth.can('simpleTasks.assign'));
const canChangeStatus = computed(() => auth.can('simpleTasks.changeStatus'));
const canSeeBoard = computed(() => auth.can('simpleTasks.dashboard'));

const board = ref(null);
const loading = ref(false);
const agentOptions = ref([]);
const options = ref({ statuses: [], sources: [], types: [], agents: [] });

// Same filters as the list, applied on the server and kept in the URL.
const { filters, applied, apply, clear } = useListFilters(
    { q: '', status: '', assigned_to: '', source: [], date_from: '', date_to: '', type: '', spam: '' },
    async (params, { signal }) => (canSeeBoard.value ? fetchBoard({ params, signal }) : null),
);
useLiveFilters(filters, applied, apply);

// The agent filter as the agent cards use it: an agent id, 'none', or null (everyone).
const agentFilter = computed(() => {
    const value = filters.assigned_to;
    if (value === '' || value === null || value === undefined) {
        return null;
    }
    return value === 'none' ? 'none' : Number(value);
});

const boardEl = ref(null);
// Counters only animate once the first load is on screen.
const animateCounts = ref(false);

/**
 * Load the board. Once it is on screen, cards glide to their new column
 * (FLIP) and new ones pop in; `highlight` flashes the requests that changed.
 */
async function fetchBoard({ quiet = false, highlight = [], params = null, signal = undefined } = {}) {
    if (! quiet) {
        loading.value = true;
    }

    try {
        const { data } = await api.get('/simple-tasks/dashboard', {
            params: { ...(params ?? applied.value), page: undefined },
            signal,
        });
        const next = castResource(data);

        if (board.value && boardEl.value) {
            await flip(boardEl.value, () => { board.value = next; }, { highlight });
        } else {
            board.value = next;
            await nextTick();
            animateCounts.value = true;
        }
    } finally {
        loading.value = false;
    }
}

// --- Live updates over Reverb: every change to a request pings private-simple-tasks ---
const CHANNEL = 'simple-tasks';
const live = ref(false);
const lastEvent = ref(null);
let channel = null;
let pending = new Set();
let debounce = null;
let retry = null;

function onLiveChange(payload) {
    // Opening or leaving a request only refreshes its working icon: no flash.
    if (payload.change !== 'Opened' && payload.change !== 'Left') {
        pending.add(payload.id);
    }
    lastEvent.value = {
        text: `#${payload.id} ${String(payload.change ?? 'updated').toLowerCase()}${payload.by ? ` by ${payload.by}` : ''}`,
        at: Date.now(),
    };

    // A drag or a dialog in progress: the reload happens when it finishes.
    clearTimeout(debounce);
    debounce = setTimeout(() => {
        if (dragging.value || move.value || moving.value) {
            debounce = setTimeout(() => onLiveChange(payload), 1500);
            return;
        }
        const ids = [...pending];
        pending = new Set();
        fetchBoard({ quiet: true, highlight: ids });
    }, 350);
}

function subscribe() {
    const echo = getEcho();

    if (! echo) {
        // Echo connects on login/boot; try again shortly.
        retry = setTimeout(subscribe, 1500);
        return;
    }

    channel = echo.private(CHANNEL);
    channel.listen('.changed', onLiveChange);
    channel.subscribed?.(() => { live.value = true; });
    channel.error?.(() => { live.value = false; });
}

function unsubscribe() {
    clearTimeout(retry);
    clearTimeout(debounce);
    if (channel) {
        getEcho()?.leave(`private-${CHANNEL}`);
        channel = null;
    }
    live.value = false;
}



function toggleAgent(value) {
    filters.assigned_to = agentFilter.value === value ? '' : String(value);
}

const columns = computed(() => (board.value?.columns ?? []).map((column) => ({ ...column, count: column.total })));

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
    if (! canSeeBoard.value) {
        return;
    }

    subscribe();
    // Fallback refresh, in case the live connection drops.
    timer = setInterval(() => {
        if (document.visibilityState === 'visible' && ! dragging.value && ! move.value && ! moving.value) {
            fetchBoard({ quiet: true });
        }
    }, REFRESH_MS);

    const { data } = await api.get('/simple-tasks/options');
    options.value = castResource(data);
    agentOptions.value = options.value.agents.map((agent) => ({ value: agent.id, label: agent.name }));
});

onBeforeUnmount(() => {
    clearInterval(timer);
    unsubscribe();
});

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

// Add an offer from a card (the request stays where it is).
const offerTask = ref(null);

async function offerSaved() {
    const id = offerTask.value.id;
    offerTask.value = null;
    await fetchBoard({ quiet: true, highlight: [id] });
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
        await fetchBoard({ quiet: true, highlight: [task.id] });
    }
}

const statuses = computed(() => (board.value?.columns ?? []).map((column) => column.status));

const cardActions = (task) => [
    { label: 'View', href: routeUrl('simpleTasks.show', task.id) },
    ...(canChangeStatus.value && ! task.status.finished ? [{ label: 'Add offer…', action: () => { offerTask.value = task; } }] : []),
    ...statuses.value
        .filter((status) => canMoveTo(task, status))
        .map((status) => ({
            label: status.id === ASSIGNED ? (task.assigned_to ? 'Reassign…' : 'Assign…') : `Move to ${status.name}`,
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
    if (move.value.status.id === IN_PROGRESS) {
        return `${move.value.task.customer_name}: you are working on it now.${move.value.task.assigned_to ? '' : ' It is assigned to you.'}`;
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
        <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
            <RequestFilters
                v-if="canSeeBoard"
                compact
                class="min-w-0 flex-1"
                :filters="filters"
                :options="options"
                :show-agent="auth.can('simpleTasks.listAll')"
                @clear="clear"
            />

            <div class="flex shrink-0 items-center gap-2 pt-1">
                <span v-if="lastEvent" :key="lastEvent.at" class="live-event hidden text-xs text-gray-500 md:inline">{{ lastEvent.text }}</span>
                <span
                    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                    :class="live ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'"
                    :title="live ? 'New and changed requests appear here instantly' : 'Not connected: refreshing every minute'"
                >
                    <span class="relative flex h-2 w-2">
                        <span v-if="live" class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                        <span class="relative inline-flex h-2 w-2 rounded-full" :class="live ? 'bg-green-500' : 'bg-gray-400'" />
                    </span>
                    {{ live ? 'Live' : 'Offline' }}
                </span>
                <span v-if="loading && board" class="text-xs text-gray-400">Refreshing…</span>
                <RouterLink v-if="auth.can('simpleTasks.create')" :to="routeUrl('simpleTasks.create')" class="inline-block rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700">+ New request</RouterLink>
                <RouterLink :to="routeUrl('simpleTasks.list')" class="inline-block rounded border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50">List view</RouterLink>
            </div>
        </div>

        <p v-if="! canSeeBoard" class="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
            You don't have access to the requests board.
            <RouterLink :to="routeUrl('simpleTasks.list')" class="text-red-600 hover:underline">Open the list instead</RouterLink>.
        </p>

        <Loader v-else-if="! board" />

        <template v-else>
            <!-- Agents: who is holding how many waiting requests. Drop a card on an agent to assign it. -->
            <section v-if="agents" class="mb-4 rounded-lg border border-gray-200 bg-white p-3">
                <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h2 class="text-sm font-semibold uppercase text-gray-600">Agents</h2>
                    <p class="text-xs text-gray-400">
                        Waiting = assigned, not closed, not spam · Offers / closed / spam since {{ board.finished_from }}
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
                        <span class="mt-1 block text-2xl font-semibold" :class="board.unassigned ? 'text-red-600' : 'text-gray-300'"><span :key="board.unassigned" class="inline-block" :class="animateCounts && 'count-bump'">{{ board.unassigned }}</span></span>
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
                            <span :key="agent.waiting" class="inline-block text-2xl font-semibold" :class="[agent.waiting ? 'text-amber-600' : 'text-gray-300', animateCounts && 'count-bump']">{{ agent.waiting }}</span>
                            <span class="text-xs text-gray-400">waiting</span>
                        </span>
                        <span class="block text-xs text-gray-500">
                            <template v-if="agent.oldest_waiting_since">Oldest {{ agent.oldest_waiting_since }}</template>
                            <template v-else>Nothing waiting</template>
                        </span>
                        <span class="block text-xs text-gray-400">{{ agent.offers_sent }} offers · {{ agent.closed ?? 0 }} closed · {{ agent.spam }} spam</span>
                    </button>
                </div>
            </section>

            <p v-if="filterName" class="mb-3 text-sm text-gray-600">
                Showing requests for <span class="font-medium">{{ filterName }}</span> ·
                <button type="button" class="text-red-600 hover:underline" @click="filters.assigned_to = ''">Show everyone</button>
            </p>

            <div ref="boardEl" class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                        <span :key="column.count" class="rounded bg-gray-200 px-2 py-0.5 text-xs" :class="animateCounts && 'count-bump'">{{ column.count }}</span>
                    </h2>
                    <p class="mb-3 text-xs text-gray-400">
                        <template v-if="column.status.finished">
                            Closed since {{ board.finished_from }}<template v-if="column.total > column.tasks.length"> · latest {{ column.tasks.length }} shown</template>
                        </template>
                        <template v-else>Waiting, oldest first</template>
                    </p>

                    <p v-if="column.tasks.length === 0" class="py-2 text-center text-xs text-gray-400">No requests.</p>

                    <div class="space-y-3">
                        <div
                            v-for="task in column.tasks"
                            :key="task.id"
                            :data-flip-id="task.id"
                            :data-flip-column="column.status.id"
                            class="cursor-pointer rounded-lg border bg-white p-3 shadow-sm hover:border-red-200"
                            @click="openTask($event, task)"
                            :class="[
                                (task.from_flamur || task.from_vesa) ? 'border-2 border-red-600 ring-1 ring-red-200' : task.urgent ? 'border-red-300' : 'border-gray-200',
                                task.spam ? '!border-orange-300 !bg-orange-50' : '',
                                (canAssign || canChangeStatus) ? 'active:cursor-grabbing' : '',
                                dragging?.id === task.id ? 'opacity-50 ring-2 ring-red-300' : '',
                            ]"
                            :draggable="canAssign || canChangeStatus"
                            @dragstart="onDragStart($event, task)"
                            @dragend="onDragEnd"
                        >
                            <div v-if="task.from_flamur || task.from_vesa" class="mb-1.5 flex gap-1"><FromBossBadge :task="task" /></div>
                            <div class="flex items-start justify-between gap-2">
                                <RouterLink :to="routeUrl('simpleTasks.show', task.id)" class="font-medium text-gray-900 hover:text-red-600">#{{ task.id }} · {{ task.customer_name }}</RouterLink>
                                <span class="ml-1 flex shrink-0 gap-1">
                                    <span v-if="task.urgent" class="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">Urgent</span>
                                    <SpamBadge v-if="task.spam" />
                                </span>
                                <div class="flex items-center gap-1">
                                    <span v-if="canAssign || canChangeStatus" class="select-none text-gray-300" title="Drag to move">⠿</span>
                                    <DropdownMenu :items="cardActions(task)" />
                                </div>
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
                            <p v-if="task.description" class="mt-1 line-clamp-2 text-xs text-gray-500">{{ task.description }}</p>

                            <p v-if="task.offers_count" class="mt-1 text-xs"><span class="rounded bg-green-50 px-1.5 py-0.5 text-green-700">{{ task.offers_count }} {{ task.offers_count === 1 ? 'offer' : 'offers' }} sent</span></p>
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

        <AddOfferDialog :show="Boolean(offerTask)" :task="offerTask" @saved="offerSaved" @cancel="offerTask = null" />

        <ConfirmDialog
            :show="Boolean(move)"
            :title="dialogTitle"
            :message="dialogMessage"
            :confirm-label="move?.failed ? 'OK' : (move?.status.id === ASSIGNED ? 'Assign' : `Move to ${move?.status.name}`)"
            :confirm-variant="'primary'"
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

<style scoped>
/* A card that just arrived on the board. */
.flip-new {
    animation: flip-new 900ms cubic-bezier(.2, .8, .2, 1);
}

@keyframes flip-new {
    0% { opacity: 0; transform: translateY(-12px) scale(.92); box-shadow: 0 0 0 0 rgba(217, 33, 40, .5); }
    45% { opacity: 1; transform: translateY(0) scale(1.03); box-shadow: 0 0 0 6px rgba(217, 33, 40, .25); }
    100% { transform: none; box-shadow: 0 1px 2px rgba(0, 0, 0, .05); }
}

/* A card that changed column or was edited: a brief glow. */
.flip-moved {
    animation: flip-moved 1400ms ease-out;
}

@keyframes flip-moved {
    0%, 30% { box-shadow: 0 0 0 4px rgba(217, 33, 40, .35); border-color: rgb(252 165 165); }
    100% { box-shadow: 0 1px 2px rgba(0, 0, 0, .05); }
}

.count-bump {
    animation: count-bump 600ms cubic-bezier(.2, .8, .2, 1);
}

@keyframes count-bump {
    0% { transform: scale(1); }
    35% { transform: scale(1.45); }
    100% { transform: scale(1); }
}

.live-event {
    animation: live-event 4s ease-out forwards;
}

@keyframes live-event {
    0% { opacity: 0; transform: translateY(4px); }
    10%, 75% { opacity: 1; transform: none; }
    100% { opacity: .5; }
}

@media (prefers-reduced-motion: reduce) {
    .flip-new, .flip-moved, .count-bump, .live-event { animation: none; }
}
</style>
