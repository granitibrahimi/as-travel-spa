<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import api from '../../../helpers/api';
import { routeUrl } from '../../../helpers/route.js';
import { useNotificationsStore } from '../../../stores/notifications.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import CustomerDetails from '../../../components/CustomerDetails.vue';
import AsyncSelect from '../../../components/Form/AsyncSelect.vue';
import Alert from '../../../components/Alert.vue';
import Button from '../../../components/Button.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import Loader from '../../../components/Loader.vue';

/**
 * Merge two customers: every record of the old customer (invoices, credit
 * notes, payments, journals, travelers, projects, …) moves to the new customer
 * and the old customer is deleted. PUT /customers/customers/{new}/merge with
 * { old_customer_id }. The merge-preview endpoint supplies the record counts
 * shown before confirming.
 */
const router = useRouter();
const notifications = useNotificationsStore();

const form = reactive({ old_customer_id: null, new_customer_id: null });

const oldCustomer = ref(null);
const newCustomer = ref(null);
const preview = ref(null);
const loadingOld = ref(false);
const loadingNew = ref(false);

const errors = ref({});
const confirming = ref(false);
const processing = ref(false);

// Preview keys → labels, in display order.
const COUNT_LABELS = {
    invoices: 'Invoices',
    credit_notes: 'Credit notes',
    pro_invoices: 'Pro invoices',
    payments: 'Payments',
    gift_cards: 'Financial credit notes',
    refunds: 'Reimbursements',
    reconciliations: 'Reconciliations',
    journal_lines: 'Journal lines',
    persons: 'Linked travelers',
    projects: 'Projects',
};

const counts = computed(() => Object.entries(COUNT_LABELS)
    .map(([key, label]) => ({ key, label, count: preview.value?.counts?.[key] ?? 0 })));

const totalRecords = computed(() => counts.value.reduce((sum, row) => sum + row.count, 0));

const sameCustomer = computed(() => form.old_customer_id !== null && form.old_customer_id === form.new_customer_id);

const canMerge = computed(() => oldCustomer.value && newCustomer.value && !sameCustomer.value && !processing.value);

async function loadCustomer(id) {
    const { data } = await api.get(`/customers/customers/${id}`);

    return data.data;
}

watch(() => form.old_customer_id, async (id) => {
    oldCustomer.value = null;
    preview.value = null;

    if (!id) {
        return;
    }

    loadingOld.value = true;

    try {
        const [customer, { data }] = await Promise.all([
            loadCustomer(id),
            api.get(`/customers/customers/${id}/merge-preview`),
        ]);
        oldCustomer.value = customer;
        preview.value = data.data;
    } finally {
        loadingOld.value = false;
    }
});

watch(() => form.new_customer_id, async (id) => {
    newCustomer.value = null;

    if (!id) {
        return;
    }

    loadingNew.value = true;

    try {
        newCustomer.value = await loadCustomer(id);
    } finally {
        loadingNew.value = false;
    }
});

async function merge() {
    if (!canMerge.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    try {
        await api.put(`/customers/customers/${form.new_customer_id}/merge`, {
            old_customer_id: form.old_customer_id,
        });
        notifications.push({
            type: 'success',
            message: `${oldCustomer.value.full_name} was merged into ${newCustomer.value.full_name}.`,
        });
        router.push(routeUrl('customers.show', form.new_customer_id));
    } catch (error) {
        confirming.value = false;

        if (error.response?.status === 422) {
            errors.value = error.response.data.errors ?? {};
        } else if (error.response?.status === 424) {
            notifications.push({
                type: 'error',
                message: 'The old customer is still referenced by other records and could not be deleted. Nothing was changed.',
            });
        } else {
            notifications.push({ type: 'error', message: 'Could not merge the customers. Nothing was changed.' });
            throw error;
        }
    } finally {
        processing.value = false;
    }
}
</script>

<template>
    <AppLayout title="Merge customers">
        <div class="space-y-4">
            <Alert type="warning">
                Merging moves <strong>all</strong> records of the <strong>old customer</strong> — invoices, credit notes,
                pro invoices, payments, financial credit notes, reimbursements, reconciliations, journal lines, linked
                travelers and projects — to the <strong>new customer</strong>. The old customer is then
                <strong>permanently deleted</strong>. This cannot be undone.
            </Alert>

            <div class="grid gap-4 md:grid-cols-2">
                <FullWidthBox title="Old customer (will be deleted)" :collapsible="false">
                    <AsyncSelect
                        v-model="form.old_customer_id"
                        url="customers/customers/autosuggest"
                        label="Old customer"
                        placeholder="Search customers…"
                        :error="errors.old_customer_id?.[0] ?? ''"
                    />

                    <div class="mt-4">
                        <Loader v-if="loadingOld" />
                        <template v-else-if="oldCustomer">
                            <CustomerDetails :customer="oldCustomer" :boxed="false" />

                            <h4 class="mt-4 mb-2 text-sm font-semibold text-gray-700">Records that will move</h4>
                            <table class="w-full border-collapse border border-gray-300 text-sm">
                                <tbody>
                                    <tr v-for="row in counts" :key="row.key">
                                        <td class="border border-gray-300 px-2 py-1 text-gray-600">{{ row.label }}</td>
                                        <td class="border border-gray-300 px-2 py-1 text-right font-medium" :class="{ 'text-gray-400': row.count === 0 }">
                                            {{ row.count }}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </template>
                    </div>
                </FullWidthBox>

                <FullWidthBox title="New customer (keeps everything)" :collapsible="false">
                    <AsyncSelect
                        v-model="form.new_customer_id"
                        url="customers/customers/autosuggest"
                        label="New customer"
                        placeholder="Search customers…"
                    />

                    <div class="mt-4">
                        <Loader v-if="loadingNew" />
                        <CustomerDetails v-else-if="newCustomer" :customer="newCustomer" :boxed="false" />
                    </div>
                </FullWidthBox>
            </div>

            <Alert v-if="sameCustomer" type="danger">
                The old and the new customer must be different.
            </Alert>

            <Alert v-else-if="oldCustomer && newCustomer" type="danger">
                <strong>{{ oldCustomer.full_name }}</strong> (ID {{ oldCustomer.id }}) will be deleted and its
                {{ totalRecords }} record(s) will move to <strong>{{ newCustomer.full_name }}</strong> (ID {{ newCustomer.id }}).
            </Alert>

            <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink :to="routeUrl('customers.list')" class="inline-block rounded border border-gray-300 bg-white px-4 py-1.5 text-sm hover:bg-gray-50">
                    Cancel
                </RouterLink>
                <Button variant="danger" :disabled="!canMerge" @click="confirming = true">
                    Merge customers
                </Button>
            </footer>
        </div>

        <ConfirmDialog
            :show="confirming"
            title="Merge customers?"
            confirm-label="Merge and delete old customer"
            confirm-variant="danger"
            :processing="processing"
            @confirm="merge"
            @cancel="confirming = false"
        >
            <p v-if="oldCustomer && newCustomer" class="mt-2 text-sm text-gray-600">
                All records of <strong>{{ oldCustomer.full_name }}</strong> will move to
                <strong>{{ newCustomer.full_name }}</strong>, and <strong>{{ oldCustomer.full_name }}</strong>
                will be permanently deleted.
            </p>
        </ConfirmDialog>
    </AppLayout>
</template>
