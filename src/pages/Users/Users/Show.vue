<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import api from '../../../helpers/api.js';
import { routeUrl } from '../../../helpers/route.js';
import { castResource } from '../../../types/responses.js';
import { useAuthStore } from '../../../stores/auth.js';
import { useNotificationsStore } from '../../../stores/notifications.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import DropdownMenu from '../../../components/DropdownMenu.vue';
import Loader from '../../../components/Loader.vue';

const auth = useAuthStore();
const notifications = useNotificationsStore();
const route = useRoute();
const id = route.params.id;

const user = ref(null);
const recalculating = ref(false);
const toggling = ref(false);

const thisYear = new Date().getFullYear();
const lastYear = thisYear - 1;

const userRows = computed(() => {
    const u = user.value;
    if (! u) {
        return [];
    }

    return [
        ['ID', u.id],
        ['First name', u.first_name],
        ['Last name', u.last_name],
        ['Phone number', u.phone_number],
        ['Email', u.email],
        ['Role', u.role],
        ['CashOnHand Account', u.cash_account ?? u.cash_account_id],
        ['Enabled', u.disabled ? 'Disabled' : 'Enabled'],
    ];
});

const vacationRows = computed(() => {
    const b = user.value?.balance;
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

async function fetchUser() {
    const { data } = await api.get(`/users/users/${id}`);
    user.value = castResource(data);
}

onMounted(fetchUser);

// Enable / disable is a single toggle endpoint on the platform
// (POST .../toggle-disabled); the label just reflects the current state.
async function toggleDisabled() {
    if (toggling.value) {
        return;
    }

    toggling.value = true;
    const wasDisabled = user.value.disabled;

    try {
        await api.post(`/users/users/${id}/toggle-disabled`);
        await fetchUser();
        notifications.push({ type: 'success', message: wasDisabled ? 'User enabled.' : 'User disabled.' });
    } catch (e) {
        notifications.push({ type: 'error', message: 'Could not update the user.' });
    } finally {
        toggling.value = false;
    }
}

const userActions = computed(() => {
    const u = user.value;
    if (! u) {
        return [];
    }

    return [
        ...(auth.can('users.edit')
            ? [{ label: 'Edit', to: routeUrl('users.edit', u.id) }]
            : []),
        ...(auth.can('users.toggleDisabled')
            ? [{ label: u.disabled ? 'Enable' : 'Disable', action: toggleDisabled, danger: ! u.disabled }]
            : []),
    ];
});

async function recalculate() {
    if (recalculating.value) {
        return;
    }

    recalculating.value = true;

    try {
        await api.post(`/users/vacations/${id}/recalculate`);
        await fetchUser();
        notifications.push({ type: 'success', message: 'Vacation days recalculated.' });
    } catch (e) {
        notifications.push({ type: 'error', message: 'Could not recalculate vacation days.' });
    } finally {
        recalculating.value = false;
    }
}
</script>

<template>
    <AppLayout :title="`User #${id}`" fluid>
        <Loader v-if="! user" />

        <div v-else class="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <FullWidthBox title="User details" :collapsible="false">
                <template #actions>
                    <RouterLink :to="routeUrl('users.list')" class="inline-block rounded border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50">
                        Back to list
                    </RouterLink>
                    <DropdownMenu v-if="userActions.length" :items="userActions" />
                </template>

                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <tbody>
                        <tr v-for="[label, value] in userRows" :key="label">
                            <th class="w-48 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">{{ label }}</th>
                            <td
                                class="border border-gray-300 px-2 py-2 break-all"
                                :class="label === 'Enabled' ? (user.disabled ? 'font-medium text-red-600' : 'font-medium text-green-600') : ''"
                            >{{ value ?? '-' }}</td>
                        </tr>
                    </tbody>
                </table>
            </FullWidthBox>

            <FullWidthBox title="Vacation details" :collapsible="false">
                <table v-if="vacationRows.length" class="w-full border-collapse border border-gray-300 text-sm">
                    <tbody>
                        <tr v-for="[label, value] in vacationRows" :key="label">
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
                        {{ recalculating ? 'Recalculating…' : 'RE-Calculate all vacations' }}
                    </Button>
                </div>
            </FullWidthBox>
        </div>
    </AppLayout>
</template>
