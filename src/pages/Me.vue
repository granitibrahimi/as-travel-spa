<script setup>
import { computed, onMounted, ref } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useFormOptionsStore, CATEGORIES } from '../stores/formOptions';
import AppLayout from '../layouts/AppLayout.vue';
import FullWidthBox from '../components/FullWidthBox.vue';
import DataTree from '../components/DataTree.vue';
import InputText from '../components/Form/InputText.vue';
import Loader from '../components/Loader.vue';

const auth = useAuthStore();
const formOptions = useFormOptionsStore();

// Render the in-memory /me snapshot held by the auth store — no extra request.
// The store fetches it on login and on app boot; Refresh below re-fetches it.
const me = computed(() => auth.user);

// Permissions get their own searchable list; everything else renders as a tree.
const permissions = computed(() => {
    const value = me.value?.permissions;

    return Array.isArray(value) ? value : [];
});

// The rest of the snapshot, minus permissions (shown separately below).
const rest = computed(() => {
    if (!me.value) {
        return null;
    }

    const { permissions: _omit, ...other } = me.value;

    return other;
});

const permissionSearch = ref('');

const filteredPermissions = computed(() => {
    const term = permissionSearch.value.trim().toLowerCase();

    if (!term) {
        return permissions.value;
    }

    return permissions.value.filter((permission) => String(permission).toLowerCase().includes(term));
});

// Manually refresh the shared snapshot from the API (re-runs the same /me call
// the store uses on boot), so this page and the rest of the app stay in sync.
const refreshing = ref(false);

async function refresh() {
    refreshing.value = true;

    try {
        await auth.bootstrap();
    } finally {
        refreshing.value = false;
    }
}

// Form options are cached in localStorage and mirrored into the store. Load the
// cached snapshot (no network) so we can show exactly what forms would read.
onMounted(() => formOptions.hydrate());

// One row per configured category, with whatever options are currently cached.
const formOptionCategories = computed(() =>
    CATEGORIES.map((category) => {
        const options = formOptions.options(category.key);

        return { ...category, options, count: options.length };
    }),
);

const totalFormOptions = computed(() =>
    formOptionCategories.value.reduce((sum, category) => sum + category.count, 0),
);
</script>

<template>
    <AppLayout title="/me" fluid>
        <FullWidthBox title="/me" :collapsible="false">
            <template #actions>
                <button
                    type="button"
                    class="rounded border border-gray-300 bg-white px-3 py-1 text-xs hover:bg-gray-50 disabled:opacity-60"
                    :disabled="refreshing"
                    @click="refresh"
                >
                    {{ refreshing ? 'Refreshing…' : 'Refresh' }}
                </button>
            </template>

            <Loader v-if="refreshing" />
            <p v-else-if="!me" class="py-6 text-center text-sm text-gray-400">No user snapshot loaded.</p>
            <DataTree v-else :data="rest" />
        </FullWidthBox>

        <FullWidthBox v-if="me && !refreshing" :collapsible="false" class="mt-4">
            <template #title>
                <span class="flex items-center gap-2">
                    Permissions
                    <span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{{ permissions.length }}</span>
                </span>
            </template>

            <div class="mb-3 w-full sm:w-72">
                <InputText v-model="permissionSearch" label="Search permissions" placeholder="e.g. customers.create" />
            </div>

            <p v-if="permissions.length === 0" class="py-4 text-center text-sm text-gray-400">
                No permissions.
            </p>
            <p v-else-if="filteredPermissions.length === 0" class="py-4 text-center text-sm text-gray-400">
                No permissions match “{{ permissionSearch }}”.
            </p>
            <ul v-else class="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
                <li
                    v-for="permission in filteredPermissions"
                    :key="permission"
                    class="rounded border border-gray-200 bg-gray-50 px-2 py-1 font-mono text-xs text-gray-700"
                >
                    {{ permission }}
                </li>
            </ul>
        </FullWidthBox>

        <FullWidthBox :collapsible="false" class="mt-4">
            <template #title>
                <span class="flex items-center gap-2">
                    Form Options (cache)
                    <span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{{ totalFormOptions }}</span>
                </span>
            </template>

            <p v-if="totalFormOptions === 0" class="py-4 text-center text-sm text-gray-400">
                No form options cached yet.
            </p>
            <div v-else class="space-y-3">
                <div
                    v-for="category in formOptionCategories"
                    :key="category.key"
                    class="rounded border border-gray-200"
                >
                    <div class="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2">
                        <span class="text-sm font-medium text-gray-700">{{ category.label }}</span>
                        <span class="font-mono text-xs text-gray-400">{{ category.key }}</span>
                        <span class="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{{ category.count }}</span>
                    </div>
                    <div class="px-3 py-2">
                        <p v-if="category.count === 0" class="text-sm text-gray-400">Empty.</p>
                        <DataTree v-else :data="category.options" />
                    </div>
                </div>
            </div>
        </FullWidthBox>

        <FullWidthBox v-if="me && !refreshing" title="Raw JSON" :default-collapsed="true" class="mt-4">
            <pre class="overflow-x-auto rounded bg-gray-900 p-4 text-xs text-gray-100">{{ JSON.stringify(me, null, 2) }}</pre>
        </FullWidthBox>
    </AppLayout>
</template>