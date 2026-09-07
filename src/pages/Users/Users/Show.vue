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
        </div>

        <AddVacationModal
            :show="showAddVacation"
            :user-id="user?.id"
            :user-name="user?.name ?? ''"
            @close="showAddVacation = false"
            @saved="onVacationSaved"
        />
    </AppLayout>
</template>
