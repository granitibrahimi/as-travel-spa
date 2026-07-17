<script setup>
import { computed, ref, watch } from 'vue';
import { useAuthStore } from '../../../stores/auth';
import { money } from '../../../helpers/money';
import api from '../../../helpers/api';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import ApiPagination from '../../../components/ApiPagination.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import DropdownMenu from '../../../components/DropdownMenu.vue';
import Loader from '../../../components/Loader.vue';

const props = defineProps({
    // 'active' | 'finished'
    mode: { type: String, default: 'active' },
});

const auth = useAuthStore();

const projects = ref(null);
const loading = ref(false);
const pendingDelete = ref(null);
const processing = ref(false);
const busyId = ref(null);

const title = computed(() => (props.mode === 'finished' ? 'Finished Projects' : 'Active Projects'));
const endpoint = computed(() => (props.mode === 'finished' ? '/customer-projects/finished' : '/customer-projects'));

async function fetchProjects(page = 1) {
    loading.value = true;

    try {
        const { data } = await api.get(endpoint.value, { params: { page } });
        projects.value = { data: data.data, ...data.pagination };
    } finally {
        loading.value = false;
    }
}

// Refetch when switching between the active/finished routes (same component).
watch(() => props.mode, () => fetchProjects(), { immediate: true });

async function transition(row, action) {
    busyId.value = row.id;

    try {
        await api.post(`/customer-projects/${row.id}/${action}`);
        await fetchProjects(projects.value?.current_page ?? 1);
    } finally {
        busyId.value = null;
    }
}

async function confirmDelete() {
    if (processing.value) {
        return;
    }

    processing.value = true;

    try {
        await api.delete(`/customer-projects/${pendingDelete.value.id}`);
        pendingDelete.value = null;
        await fetchProjects(projects.value?.current_page ?? 1);
    } finally {
        processing.value = false;
    }
}

const rowActions = (row) => [
    ...(auth.can('customerProjects.show') ? [{ label: 'View', href: `/projects/${row.id}` }] : []),
    ...(props.mode === 'active' && auth.can('customerProjects.complete')
        ? [{ label: busyId.value === row.id ? 'Completing…' : 'Complete', action: () => transition(row, 'complete') }]
        : []),
    ...(props.mode === 'finished' && auth.can('customerProjects.complete')
        ? [{ label: busyId.value === row.id ? 'Activating…' : 'Re-activate', action: () => transition(row, 'activate') }]
        : []),
    ...(auth.can('customerProjects.delete')
        ? [{ label: 'Delete', danger: true, action: () => (pendingDelete.value = row) }]
        : []),
];
</script>

<template>
    <AppLayout :title="title" fluid>
        <FullWidthBox :title="title" :collapsible="false">
            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2">Name</th>
                            <th class="border border-gray-300 px-2 py-2">Reference</th>
                            <th class="border border-gray-300 px-2 py-2 whitespace-nowrap" style="width: 190px;">Period</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 110px;">Total</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 110px;">Spent</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 110px;">Left</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 140px;">Spent %</th>
                            <th class="border border-gray-300 px-2 py-2">Customers</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 90px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! projects">
                            <td colspan="9" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="projects.data.length === 0">
                            <td colspan="9" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No projects found.</td>
                        </tr>
                        <tr v-for="project in (loading ? [] : projects?.data ?? [])" :key="project.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 font-medium">{{ project.name }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ project.reference ?? '-' }}</td>
                            <td class="border border-gray-300 px-2 py-2 whitespace-nowrap text-gray-600">{{ project.start_date }} → {{ project.end_date }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(project.total_amount) }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(project.spent_amount) }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(project.left_amount) }}</td>
                            <td class="border border-gray-300 px-2 py-2">
                                <div class="flex items-center gap-2">
                                    <div class="h-2 flex-1 overflow-hidden rounded bg-gray-100">
                                        <div class="h-full bg-red-500" :style="{ width: `${Math.min(project.spent_percentage, 100)}%` }" />
                                    </div>
                                    <span class="w-10 text-right text-xs tabular-nums text-gray-500">{{ Math.round(project.spent_percentage) }}%</span>
                                </div>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ (project.customers ?? []).join(', ') || '-' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <DropdownMenu :items="rowActions(project)" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="projects" :paginator="projects" class="mt-4" @page="fetchProjects" />
        </FullWidthBox>

        <ConfirmDialog
            :show="Boolean(pendingDelete)"
            title="Delete project?"
            :message="`This will permanently delete “${pendingDelete?.name}”.`"
            confirm-label="Yes, delete"
            confirm-variant="danger"
            :processing="processing"
            @confirm="confirmDelete"
            @cancel="pendingDelete = null"
        />
    </AppLayout>
</template>
