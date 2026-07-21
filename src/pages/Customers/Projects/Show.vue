<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '../../../stores/auth';
import { money } from '../../../helpers/money';
import api from '../../../helpers/api';
import { castResource } from '../../../types/responses.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import Loader from '../../../components/Loader.vue';

const route = useRoute();
const auth = useAuthStore();
const id = route.params.id;

const project = ref(null);
const attaching = ref(false);
const pendingDetach = ref(null);
const detaching = ref(false);

const title = computed(() => project.value?.name ?? `Project #${id}`);

const barColor = computed(() => ({
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
}[project.value?.progress_color] ?? 'bg-red-500'));

async function load() {
    const { data } = await api.get(`/customers/projects/${id}`);
    project.value = castResource(data);
}

onMounted(load);

async function attachRetroactively() {
    if (attaching.value) {
        return;
    }

    attaching.value = true;

    try {
        const { data } = await api.post(`/customers/projects/${id}/attach-retroactively`);
        project.value = castResource(data);
    } finally {
        attaching.value = false;
    }
}

async function confirmDetach() {
    if (detaching.value) {
        return;
    }

    detaching.value = true;

    try {
        const { data } = await api.delete(`/customers/projects/${id}/invoices/${pendingDetach.value.id}`);
        project.value = castResource(data);
        pendingDetach.value = null;
    } finally {
        detaching.value = false;
    }
}
</script>

<template>
    <AppLayout :title="title" fluid>
        <Loader v-if="! project" />
        <div v-else class="space-y-6">
            <FullWidthBox :collapsible="false">
                <template #title>
                    <h2 class="text-lg font-semibold">{{ project.name }} — {{ project.spent_percentage }}%</h2>
                </template>
                <template #actions>
                    <Button
                        v-if="auth.can('customerProjects.attachInvoicesRetroactively')"
                        variant="primary"
                        :disabled="attaching"
                        @click="attachRetroactively"
                    >
                        {{ attaching ? 'Attaching…' : 'Attach invoices retroactively' }}
                    </Button>
                </template>

                <div class="mb-4 h-3 w-full overflow-hidden rounded bg-gray-100">
                    <div class="h-full" :class="barColor" :style="{ width: `${Math.min(project.spent_percentage, 100)}%` }" />
                </div>

                <p v-if="project.reference" class="mb-3 text-sm text-gray-600"><strong>Reference:</strong> {{ project.reference }}</p>

                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2">Start</th>
                                <th class="border border-gray-300 px-2 py-2">End</th>
                                <th class="border border-gray-300 px-2 py-2 text-right">Total</th>
                                <th class="border border-gray-300 px-2 py-2 text-right">Spent</th>
                                <th class="border border-gray-300 px-2 py-2 text-right">Left</th>
                                <th class="border border-gray-300 px-2 py-2 text-right">Exceeded Left (+30%)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td class="border border-gray-300 px-2 py-2">{{ project.start_date }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ project.end_date }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(project.total_amount) }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(project.spent_amount) }} <span class="text-gray-400">({{ project.spent_percentage }}%)</span></td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(project.left_amount) }} <span class="text-gray-400">({{ project.left_percentage }}%)</span></td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(project.exceeded_left_amount) }} <span class="text-gray-400">({{ project.exceeded_left_percentage }}%)</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>

            <FullWidthBox title="Related clients" :collapsible="false">
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2" style="width: 70px;">ID</th>
                                <th class="border border-gray-300 px-2 py-2">Company</th>
                                <th class="border border-gray-300 px-2 py-2">Name</th>
                                <th class="border border-gray-300 px-2 py-2">Email</th>
                                <th class="border border-gray-300 px-2 py-2">Phone</th>
                                <th class="border border-gray-300 px-2 py-2">Type</th>
                                <th class="border border-gray-300 px-2 py-2 text-right">Spent</th>
                                <th class="border border-gray-300 px-2 py-2 text-center" style="width: 90px;">Invoices</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="! project.customers.length">
                                <td colspan="8" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No clients attached.</td>
                            </tr>
                            <tr v-for="customer in project.customers" :key="customer.id" class="hover:bg-gray-50">
                                <td class="border border-gray-300 px-2 py-2">{{ customer.id }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ customer.company_name ?? '-' }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ customer.name }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ customer.email ?? '-' }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ customer.phone ?? '-' }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ customer.type ?? '-' }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ customer.spent_amount }} <span v-if="customer.spent_percentage" class="text-gray-400">({{ customer.spent_percentage }}%)</span></td>
                                <td class="border border-gray-300 px-2 py-2 text-center">
                                    <a :href="customer.invoices_url" target="_blank" class="rounded border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-gray-50">View</a>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </FullWidthBox>

            <FullWidthBox title="Invoices" :collapsible="false">
                <div v-if="project.invoices.length" class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2">ID</th>
                                <th class="border border-gray-300 px-2 py-2">Agent</th>
                                <th class="border border-gray-300 px-2 py-2">Type</th>
                                <th class="border border-gray-300 px-2 py-2 text-right">Value</th>
                                <th class="border border-gray-300 px-2 py-2 text-right">Paid</th>
                                <th class="border border-gray-300 px-2 py-2">Date</th>
                                <th class="border border-gray-300 px-2 py-2 text-center" style="width: 110px;">Remove</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="invoice in project.invoices" :key="invoice.id" class="hover:bg-gray-50">
                                <td class="border border-gray-300 px-2 py-2 font-medium">
                                    <a :href="invoice.show_url" target="_blank" class="text-red-700 hover:underline">{{ invoice.gen_id }}</a>
                                </td>
                                <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ invoice.agent ?? '-' }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ invoice.type }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(invoice.amount) }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ money(invoice.paid_amount) }}</td>
                                <td class="border border-gray-300 px-2 py-2">{{ invoice.date }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-center">
                                    <button
                                        v-if="auth.can('customerProjects.detachInvoice')"
                                        type="button"
                                        class="rounded border border-red-200 bg-white px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                                        @click="pendingDetach = invoice"
                                    >
                                        Remove
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <p v-else class="text-sm text-gray-400">No invoices connected.</p>
            </FullWidthBox>
        </div>

        <ConfirmDialog
            :show="Boolean(pendingDetach)"
            title="Remove invoice from project?"
            :message="`Detach invoice ${pendingDetach?.gen_id} from this project?`"
            confirm-label="Yes, remove"
            confirm-variant="danger"
            :processing="detaching"
            @confirm="confirmDetach"
            @cancel="pendingDetach = null"
        />
    </AppLayout>
</template>
