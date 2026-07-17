<script setup>
import {onMounted, ref} from 'vue';
import Loader from '../../components/Loader.vue';
import StatCard from '../../components/StatCard.vue';
import api from '../../helpers/api';
import {money} from '../../helpers/money';
import {useAuthStore} from '../../stores/auth';

const auth = useAuthStore();
const loading = ref(true);
const error = ref(null);
const metrics = ref(null);

onMounted(async () => {
    loading.value = true;
    error.value = null;

    try {
        const {data} = await api.get('/dashboards/crm');
        metrics.value = data.data;
    } catch {
        error.value = 'Could not load your dashboard right now.';
    } finally {
        loading.value = false;
    }
});
</script>

<template>
    <div class="space-y-6">
        <div>
            <h1 class="text-2xl font-bold">Hi, {{ auth.user?.name }}</h1>
            <p class="text-sm text-gray-500">Here is your activity for today.</p>
        </div>

        <Loader v-if="loading" message="Loading your dashboard"/>

        <p v-else-if="error" class="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {{ error }}
        </p>

        <div v-else-if="metrics" class="space-y-4">
            <StatCard
                accent
                label="Cash on hand to hand over"
                :value="money(metrics.cash_on_hand)"
                sub="Undeposited cash you have collected"
            />

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard
                    label="Invoices today"
                    :value="metrics.invoices.count"
                    :sub="money(metrics.invoices.amount)"
                />
                <StatCard
                    label="Credit notes today"
                    :value="metrics.credit_notes.count"
                    :sub="money(metrics.credit_notes.amount)"
                />
                <StatCard
                    label="Payments today"
                    :value="metrics.payments.count"
                    :sub="money(metrics.payments.amount)"
                />
                <StatCard
                    label="Offers prepared today"
                    :value="metrics.offers_prepared.count"
                />
                <StatCard
                    label="Tasks worked on today"
                    :value="metrics.tasks_worked_on.count"
                />
            </div>
        </div>
    </div>
</template>
