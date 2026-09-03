<script setup>
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { routeUrl } from '../helpers/route.js';
import { useAuthStore } from '../stores/auth.js';
import FullWidthBox from './FullWidthBox.vue';

/**
 * User details table, shared by the user show page and any page that embeds
 * user details (e.g. the vacation request page). Expects a user object shaped
 * by ShowUserAction (id, name, first_name, last_name, phone_number, email,
 * role, disabled, cash_account, …).
 *
 * By default it renders inside its own FullWidthBox (titled "User") with a
 * "View User" button (top-right) linking to the user's show page.
 * - Pass `:boxed="false"` to render just the bare table (when embedding inside
 *   another box, e.g. the user's own show page which owns the box actions).
 * - Pass `:show-view-link="false"` to hide the button (e.g. on the user's own
 *   show page, where it would link to itself).
 */
const props = defineProps({
    user: { type: Object, required: true },
    boxed: { type: Boolean, default: true },
    title: { type: String, default: 'User' },
    showViewLink: { type: Boolean, default: true },
});

const auth = useAuthStore();

const rows = computed(() => [
    ['ID', props.user.id],
    ['First name', props.user.first_name],
    ['Last name', props.user.last_name],
    ['Username', props.user.username],
    ['Phone number', props.user.phone_number],
    ['Email', props.user.email],
    ['Role', props.user.role],
    ['CashOnHand Account', props.user.cash_account ?? props.user.cash_account_id],
    ['Enabled', props.user.disabled ? 'Disabled' : 'Enabled'],
]);

const canViewUser = computed(() =>
    props.showViewLink && props.user?.id != null && auth.can('users.show'),
);
</script>

<template>
    <FullWidthBox v-if="boxed" :title="title" :collapsible="false">
        <template v-if="canViewUser" #actions>
            <RouterLink
                :to="routeUrl('users.show', user.id)"
                class="inline-block rounded border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50"
            >
                View User
            </RouterLink>
        </template>

        <table class="w-full border-collapse border border-gray-300 text-sm">
            <tbody>
                <tr v-for="[label, value] in rows" :key="label">
                    <th class="w-48 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">{{ label }}</th>
                    <td
                        class="border border-gray-300 px-2 py-2 break-all"
                        :class="label === 'Enabled' ? (user.disabled ? 'font-medium text-red-600' : 'font-medium text-green-600') : ''"
                    >{{ value ?? '-' }}</td>
                </tr>
            </tbody>
        </table>
    </FullWidthBox>

    <table v-else class="w-full border-collapse border border-gray-300 text-sm">
        <tbody>
            <tr v-for="[label, value] in rows" :key="label">
                <th class="w-48 border border-gray-300 bg-gray-50 px-2 py-2 text-left font-medium text-gray-600">{{ label }}</th>
                <td
                    class="border border-gray-300 px-2 py-2 break-all"
                    :class="label === 'Enabled' ? (user.disabled ? 'font-medium text-red-600' : 'font-medium text-green-600') : ''"
                >{{ value ?? '-' }}</td>
            </tr>
        </tbody>
    </table>
</template>
