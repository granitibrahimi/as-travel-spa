<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import api from '../../../helpers/api.js';
import { routeUrl } from '../../../helpers/route.js';
import { castResource } from '../../../types/responses.js';
import { useAuthStore } from '../../../stores/auth.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import Textarea from '../../../components/Form/Textarea.vue';
import Select from '../../../components/Form/Select.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import UserDetails from '../../../components/UserDetails.vue';
import Loader from '../../../components/Loader.vue';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const id = route.params.id;

const request = ref(null);
const statuses = ref([]);
// Full user record for the left-hand "User details" panel — fetched
// best-effort so the layout mirrors the user show page; falls back to just
// the name from the request when the viewer can't read users.
const userDetails = ref(null);

const respondForm = reactive({ type: null, response: '' });
const respondErrors = ref({});
const responding = ref(false);

const showDelete = ref(false);
const deleting = ref(false);

async function load() {
    // ShowVacationRequestAction wraps its payload as { data: { data: <fields>,
    // statuses: [...] } }, so castResource() unwraps one level to { data, statuses }
    // and the request fields sit one deeper.
    const { data } = await api.get(`/users/vacations/${id}`);
    const body = castResource(data);
    const fields = body.data;

    request.value = fields;
    statuses.value = body.statuses;
    respondForm.type = fields.status;
    respondForm.response = fields.response ?? '';

    userDetails.value = null;
    if (auth.can('users.show')) {
        try {
            const res = await api.get(`/users/users/${fields.user_id}`);
            userDetails.value = castResource(res.data);
        } catch {
            userDetails.value = null;
        }
    }
}

onMounted(() => load());

// Once a request has been answered (a responder is recorded, or the status has
// moved off "Open"), the inline Respond form is retired — further changes to the
// decision or note are made from the Edit page instead.
const hasResponse = computed(() => {
    const r = request.value;

    return !! r && (!! r.responder || r.status_label !== 'Open');
});

// Same colour language as the list views so the decision reads at a glance.
const statusClass = (status) => ({
    Approved: 'bg-green-100 text-green-700',
    Rejected: 'bg-red-100 text-red-700',
    Open: 'bg-amber-100 text-amber-700',
    Canceled: 'bg-gray-200 text-gray-700',
    'Self-canceled': 'bg-gray-200 text-gray-700',
}[status] ?? 'bg-gray-100 text-gray-600');

const requestRows = computed(() => {
    const r = request.value;

    if (! r) {
        return [];
    }

    return [
        ['Type', r.type_label],
        ['Status', r.status_label],
        ['From', r.from],
        ['To', r.to],
        ['Working days', r.working_days],
        ['Working weekend', r.working_weekend ? 'Yes' : 'No'],
        ['Description', r.description || '—'],
        ...(r.responder ? [[`Response (${r.responder})`, r.response || '—']] : []),
    ];
});

async function respond() {
    if (responding.value) {
        return;
    }

    responding.value = true;
    respondErrors.value = {};

    try {
        await api.post(`/users/vacations/${id}/respond`, respondForm);
        await load();
    } catch (error) {
        if (error.response?.status === 422) {
            respondErrors.value = Object.fromEntries(
                Object.entries(error.response.data.errors ?? {}).map(([field, messages]) => [field, messages[0]]),
            );
        } else {
            throw error;
        }
    } finally {
        responding.value = false;
    }
}

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;

    try {
        const userId = request.value.user_id;
        await api.delete(`/users/vacations/${id}`);
        showDelete.value = false;
        router.push(routeUrl('vacations.requests', { user: userId }));
    } finally {
        deleting.value = false;
    }
}
</script>

<template>
    <AppLayout title="Vacation request" fluid>
        <Loader v-if="! request" />

        <div v-else class="space-y-6">
            <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <UserDetails v-if="userDetails" :user="userDetails" title="User details" />
                <FullWidthBox v-else title="User details" :collapsible="false">
                    <p class="text-sm text-gray-700">{{ request.user || '—' }}</p>
                </FullWidthBox>

                <FullWidthBox title="Vacation details" :collapsible="false">
                    <template #actions>
                        <RouterLink v-if="auth.can('vacations.edit')" :to="routeUrl('vacations.edit', id)" class="inline-block rounded border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50">Edit</RouterLink>
                        <Button v-if="auth.can('vacations.delete')" variant="danger" size="sm" @click="showDelete = true">Delete</Button>
                    </template>

                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <tbody>
                            <tr v-for="[label, value] in requestRows" :key="label">
                                <th class="w-48 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">{{ label }}</th>
                                <td class="border border-gray-300 px-2 py-2">
                                    <span
                                        v-if="label === 'Status'"
                                        class="inline-block rounded px-2 py-0.5 text-sm font-bold uppercase tracking-wide"
                                        :class="statusClass(value)"
                                    >{{ value }}</span>
                                    <template v-else>{{ value ?? '-' }}</template>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </FullWidthBox>
            </div>

            <form v-if="auth.can('vacations.respond') && ! hasResponse" @submit.prevent="respond">
                <FullWidthBox title="Respond" :collapsible="false">
                    <div class="space-y-4">
                        <Select v-model="respondForm.type" :options="statuses" label="Decision" :placeholder="null" :error="respondErrors.type" />
                        <Textarea v-model="respondForm.response" label="Response note" :error="respondErrors.response" />
                    </div>
                    <template #footer>
                        <div class="flex items-center gap-3">
                            <RouterLink :to="routeUrl('vacations.requests', { user: request.user_id })" class="inline-flex items-center rounded border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50">Back</RouterLink>
                            <Button type="submit" variant="primary" :disabled="responding">
                                {{ responding ? 'Saving…' : 'Save response' }}
                            </Button>
                        </div>
                    </template>
                </FullWidthBox>
            </form>

            <FullWidthBox v-else-if="hasResponse" title="Respond" :collapsible="false">
                <p class="text-sm text-gray-600">
                    This request has already been answered.
                    <RouterLink v-if="auth.can('vacations.edit')" :to="routeUrl('vacations.edit', id)" class="text-red-700 hover:underline">Edit the request</RouterLink>
                    <span v-if="auth.can('vacations.edit')"> to change the decision or note.</span>
                </p>
            </FullWidthBox>
        </div>

        <ConfirmDialog
            :show="showDelete"
            title="Delete vacation request?"
            message="This request will be permanently deleted and days recalculated."
            confirm-label="Yes, delete"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="showDelete = false"
        />
    </AppLayout>
</template>
