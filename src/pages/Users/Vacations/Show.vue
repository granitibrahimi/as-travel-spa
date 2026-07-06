<script setup>
import { onMounted, reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import api from '../../../helpers/api.js';
import { useAuthStore } from '../../../stores/auth.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import Textarea from '../../../components/Form/Textarea.vue';
import Select from '../../../components/Form/Select.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import Loader from '../../../components/Loader.vue';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const id = route.params.id;

const request = ref(null);
const statuses = ref([]);

const respondForm = reactive({ type: null, response: '' });
const respondErrors = ref({});
const responding = ref(false);

const showDelete = ref(false);
const deleting = ref(false);

async function load() {
    const { data } = await api.get(`/vacations/${id}`);
    request.value = data.data;
    statuses.value = data.statuses;
    respondForm.type = data.data.status;
    respondForm.response = data.data.response ?? '';
}

onMounted(() => load());

async function respond() {
    if (responding.value) {
        return;
    }

    responding.value = true;
    respondErrors.value = {};

    try {
        await api.post(`/vacations/${id}/respond`, respondForm);
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
        await api.delete(`/vacations/${id}`);
        showDelete.value = false;
        router.push(`/vacations/requests?user=${userId}`);
    } finally {
        deleting.value = false;
    }
}
</script>

<template>
    <AppLayout title="Vacation request" fluid>
        <Loader v-if="! request" />
        <div v-else class="space-y-6">
            <FullWidthBox title="Request details" :collapsible="false">
                <template #actions>
                    <RouterLink v-if="auth.can('vacations.edit')" :to="`/vacations/${id}/edit`" class="inline-flex items-center rounded border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50">Edit</RouterLink>
                    <Button v-if="auth.can('vacations.delete')" variant="danger" size="sm" @click="showDelete = true">Delete</Button>
                </template>

                <dl class="grid grid-cols-1 gap-x-8 gap-y-2 text-sm md:grid-cols-2">
                    <div class="flex justify-between border-b border-gray-100 py-1"><dt class="text-gray-500">User</dt><dd class="font-medium">{{ request.user }}</dd></div>
                    <div class="flex justify-between border-b border-gray-100 py-1"><dt class="text-gray-500">Type</dt><dd class="font-medium">{{ request.type_label }}</dd></div>
                    <div class="flex justify-between border-b border-gray-100 py-1"><dt class="text-gray-500">Status</dt><dd class="font-medium">{{ request.status_label }}</dd></div>
                    <div class="flex justify-between border-b border-gray-100 py-1"><dt class="text-gray-500">Working days</dt><dd>{{ request.working_days }}</dd></div>
                    <div class="flex justify-between border-b border-gray-100 py-1"><dt class="text-gray-500">From</dt><dd>{{ request.from }}</dd></div>
                    <div class="flex justify-between border-b border-gray-100 py-1"><dt class="text-gray-500">To</dt><dd>{{ request.to }}</dd></div>
                    <div class="flex justify-between border-b border-gray-100 py-1"><dt class="text-gray-500">Working weekend</dt><dd>{{ request.working_weekend ? 'Yes' : 'No' }}</dd></div>
                    <div class="col-span-full py-1"><dt class="text-gray-500">Description</dt><dd class="mt-1">{{ request.description || '—' }}</dd></div>
                    <div v-if="request.responder" class="col-span-full py-1">
                        <dt class="text-gray-500">Response ({{ request.responder }})</dt>
                        <dd class="mt-1">{{ request.response || '—' }}</dd>
                    </div>
                </dl>
            </FullWidthBox>

            <form v-if="auth.can('vacations.respond')" @submit.prevent="respond">
                <FullWidthBox title="Respond" :collapsible="false">
                    <div class="space-y-4">
                        <Select v-model="respondForm.type" :options="statuses" label="Decision" :placeholder="null" :error="respondErrors.type" />
                        <Textarea v-model="respondForm.response" label="Response note" :error="respondErrors.response" />
                    </div>
                    <template #footer>
                        <div class="flex items-center gap-3">
                            <RouterLink :to="`/vacations/requests?user=${request.user_id}`" class="inline-flex items-center rounded border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50">Back</RouterLink>
                            <Button type="submit" variant="primary" :disabled="responding">
                                {{ responding ? 'Saving…' : 'Save response' }}
                            </Button>
                        </div>
                    </template>
                </FullWidthBox>
            </form>
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
