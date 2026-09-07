<script setup>
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import api from '../helpers/api.js';
import { routeUrl } from '../helpers/route.js';
import { useAuthStore } from '../stores/auth.js';
import { useNotificationsStore } from '../stores/notifications.js';
import FullWidthBox from './FullWidthBox.vue';
import Button from './Button.vue';

/**
 * Vacation balance table, shared by the user show page and the vacation request
 * edit page so both render the balance the same way. Expects a user object
 * shaped by ShowUserAction — it reads `user.id` and `user.balance`
 * ({ leftover_days, this_year_days, days_used, days_left }).
 *
 * Emits `recalculated` after a successful "RE-Calculate all vacation Balances"
 * so the parent can refetch the user.
 */
const props = defineProps({
    user: { type: Object, required: true },
});

const emit = defineEmits(['recalculated']);

const auth = useAuthStore();
const notifications = useNotificationsStore();

const thisYear = new Date().getFullYear();
const lastYear = thisYear - 1;

const rows = computed(() => {
    const b = props.user?.balance;
    if (! b) {
        return [];
    }

    return [
        [`Leftover days from ${lastYear}`, b.leftover_days],
        [`Days for this year ${thisYear}`, b.this_year_days],
        ['Days used', b.days_used],
        ['Days left', b.days_left],
    ];
});

const recalculating = ref(false);

async function recalculate() {
    if (recalculating.value) {
        return;
    }

    recalculating.value = true;

    try {
        await api.post(`/users/vacations/${props.user.id}/recalculate`);
        notifications.push({ type: 'success', message: 'Vacation days recalculated.' });
        emit('recalculated');
    } catch (e) {
        notifications.push({ type: 'error', message: 'Could not recalculate vacation days.' });
    } finally {
        recalculating.value = false;
    }
}
</script>

<template>
    <FullWidthBox title="Vacation details" :collapsible="false">
        <table v-if="rows.length" class="w-full border-collapse border border-gray-300 text-sm">
            <tbody>
                <tr v-for="[label, value] in rows" :key="label">
                    <th class="border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">{{ label }}</th>
                    <td class="w-24 border border-gray-300 px-2 py-2 tabular-nums">{{ value ?? '-' }}</td>
                </tr>
            </tbody>
        </table>
        <p v-else class="text-sm text-gray-400">No vacation balance for this user.</p>

        <div class="mt-4 flex flex-wrap gap-2">
            <RouterLink
                v-if="auth.can('vacations.showRequests')"
                :to="routeUrl('vacations.requests', { user: user.id })"
                class="inline-flex items-center rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
                View all vacation details
            </RouterLink>
            <Button
                v-if="auth.can('vacations.reCalculate')"
                size="sm"
                :loading="recalculating"
                :disabled="recalculating"
                @click="recalculate"
            >
                {{ recalculating ? 'Recalculating…' : 'RE-Calculate all vacation Balances' }}
            </Button>
        </div>
    </FullWidthBox>
</template>
