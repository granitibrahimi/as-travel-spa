<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import api from '../../../helpers/api.js';
import { routeUrl } from '../../../helpers/route.js';
import { useAuthStore } from '../../../stores/auth.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Alert from '../../../components/Alert.vue';
import Button from '../../../components/Button.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import Loader from '../../../components/Loader.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const id = route.params.id;

const person = ref(null);
const title = computed(() => person.value?.full_name ?? '');

const selectedLog = ref(null);
const showDelete = ref(false);
const deleting = ref(false);

// Details rows shown only when they have a value.
const detailRows = computed(() => {
    if (! person.value) {
        return [];
    }

    const p = person.value;

    return [
        ['ID', p.id],
        ['First name', p.first_name],
        ['Last name', p.last_name],
        ['Nationality', p.nationality],
        ['Classification', p.classification_label],
        ['Date of birth', p.dob],
        ['Email', p.email],
        ['Passport number', p.passport_number],
        [
            'Passport expiry date',
            p.passport_expiry_date ? `${p.passport_expiry_date} | ${p.passport_expiry_human}` : null,
        ],
        ['No AI', p.no_ai ? 'Yes' : 'No'],
        ['Created', p.created_at],
    ].filter(([, value]) => value !== null && value !== undefined && value !== '');
});

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;

    try {
        await api.delete(`/customers/persons/${id}`);
        router.push(routeUrl('persons.list'));
    } finally {
        deleting.value = false;
        showDelete.value = false;
    }
}

onMounted(async () => {
    const { data } = await api.get(`/customers/persons/${id}`);
    person.value = data.data;
});
</script>

<template>
    <AppLayout :title="title ? `Traveler: ${title}` : 'Traveler'" fluid>
        <Loader v-if="! person" />

        <div v-else class="space-y-6">
            <!-- Actions -->
            <div class="flex flex-wrap justify-end gap-3">
                <RouterLink
                    v-if="auth.can('persons.edit')"
                    :to="routeUrl('persons.edit', person.id)"
                    class="inline-block rounded border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50"
                >
                    Edit
                </RouterLink>
                <Button v-if="auth.can('persons.delete')" size="sm" variant="danger" @click="showDelete = true">Delete</Button>
            </div>

            <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <!-- Details -->
                <FullWidthBox :title="person.full_name" :collapsible="false">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <tbody>
                            <tr v-for="[label, value] in detailRows" :key="label">
                                <th class="w-60 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium">{{ label }}</th>
                                <td class="border border-gray-300 px-2 py-2">{{ value }}</td>
                            </tr>
                        </tbody>
                    </table>

                    <template v-if="person.contact_references?.length">
                        <h3 class="mb-2 mt-6 text-sm font-semibold uppercase text-gray-500">Contact references</h3>
                        <table class="w-full border-collapse border border-gray-300 text-sm">
                            <tbody>
                                <tr v-for="reference in person.contact_references" :key="reference.id">
                                    <th class="w-60 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium">{{ reference.type_label }}</th>
                                    <td class="border border-gray-300 px-2 py-2">{{ reference.reference }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </template>
                </FullWidthBox>

                <!-- Relations -->
                <FullWidthBox title="Traveler relations" :collapsible="false">
                    <Alert v-if="! person.relations?.length" type="warning">
                        This traveler is not related to anything on the system yet!
                    </Alert>

                    <div v-else class="overflow-x-auto">
                        <table class="w-full border-collapse border border-gray-300 text-sm">
                            <thead>
                                <tr class="text-left text-xs uppercase text-gray-500">
                                    <th class="border border-gray-300 px-2 py-2">Customer</th>
                                    <th class="border border-gray-300 px-2 py-2">Relation</th>
                                    <th class="border border-gray-300 px-2 py-2">From</th>
                                    <th class="border border-gray-300 px-2 py-2">To</th>
                                    <th class="border border-gray-300 px-2 py-2 text-center">Active</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="relation in person.relations" :key="relation.id" class="hover:bg-gray-50">
                                    <td class="border border-gray-300 px-2 py-2">
                                        <RouterLink
                                            v-if="relation.customer"
                                            :to="routeUrl('customers.show', relation.customer.id)"
                                            class="text-red-600 hover:underline"
                                        >
                                            {{ relation.customer.name }}
                                        </RouterLink>
                                        <span v-else class="text-gray-400">Deleted</span>
                                    </td>
                                    <td class="border border-gray-300 px-2 py-2">{{ relation.type }}</td>
                                    <td class="border border-gray-300 px-2 py-2">{{ relation.from_date ?? '—' }}</td>
                                    <td class="border border-gray-300 px-2 py-2">{{ relation.to_date ?? '—' }}</td>
                                    <td class="border border-gray-300 px-2 py-2 text-center">
                                        <span
                                            class="rounded px-2 py-0.5 text-xs font-medium"
                                            :class="relation.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
                                        >
                                            {{ relation.active ? 'Yes' : 'No' }}
                                        </span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </FullWidthBox>
            </div>

            <!-- Logs -->
            <FullWidthBox title="Logs" :collapsible="false">
                <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div class="overflow-x-auto">
                        <table class="w-full border-collapse border border-gray-300 text-sm">
                            <thead>
                                <tr class="text-left text-xs uppercase text-gray-500">
                                    <th class="border border-gray-300 px-2 py-2" style="width: 60px;">ID</th>
                                    <th class="border border-gray-300 px-2 py-2">Action</th>
                                    <th class="border border-gray-300 px-2 py-2">Date</th>
                                    <th class="border border-gray-300 px-2 py-2">User</th>
                                    <th class="border border-gray-300 px-2 py-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-if="! person.logs?.length">
                                    <td colspan="5" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No log entries yet.</td>
                                </tr>
                                <tr
                                    v-for="log in person.logs"
                                    :key="log.id"
                                    class="hover:bg-gray-50"
                                    :class="{ 'bg-red-50': selectedLog?.id === log.id }"
                                >
                                    <td class="border border-gray-300 px-2 py-2">{{ log.id }}</td>
                                    <td class="border border-gray-300 px-2 py-2">{{ log.action }}</td>
                                    <td class="border border-gray-300 px-2 py-2">{{ log.created_at ?? '—' }}</td>
                                    <td class="border border-gray-300 px-2 py-2">{{ log.user }}</td>
                                    <td class="border border-gray-300 px-2 py-2 text-center">
                                        <button type="button" class="text-sm text-red-600 hover:underline" @click="selectedLog = log">
                                            View details
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div>
                        <p v-if="! selectedLog" class="text-sm text-gray-500">
                            Click "View details" on a log entry to see its data here.
                        </p>
                        <template v-else>
                            <p class="mb-2 text-sm font-medium">
                                #{{ selectedLog.id }} · {{ selectedLog.action }} · {{ selectedLog.created_at }} · {{ selectedLog.user }}
                            </p>
                            <p v-if="! selectedLog.metadata || Object.keys(selectedLog.metadata).length === 0" class="text-sm text-gray-500">
                                No changes recorded.
                            </p>
                            <pre
                                v-else
                                class="max-h-[600px] overflow-auto whitespace-pre-wrap rounded border border-gray-200 bg-gray-50 p-3 text-xs"
                            >{{ JSON.stringify(selectedLog.metadata, null, 2) }}</pre>
                        </template>
                    </div>
                </div>
            </FullWidthBox>

            <FullWidthBox :collapsible="false">
                <template #footer>
                    <RouterLink :to="routeUrl('persons.list')" class="inline-block rounded border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50">
                        Back to list
                    </RouterLink>
                </template>
            </FullWidthBox>
        </div>

        <ConfirmDialog
            :show="showDelete"
            title="Delete traveler?"
            :message="person ? `${person.full_name} and their contact references will be permanently deleted.` : ''"
            confirm-label="Yes, delete"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="showDelete = false"
        />
    </AppLayout>
</template>
