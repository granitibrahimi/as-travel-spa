<script setup>
import { onMounted, reactive, ref } from 'vue';
import { RouterLink } from 'vue-router';
import api from '../../helpers/api';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import Button from '../../components/Button.vue';
import InputText from '../../components/Form/InputText.vue';
import Select from '../../components/Form/Select.vue';
import ApiPagination from '../../components/ApiPagination.vue';
import Loader from '../../components/Loader.vue';

// Fixed enums (mirror SentEmailTypeEnum + the statuses on the platform).
const types = [
    { value: 1, label: 'Customer Invoice' },
    { value: 2, label: 'Customer Invoice (with products)' },
    { value: 3, label: 'Customer Statement' },
];
const statuses = [
    { value: 'sent', label: 'Sent' },
    { value: 'opened', label: 'Opened' },
    { value: 'bounced', label: 'Bounced' },
];

const emails = ref(null);
const loading = ref(false);
const form = reactive({ search: '', type: null, status: null });

async function fetchEmails(page = 1) {
    loading.value = true;

    try {
        const { data } = await api.get('/sent-emails', {
            params: {
                search: form.search || undefined,
                type: form.type || undefined,
                status: form.status || undefined,
                page,
            },
        });
        emails.value = { data: data.data, ...data.meta };
    } finally {
        loading.value = false;
    }
}

onMounted(() => fetchEmails());

function clear() {
    form.search = '';
    form.type = null;
    form.status = null;
    fetchEmails();
}

const badgeClass = {
    sent: 'bg-gray-100 text-gray-600',
    opened: 'bg-green-100 text-green-700',
    bounced: 'bg-red-100 text-red-700',
};
const statusLabel = { sent: 'Sent', opened: 'Opened', bounced: 'Bounced' };
</script>

<template>
    <AppLayout title="Sent Emails" fluid>
        <div class="space-y-6">
            <FullWidthBox title="Filters" :collapsible="false">
                <form class="grid grid-cols-1 gap-3 md:grid-cols-4" @submit.prevent="fetchEmails()">
                    <div class="md:col-span-2">
                        <InputText v-model="form.search" label="Recipient / Subject" placeholder="Search…" />
                    </div>
                    <Select v-model="form.type" :options="types" label="Type" placeholder="All types" />
                    <Select v-model="form.status" :options="statuses" label="Status" placeholder="All statuses" />
                    <div class="flex items-end gap-2 md:col-span-4">
                        <Button type="submit" variant="primary">Filter</Button>
                        <Button type="button" @click="clear">Clear</Button>
                    </div>
                </form>
            </FullWidthBox>

            <FullWidthBox title="Sent Emails" :collapsible="false">
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2 text-center" style="width: 60px;">ID</th>
                                <th class="border border-gray-300 px-2 py-2" style="width: 220px;">Type</th>
                                <th class="border border-gray-300 px-2 py-2">To</th>
                                <th class="border border-gray-300 px-2 py-2">Subject</th>
                                <th class="border border-gray-300 px-2 py-2" style="width: 160px;">Sent by</th>
                                <th class="border border-gray-300 px-2 py-2" style="width: 130px;">Status</th>
                                <th class="border border-gray-300 px-2 py-2 text-center" style="width: 70px;">Opens</th>
                                <th class="border border-gray-300 px-2 py-2 whitespace-nowrap" style="width: 150px;">Sent at</th>
                                <th class="border border-gray-300 px-2 py-2 text-center" style="width: 80px;">View</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="loading || ! emails">
                                <td colspan="9" class="border border-gray-300 px-2 py-2"><Loader /></td>
                            </tr>
                            <tr v-else-if="emails.data.length === 0">
                                <td colspan="9" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No sent emails found.</td>
                            </tr>
                            <tr v-for="email in (loading ? [] : emails?.data ?? [])" :key="email.id" class="hover:bg-gray-50">
                                <td class="border border-gray-300 px-2 py-2 text-center font-medium">{{ email.id }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ email.type }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ email.to }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ email.subject }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ email.user ?? '-' }}</td>
                                <td class="border border-gray-300 px-2 py-2">
                                    <span class="inline-block rounded px-2 py-0.5 text-xs font-medium" :class="badgeClass[email.status]">
                                        {{ statusLabel[email.status] }}
                                    </span>
                                    <div v-if="email.bounce_reason" class="mt-1 text-xs text-gray-400">{{ email.bounce_reason }}</div>
                                </td>
                                <td class="border border-gray-300 px-2 py-2 text-center tabular-nums">{{ email.open_count }}</td>
                                <td class="border border-gray-300 px-2 py-2 whitespace-nowrap">{{ email.sent_at }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-center">
                                    <RouterLink :to="`/sent-emails/${email.id}`" class="inline-block rounded border border-gray-300 bg-white px-3 py-1 text-xs hover:bg-gray-50">View</RouterLink>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <ApiPagination v-if="emails" :paginator="emails" class="mt-4" @page="fetchEmails" />
            </FullWidthBox>
        </div>
    </AppLayout>
</template>
