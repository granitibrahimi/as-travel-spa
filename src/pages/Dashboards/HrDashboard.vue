<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import StatCard from '../../components/StatCard.vue';
import Loader from '../../components/Loader.vue';
import api from '../../helpers/api';
import { routeUrl } from '../../helpers/route.js';

const loading = ref(true);
const error = ref(null);
const metrics = ref(null);

onMounted(async () => {
    loading.value = true;
    error.value = null;

    try {
        const { data } = await api.get('/dashboards/hr');
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
        <Loader v-if="loading" message="Loading your dashboard" />

        <p v-else-if="error" class="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {{ error }}
        </p>

        <div v-else-if="metrics" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <RouterLink :to="routeUrl('users.list')" class="block h-full transition-shadow hover:shadow-md">
                <StatCard
                    class="h-full"
                    label="Active users"
                    :value="metrics.users.active"
                    :sub="`of ${metrics.users.total} total`"
                    animate
                />
            </RouterLink>

            <RouterLink :to="routeUrl('vacations.list')" class="block h-full transition-shadow hover:shadow-md">
                <StatCard
                    class="h-full"
                    label="Open vacation requests"
                    :value="metrics.vacation_requests.open"
                    :sub="`of ${metrics.vacation_requests.total} total`"
                    animate
                />
            </RouterLink>

            <RouterLink :to="routeUrl('vacations.report')" class="block h-full transition-shadow hover:shadow-md">
                <StatCard
                    class="h-full"
                    :label="`Paid vacation days ${metrics.vacation_days_this_year.year}`"
                    :value="metrics.vacation_days_this_year.paid_vacation"
                    :sub="`+ ${metrics.vacation_days_this_year.other} other (sick ${metrics.vacation_days_this_year.sick_leave} · special ${metrics.vacation_days_this_year.special_leave})`"
                    animate
                />
            </RouterLink>

            <RouterLink :to="routeUrl('users.activityLogs')" class="block h-full transition-shadow hover:shadow-md">
                <StatCard
                    class="h-full"
                    label="Activity log entries this year"
                    :value="metrics.activity_log_entries.this_year"
                    :sub="`${metrics.activity_log_entries.total} all-time`"
                    animate
                />
            </RouterLink>
        </div>
    </div>
</template>
