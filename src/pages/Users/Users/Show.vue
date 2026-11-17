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
import DropdownMenu from '../../../components/DropdownMenu.vue';
import UserDetails from '../../../components/UserDetails.vue';
import VacationBalanceBox from '../../../components/VacationBalanceBox.vue';
import Loader from '../../../components/Loader.vue';
import Button from '../../../components/Button.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import AddVacationModal from './AddVacationModal.vue';

const auth = useAuthStore();
const notifications = useNotificationsStore();
const route = useRoute();
const id = route.params.id;

const user = ref(null);
const toggling = ref(false);
const showAddVacation = ref(false);

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
        ...(auth.can('vacations.createOnBehalf')
            ? [{ label: 'Add vacation', action: () => (showAddVacation.value = true) }]
            : []),
    ];
});

// AS Travel app push notifications: removing every subscription makes the
// app drop its old one and ask the user to turn notifications on again.
const pushSubscriptions = computed(() => (Array.isArray(user.value?.push_subscriptions) ? user.value.push_subscriptions : []));
const confirmPushReset = ref(false);
const resettingPush = ref(false);

async function resetPush() {
    resettingPush.value = true;

    try {
        await api.delete(`/users/users/${id}/push-subscriptions`);
        confirmPushReset.value = false;
        await fetchUser();
        notifications.push({ type: 'success', message: 'Push subscriptions removed. The app will ask for notifications again.' });
    } catch (e) {
        notifications.push({ type: 'error', message: 'Could not remove the push subscriptions.' });
    } finally {
        resettingPush.value = false;
    }
}

function onVacationSaved() {
    notifications.push({ type: 'success', message: 'Vacation recorded.' });
    fetchUser();
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

                <UserDetails :user="user" :boxed="false" :show-view-link="false" />
            </FullWidthBox>

            <VacationBalanceBox :user="user" @recalculated="fetchUser" />

            <FullWidthBox title="App push notifications" :collapsible="false">
                <template #actions>
                    <Button
                        v-if="auth.can('users.edit') && pushSubscriptions.length"
                        size="sm"
                        variant="danger"
                        @click="confirmPushReset = true"
                    >Remove all</Button>
                </template>

                <p class="flex items-center gap-2 text-sm">
                    <span
                        class="inline-block h-2.5 w-2.5 rounded-full"
                        :class="pushSubscriptions.length ? 'bg-green-500' : 'bg-gray-300'"
                    />
                    <span v-if="pushSubscriptions.length" class="font-medium text-gray-900">
                        Subscribed on {{ pushSubscriptions.length }} {{ pushSubscriptions.length === 1 ? 'device' : 'devices' }}
                    </span>
                    <span v-else class="text-gray-500">Not subscribed. The AS Travel app asks for notifications the next time it opens.</span>
                </p>

                <ul v-if="pushSubscriptions.length" class="mt-3 divide-y divide-gray-100 rounded border border-gray-200">
                    <li v-for="s in pushSubscriptions" :key="s.id" class="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                        <span class="font-medium text-gray-800">{{ s.device }}</span>
                        <span class="text-xs text-gray-500">
                            Since {{ s.created_at }}<template v-if="s.last_used_at"> · last push {{ s.last_used_at }}</template>
                        </span>
                    </li>
                </ul>
            </FullWidthBox>
        </div>

        <ConfirmDialog
            :show="confirmPushReset"
            title="Remove all push subscriptions?"
            :message="`${user?.name ?? 'This user'} stops getting push notifications until they open the AS Travel app and allow them again. The app will ask them.`"
            confirm-label="Remove all"
            confirm-variant="danger"
            :processing="resettingPush"
            @confirm="resetPush"
            @cancel="confirmPushReset = false"
        />

        <AddVacationModal
            :show="showAddVacation"
            :user-id="user?.id"
            :user-name="user?.name ?? ''"
            @close="showAddVacation = false"
            @saved="onVacationSaved"
        />
    </AppLayout>
</template>
