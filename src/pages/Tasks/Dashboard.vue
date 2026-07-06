<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import api from '../../helpers/api';
import AppLayout from '../../layouts/AppLayout.vue';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
import DropdownMenu from '../../components/DropdownMenu.vue';
import Loader from '../../components/Loader.vue';

const columns = ref([]);
const loading = ref(false);
const inTime = ref(null);

async function fetchDashboard() {
    loading.value = true;

    try {
        const { data } = await api.get('/tasks/dashboard', {
            params: { in_time: inTime.value || undefined },
        });
        columns.value = data.columns ?? [];
    } finally {
        loading.value = false;
    }
}

function setPeriod(period) {
    inTime.value = period;
    fetchDashboard();
}

onMounted(() => fetchDashboard());

// --- Drag & drop reordering (within one status column) ---
const dragging = ref(null); // { status, id }

function onDragStart(status, id) {
    dragging.value = { status, id };
}

function onDropOnCard(status, targetId) {
    if (!dragging.value || dragging.value.status !== status || dragging.value.id === targetId) {
        dragging.value = null;
        return;
    }

    const column = columns.value.find((candidate) => candidate.status === status);
    const fromIndex = column.tasks.findIndex((task) => task.id === dragging.value.id);
    const toIndex = column.tasks.findIndex((task) => task.id === targetId);
    const [moved] = column.tasks.splice(fromIndex, 1);
    column.tasks.splice(toIndex, 0, moved);

    persist(column);
    dragging.value = null;
}

function onDropOnColumn(status) {
    if (!dragging.value || dragging.value.status !== status) {
        dragging.value = null;
        return;
    }

    const column = columns.value.find((candidate) => candidate.status === status);
    const fromIndex = column.tasks.findIndex((task) => task.id === dragging.value.id);

    if (fromIndex === -1 || fromIndex === column.tasks.length - 1) {
        dragging.value = null;
        return;
    }

    const [moved] = column.tasks.splice(fromIndex, 1);
    column.tasks.push(moved);

    persist(column);
    dragging.value = null;
}

function persist(column) {
    api.post('/tasks/reorder', {
        ordered_ids: column.tasks.map((task) => task.id),
    });
}

const cardActions = (task) => [
    { label: 'View', href: `/tasks/${task.id}` },
    { label: 'Ignore', danger: true, action: () => openIgnore(task) },
];

// --- Ignore with a required reason ---
const taskToIgnore = ref(null);
const ignoreReason = ref('');
const ignoreError = ref('');
const ignoring = ref(false);

function openIgnore(task) {
    taskToIgnore.value = task;
    ignoreReason.value = '';
    ignoreError.value = '';
}

async function confirmIgnore() {
    if (ignoring.value) {
        return;
    }

    if (!ignoreReason.value.trim()) {
        ignoreError.value = 'A reason is required.';
        return;
    }

    ignoring.value = true;

    try {
        await api.post(`/tasks/${taskToIgnore.value.id}/ignore`, { reason: ignoreReason.value.trim() });
        taskToIgnore.value = null;
        await fetchDashboard();
    } finally {
        ignoring.value = false;
    }
}
</script>

<template>
    <AppLayout title="Tasks dashboard" fluid>
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div class="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
                <button v-for="period in [
                            { value: null, label: 'All' },
                            { value: 'today', label: 'Today' },
                            { value: 'this_week', label: 'This week' },
                        ]"
                        :key="period.label"
                        type="button"
                        class="rounded px-4 py-1.5 text-sm font-medium"
                        :class="(inTime ?? null) === period.value ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-gray-50'"
                        @click="setPeriod(period.value)">
                    {{ period.label }}
                </button>
            </div>

            <div class="flex gap-2">
                <RouterLink to="/tasks/create" class="inline-block rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700">+ New task</RouterLink>
                <RouterLink to="/tasks" class="inline-block rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">List view</RouterLink>
            </div>
        </div>

        <Loader v-if="loading && columns.length === 0" />

        <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <section
                v-for="column in columns"
                :key="column.status"
                class="rounded-lg border border-gray-200 bg-gray-50 p-3"
                @dragover.prevent
                @drop.prevent="onDropOnColumn(column.status)"
            >
                <h2 class="mb-3 flex items-center justify-between text-sm font-semibold uppercase text-gray-600">
                    {{ column.status }}
                    <span class="rounded bg-gray-200 px-2 py-0.5 text-xs">{{ column.tasks.length }}</span>
                </h2>

                <p v-if="column.tasks.length === 0" class="py-2 text-center text-xs text-gray-400">No tasks.</p>

                <div class="space-y-3">
                    <div
                        v-for="task in column.tasks"
                        :key="task.id"
                        class="cursor-grab rounded-lg border border-gray-200 bg-white p-3 shadow-sm active:cursor-grabbing"
                        :class="dragging?.id === task.id ? 'opacity-50 ring-2 ring-red-300' : ''"
                        draggable="true"
                        @dragstart="onDragStart(column.status, task.id)"
                        @dragend="dragging = null"
                        @dragover.prevent
                        @drop.prevent.stop="onDropOnCard(column.status, task.id)"
                    >
                        <div class="flex items-start justify-between gap-2">
                            <RouterLink :to="`/tasks/${task.id}`" class="font-medium text-gray-900 hover:text-red-600">#{{ task.id }} · {{ task.customer || '—' }}</RouterLink>
                            <div class="flex items-center gap-1">
                                <span class="select-none text-gray-300" title="Drag to reorder">⠿</span>
                                <DropdownMenu :items="cardActions(task)" />
                            </div>
                        </div>

                        <p class="mt-1 text-xs text-gray-500">
                            {{ task.source }} · {{ task.reference }}
                        </p>
                        <p class="mt-1 text-xs text-gray-500">
                            {{ task.type }} · {{ task.adults }} adults<template v-if="task.children"> + {{ task.children }} children</template>
                        </p>

                        <div class="mt-2 flex items-center justify-between text-xs text-gray-400">
                            <span>{{ task.created_since }}</span>
                            <span v-if="task.assigned_to" class="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">{{ task.assigned_to }}</span>
                        </div>
                    </div>
                </div>
            </section>
        </div>

        <ConfirmDialog
            :show="Boolean(taskToIgnore)"
            title="Ignore task?"
            :message="taskToIgnore ? `Task #${taskToIgnore.id} will be marked as ignored.` : ''"
            confirm-label="Ignore task"
            confirm-variant="danger"
            :processing="ignoring"
            @confirm="confirmIgnore"
            @cancel="taskToIgnore = null"
        >
            <label class="mt-3 block text-sm font-medium text-gray-700">Reason *</label>
            <textarea v-model="ignoreReason" rows="3"
                      class="mt-1 w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      placeholder="Why is this task being ignored?"></textarea>
            <p v-if="ignoreError" class="mt-1 text-xs text-red-600">{{ ignoreError }}</p>
        </ConfirmDialog>
    </AppLayout>
</template>
