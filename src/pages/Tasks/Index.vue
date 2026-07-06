<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import api from '../../helpers/api';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import Button from '../../components/Button.vue';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
import DropdownMenu from '../../components/DropdownMenu.vue';
import ApiPagination from '../../components/ApiPagination.vue';
import InputText from '../../components/Form/InputText.vue';
import Loader from '../../components/Loader.vue';

// All data comes from the platform JSON API (bearer token). Paths are relative
// to the api client's base (VITE_API_URL, e.g. https://csrm.test/api/v1).
const tasks = ref(null);
const loading = ref(false);
const q = ref('');
const unassigned = ref(false);

let request = null;

async function fetchTasks(page = 1) {
    request?.abort();
    const controller = new AbortController();
    request = controller;
    loading.value = true;

    try {
        const { data } = await api.get('/tasks', {
            signal: controller.signal,
            params: {
                q: q.value || undefined,
                unassigned: unassigned.value ? 1 : undefined,
                page,
            },
        });
        tasks.value = { data: data.data, ...data.meta };
    } catch (error) {
        if (error.code !== 'ERR_CANCELED') {
            throw error;
        }
    } finally {
        if (request === controller) {
            loading.value = false;
        }
    }
}

onMounted(() => fetchTasks());

const rowActions = (task) => [
    { label: 'View', href: `/tasks/${task.id}` },
    ...(task.ignored ? [] : [{ label: 'Ignore', danger: true, action: () => openIgnore(task) }]),
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
        await fetchTasks(tasks.value?.current_page ?? 1);
    } finally {
        ignoring.value = false;
    }
}

const statusClass = (status) => ({
    'Open': 'bg-blue-100 text-blue-700',
    'Assigned': 'bg-amber-100 text-amber-700',
    'Working': 'bg-purple-100 text-purple-700',
    'Offer sent': 'bg-cyan-100 text-cyan-700',
    'Finished': 'bg-green-100 text-green-700',
    'Ignored': 'bg-gray-200 text-gray-500',
}[status] ?? 'bg-gray-100 text-gray-600');
</script>

<template>
    <AppLayout title="Tasks" fluid>
        <FullWidthBox title="Tasks" :collapsible="false">
            <form class="mb-4 flex flex-wrap items-end gap-4" @submit.prevent="fetchTasks()">
                <div class="w-full md:max-w-sm">
                    <InputText v-model="q" label="Search" placeholder="Customer name or contact…" />
                </div>
                <label class="inline-flex items-center gap-2 pb-2 text-sm text-gray-700">
                    <input v-model="unassigned" type="checkbox"
                           class="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                           @change="fetchTasks()">
                    Not assigned only
                </label>
                <Button type="submit" variant="primary">Filter</Button>
            </form>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 60px;">ID</th>
                            <th class="border border-gray-300 px-2 py-2">Customer</th>
                            <th class="border border-gray-300 px-2 py-2">Source</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 90px;">Type</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 70px;">Pax</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 100px;">Status</th>
                            <th class="border border-gray-300 px-2 py-2">Assigned to</th>
                            <th class="border border-gray-300 px-2 py-2">Created</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 80px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! tasks">
                            <td colspan="9" class="border border-gray-300 px-2 py-2">
                                <Loader />
                            </td>
                        </tr>
                        <tr v-else-if="tasks.data.length === 0">
                            <td colspan="9" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No tasks found.</td>
                        </tr>
                        <tr v-for="task in (loading ? [] : tasks?.data ?? [])" :key="task.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 text-center font-medium">{{ task.id }}</td>
                            <td class="border border-gray-300 px-2 py-2 font-medium">
                                <RouterLink :to="`/tasks/${task.id}`" class="text-red-600 hover:underline">{{ task.customer || '—' }}</RouterLink>
                                <span class="block text-xs font-normal text-gray-400">{{ task.reference }}</span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2">{{ task.source }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">{{ task.type }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">{{ task.adults }}<template v-if="task.children"> +{{ task.children }}</template></td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <span class="rounded px-2 py-0.5 text-xs font-medium" :class="statusClass(task.status)">{{ task.status }}</span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2">{{ task.assigned_to ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-xs">
                                {{ task.created_at }}
                                <span class="block text-gray-400">by {{ task.created_by }}</span>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <DropdownMenu :items="rowActions(task)" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="tasks" :paginator="tasks" class="mt-4" @page="fetchTasks" />

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

            <template #footer>
                <div class="flex w-full items-center justify-between">
                    <RouterLink to="/tasks/create" class="inline-block rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700">+ New task</RouterLink>
                    <RouterLink to="/tasks/dashboard" class="inline-block rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50">Dashboard</RouterLink>
                </div>
            </template>
        </FullWidthBox>
    </AppLayout>
</template>
