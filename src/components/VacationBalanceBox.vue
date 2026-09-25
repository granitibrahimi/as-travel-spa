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
 * ({ leftover_days, this_year_days, accumulated_days, accrual: { months,
 * days_per_month, manually_adjusted }, days_used, days_left }).
 *
 * This year's allowance accrues monthly: every month that has ended adds
 * allowance / 12 (18 / 12 = 1.5), rounded to whole days.
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

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const number = (value) => String(Math.round(value * 100) / 100);

// "8 months × 1.5 = 12 (January – August)", or why the full allowance applies.
function accrualNote(b) {
    const accrual = b.accrual;

    if (! accrual) {
        return '';
    }

    if (accrual.months === null) {
        return accrual.manually_adjusted ? 'Set by hand — the full allowance applies.' : 'Full allowance for the year.';
    }

    if (accrual.months === 0) {
        return `No month has ended yet — ${number(accrual.days_per_month)} days are added at the end of each month.`;
    }

    const exact = accrual.days_per_month * accrual.months;
    const rounded = Math.abs(exact - b.accumulated_days) > 0.001 ? `, rounded to ${b.accumulated_days}` : '';
    const period = accrual.months === 1 ? monthNames[0] : `${monthNames[0]} – ${monthNames[accrual.months - 1]}`;

    return `${accrual.months} ${accrual.months === 1 ? 'month' : 'months'} × ${number(accrual.days_per_month)} = ${number(exact)}${rounded} (${period})`;
}

const rows = computed(() => {
    const b = props.user?.balance;
    if (! b) {
        return [];
    }

    return [
        [`Leftover days from ${lastYear}`, b.leftover_days],
        [`Days for this year ${thisYear}`, b.this_year_days],
        [`Accumulated days in ${thisYear} up to date`, b.accumulated_days, accrualNote(b)],
        ['Days used', b.days_used],
        ['Days left', b.days_left, `Leftover + accumulated − used`],
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
                <tr v-for="[label, value, note] in rows" :key="label">
                    <th class="border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">
                        {{ label }}
                        <span v-if="note" class="block text-xs font-normal text-gray-500">{{ note }}</span>
                    </th>
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
