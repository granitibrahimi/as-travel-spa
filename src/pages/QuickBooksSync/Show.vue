<script setup>
import { onMounted, reactive, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import api from '../../helpers/api';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import Button from '../../components/Button.vue';
import InputText from '../../components/Form/InputText.vue';
import Select from '../../components/Form/Select.vue';
import Loader from '../../components/Loader.vue';

const route = useRoute();
const id = route.params.id;

const row = ref(null);
const statuses = ref([]);
const form = reactive({ status: null, qb_id: '' });
const errors = ref({});
const saving = ref(false);
const retrying = ref(false);

async function load() {
    const [{ data: detail }, { data: options }] = await Promise.all([
        api.get(`/quickbooks-sync/${id}`),
        api.get('/quickbooks-sync/options'),
    ]);
    row.value = detail.data ?? detail;
    statuses.value = options.statuses;
    form.status = row.value.status_value;
    form.qb_id = row.value.qb_id ?? '';
}

onMounted(load);

async function retry() {
    retrying.value = true;

    try {
        const { data } = await api.post(`/quickbooks-sync/${id}/retry`);
        row.value = data.data ?? data;
        form.status = row.value.status_value;
        form.qb_id = row.value.qb_id ?? '';
    } finally {
        retrying.value = false;
    }
}

async function saveStatus() {
    if (saving.value) {
        return;
    }

    saving.value = true;
    errors.value = {};

    try {
        const { data } = await api.post(`/quickbooks-sync/${id}/status`, {
            status: form.status,
            qb_id: form.qb_id === '' ? null : form.qb_id,
        });
        row.value = data.data ?? data;
    } catch (error) {
        if (error.response?.status === 422) {
            errors.value = error.response.data.errors ?? {};
        } else {
            throw error;
        }
    } finally {
        saving.value = false;
    }
}
</script>

<template>
    <AppLayout :title="`QuickBooks Sync #${id}`" fluid>
        <Loader v-if="! row" />
        <div v-else class="space-y-6">
            <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <FullWidthBox title="Details" :collapsible="false" class="lg:col-span-2">
                    <dl class="grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                        <div class="flex gap-2"><dt class="w-28 shrink-0 font-medium text-gray-500">ID</dt><dd>{{ row.id }}</dd></div>
                        <div class="flex gap-2"><dt class="w-28 shrink-0 font-medium text-gray-500">Entity</dt><dd>{{ row.entity }}</dd></div>
                        <div class="flex gap-2"><dt class="w-28 shrink-0 font-medium text-gray-500">Action</dt><dd>{{ row.action }}</dd></div>
                        <div class="flex gap-2">
                            <dt class="w-28 shrink-0 font-medium text-gray-500">Entity ID</dt>
                            <dd>
                                <a v-if="row.entity_url" :href="row.entity_url" target="_blank" class="text-red-700 hover:underline">{{ row.entity_id }}</a>
                                <span v-else>{{ row.entity_id }}</span>
                            </dd>
                        </div>
                        <div class="flex gap-2">
                            <dt class="w-28 shrink-0 font-medium text-gray-500">QB ID</dt>
                            <dd>
                                <a v-if="row.qb_url" :href="row.qb_url" target="_blank" class="text-red-700 hover:underline">{{ row.qb_id }}</a>
                                <span v-else>{{ row.qb_id ?? '-' }}</span>
                            </dd>
                        </div>
                        <div class="flex gap-2"><dt class="w-28 shrink-0 font-medium text-gray-500">Status</dt><dd>{{ row.status }}</dd></div>
                        <div class="flex gap-2"><dt class="w-28 shrink-0 font-medium text-gray-500">Created</dt><dd>{{ row.created_at }}</dd></div>
                        <div class="flex gap-2"><dt class="w-28 shrink-0 font-medium text-gray-500">Updated</dt><dd>{{ row.updated_at }}</dd></div>
                    </dl>

                    <template #footer>
                        <div class="flex items-center gap-2">
                            <Button type="button" variant="primary" :disabled="retrying" @click="retry">{{ retrying ? 'Retrying…' : 'Retry sync' }}</Button>
                            <RouterLink to="/quickbooks-sync" class="rounded border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50">Back to list</RouterLink>
                        </div>
                    </template>
                </FullWidthBox>

                <FullWidthBox title="Update status" :collapsible="false">
                    <form class="space-y-3" @submit.prevent="saveStatus">
                        <Select v-model="form.status" :options="statuses" label="Status" :placeholder="null" :error="errors.status?.[0]" />
                        <InputText v-model="form.qb_id" label="QuickBooks ID" placeholder="QB ID…" :error="errors.qb_id?.[0]" />
                        <Button type="submit" variant="primary" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</Button>
                    </form>
                </FullWidthBox>
            </div>

            <FullWidthBox v-if="row.updated_data?.length" title="Updated fields" :collapsible="false">
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2">Field</th>
                                <th class="border border-gray-300 px-2 py-2">Old value</th>
                                <th class="border border-gray-300 px-2 py-2">New value</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="change in row.updated_data" :key="change.field">
                                <td class="border border-gray-300 px-2 py-2 font-medium">{{ change.field }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ change.old ?? '-' }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ change.new ?? '-' }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>

            <FullWidthBox v-if="row.response" title="Response data" :collapsible="false">
                <dl class="mb-3 space-y-1 text-sm">
                    <div v-if="row.response.message" class="flex gap-2"><dt class="w-28 shrink-0 font-medium text-gray-500">Message</dt><dd>{{ row.response.message }}</dd></div>
                    <div v-if="row.response.statusCode" class="flex gap-2"><dt class="w-28 shrink-0 font-medium text-gray-500">Status code</dt><dd>{{ row.response.statusCode }}</dd></div>
                </dl>
                <pre class="max-h-[60vh] overflow-auto rounded border border-gray-200 bg-gray-50 p-3 text-xs">{{ JSON.stringify(row.response, null, 2) }}</pre>
            </FullWidthBox>
        </div>
    </AppLayout>
</template>
