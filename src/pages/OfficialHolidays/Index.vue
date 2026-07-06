<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import api from '../../helpers/api';
import { useAuthStore } from '../../stores/auth';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
import DropdownMenu from '../../components/DropdownMenu.vue';
import Loader from '../../components/Loader.vue';

const auth = useAuthStore();

const holidays = ref(null);
const loading = ref(false);
const toDelete = ref(null);
const deleting = ref(false);

async function fetchHolidays() {
    loading.value = true;

    try {
        const { data } = await api.get('/official-holidays');
        holidays.value = data.data;
    } finally {
        loading.value = false;
    }
}

onMounted(fetchHolidays);

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;

    try {
        await api.delete(`/official-holidays/${toDelete.value.id}`);
        toDelete.value = null;
        await fetchHolidays();
    } finally {
        deleting.value = false;
    }
}

const rowActions = (holiday) => [
    ...(auth.can('officialHolidays.edit') ? [{ label: 'Edit', href: `/official-holidays/${holiday.id}/edit` }] : []),
    ...(auth.can('officialHolidays.delete') ? [{ label: 'Delete', danger: true, action: () => (toDelete.value = holiday) }] : []),
];
</script>

<template>
    <AppLayout title="Official holidays">
        <FullWidthBox title="Official holidays" :collapsible="false">
            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2" style="width: 130px;">Date</th>
                            <th class="border border-gray-300 px-2 py-2">Name</th>
                            <th class="border border-gray-300 px-2 py-2">Description</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 100px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! holidays">
                            <td colspan="4" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="holidays.length === 0">
                            <td colspan="4" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No holidays.</td>
                        </tr>
                        <tr v-for="holiday in (loading ? [] : holidays ?? [])" :key="holiday.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2">{{ holiday.holiday_date_label }}</td>
                            <td class="border border-gray-300 px-2 py-2 font-medium">{{ holiday.name }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ holiday.description }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <DropdownMenu :items="rowActions(holiday)" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <template #footer>
                <RouterLink v-if="auth.can('officialHolidays.create')" to="/official-holidays/create" class="inline-block rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700">
                    + Holiday
                </RouterLink>
            </template>
        </FullWidthBox>

        <ConfirmDialog
            :show="Boolean(toDelete)"
            title="Delete holiday?"
            :message="toDelete ? `${toDelete.name} will be permanently deleted.` : ''"
            confirm-label="Yes, delete"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="toDelete = null"
        />
    </AppLayout>
</template>
