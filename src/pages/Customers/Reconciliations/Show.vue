<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { money } from '../../../helpers/money';
import api from '../../../helpers/api';
import { castResource } from '../../../types/responses.js';
import { routeUrl } from '../../../helpers/route.js';
import { useAuthStore } from '../../../stores/auth';
import { useNotificationsStore } from '../../../stores/notifications.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import DropdownMenu from '../../../components/DropdownMenu.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import CustomerTransactionLinks from '../../../components/CustomerTransactionLinks.vue';
import Loader from '../../../components/Loader.vue';
import CustomerDetails from "../../../components/CustomerDetails.vue";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const notifications = useNotificationsStore();

const reconciliation = ref(null);

async function load() {
    const { data } = await api.get(`/customers/reconciliations/${route.params.id}`);
    reconciliation.value = castResource(data);
}

onMounted(load);

const toUnlink = ref(null);
const unlinking = ref(false);

const unlinkMessage = computed(() => toUnlink.value
    ? `This reverses ${toUnlink.value.reference ?? toUnlink.value.transaction_id} from this reconciliation and restores the balance it adjusted.`
    : '');

async function confirmUnlink() {
    if (unlinking.value) {
        return;
    }

    unlinking.value = true;

    // Unlinking the reconciliation's last link deletes the reconciliation
    // itself (backend UnlinkCustomerTransactionNewLinkAction), so reloading
    // this page would 404 — bounce to the list instead.
    const wasLastLink = (reconciliation.value?.links?.length ?? 0) <= 1;

    try {
        await api.delete(`/customers/transaction-links/${toUnlink.value.id}`);
        toUnlink.value = null;

        if (wasLastLink) {
            router.push(routeUrl('customerReconciliations.list'));
        } else {
            await load();
        }
    } catch (error) {
        notifications.push({
            type: 'error',
            message: error.response?.data?.errors?.link?.[0] ?? 'Could not unlink this transaction.',
        });
    } finally {
        unlinking.value = false;
    }
}

// Reconciliations have no Edit — only QuickBooks and Delete on the show page.
const actions = computed(() => (reconciliation.value ? [
    ...(reconciliation.value.qb_link ? [{ label: 'QuickBooks', href: reconciliation.value.qb_link }] : []),
    ...(auth.can('customerReconciliations.delete')
        ? [{ label: 'Delete', danger: true, action: () => (showDelete.value = true) }]
        : []),
] : []));

const showDelete = ref(false);
const deleting = ref(false);

async function confirmDelete() {
    if (deleting.value) {
        return;
    }

    deleting.value = true;

    try {
        await api.delete(`/customers/reconciliations/${route.params.id}`);
        router.push(routeUrl('customerReconciliations.list'));
    } finally {
        deleting.value = false;
    }
}
</script>

<template>
    <AppLayout :title="reconciliation ? `Reconciliation #${reconciliation.id}` : 'Reconciliation'" fluid>
        <Loader v-if="! reconciliation" />

        <template v-else>
            <div class="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_3fr] mb-6">
                <CustomerDetails :customer="reconciliation.customer" />

                <FullWidthBox title="Reconciliation" :collapsible="false">
                    <template v-if="actions.length" #actions>
                        <DropdownMenu :items="actions" />
                    </template>

                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <tbody>
                        <tr>
                            <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">ID</th>
                            <td class="border border-gray-300 px-2 py-2">{{ reconciliation.id }}</td>
                        </tr>
                        <tr>
                            <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Reference</th>
                            <td class="border border-gray-300 px-2 py-2">{{ reconciliation.reference }}</td>
                        </tr>
                        <tr>
                            <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Date</th>
                            <td class="border border-gray-300 px-2 py-2">{{ reconciliation.on_date }}</td>
                        </tr>
                        <tr>
                            <th class="w-40 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">Created by</th>
                            <td class="border border-gray-300 px-2 py-2">
                                {{ reconciliation.user.name }}
                                <br/>
                                {{ reconciliation.created_at }}
                            </td>
                        </tr>
                        <tr>
                            <td colspan="2" class="border border-gray-300 px-2 py-2">
                                <p class="font-bold text-gray-600 pb-2">Notes: </p>
                                {{ reconciliation.notes }}
                            </td>
                        </tr>
                        </tbody>
                    </table>
                </FullWidthBox>
            </div>

            <FullWidthBox title="Linked transactions" :collapsible="false">
                <CustomerTransactionLinks
                    :links="reconciliation.links ?? []"
                    :total="reconciliation.links_amount ?? 0"
                    @unlink="toUnlink = $event"
                />
            </FullWidthBox>
        </template>

        <ConfirmDialog
            :show="showDelete"
            title="Delete reconciliation?"
            :message="reconciliation ? `Reconciliation #${reconciliation.id} will be deleted and every linked transaction reversed, restoring the balances they adjusted. This cannot be undone.` : ''"
            confirm-label="Yes, delete"
            confirm-variant="danger"
            :processing="deleting"
            @confirm="confirmDelete"
            @cancel="showDelete = false"
        />

        <ConfirmDialog
            :show="Boolean(toUnlink)"
            title="Unlink transaction?"
            :message="unlinkMessage"
            confirm-label="Yes, unlink"
            confirm-variant="danger"
            :processing="unlinking"
            @confirm="confirmUnlink"
            @cancel="toUnlink = null"
        />
    </AppLayout>
</template>
