<script setup>
import {computed, ref} from 'vue';
import {useAuthStore} from '../stores/auth';
import {useFormOptionsStore} from '../stores/formOptions';
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

    const {permissions: _omit, ...other} = me.value;

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

// One row per cached category (from the store's last sync), with its options.
const formOptionCategories = computed(() =>
    formOptions.categoryList.map((category) => {
        const options = formOptions.options(category.key);

        return {...category, options, count: options.length};
    }),
);

const totalFormOptions = computed(() =>
    formOptionCategories.value.reduce((sum, category) => sum + category.count, 0),
);

// Each category list is collapsed by default; track which keys are expanded.
const expandedCategories = ref({});

function toggleCategory(key) {
    expandedCategories.value = {
        ...expandedCategories.value,
        [key]: !expandedCategories.value[key],
    };
}
</script>

<template>
    <AppLayout title="/me" fluid>
        <FullWidthBox title="/me" :default-collapsed="true">
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

            <Loader v-if="refreshing"/>
            <p v-else-if="!me" class="py-6 text-center text-sm text-gray-400">No user snapshot loaded.</p>
            <DataTree v-else :data="rest"/>
        </FullWidthBox>

        <FullWidthBox v-if="me && !refreshing" :default-collapsed="true" class="mt-4">
            <template #title>
                <span class="flex items-center gap-2">
                    Permissions
                    <span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{{
                            permissions.length
                        }}</span>
                </span>
            </template>

            <div class="mb-3 w-full sm:w-72">
                <InputText v-model="permissionSearch" label="Search permissions" placeholder="e.g. customers.create"/>
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

        <FullWidthBox :default-collapsed="true" class="mt-4">
            <template #title>
                <span class="flex items-center gap-2">
                    Form Options (cache)
                    <span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{{
                            totalFormOptions
                        }}</span>
                </span>
            </template>

            <p v-if="totalFormOptions === 0" class="py-4 text-center text-sm text-gray-400">
                No form options cached yet.
            </p>
            <template v-else>
                <div class="space-y-3">
                    <div
                        v-for="category in formOptionCategories"
                        :key="category.key"
                        class="rounded border border-gray-200"
                    >
                        <div
                            class="flex cursor-pointer items-center gap-2 bg-gray-50 px-3 py-2"
                            :class="{ 'border-b border-gray-100': expandedCategories[category.key] }"
                            @click="toggleCategory(category.key)"
                        >
                            <button
                                type="button"
                                class="text-gray-400 transition-transform hover:text-gray-600"
                                :class="expandedCategories[category.key] ? 'rotate-0' : '-rotate-90'"
                                @click.stop="toggleCategory(category.key)"
                            >
                                <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"
                                     viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
                                </svg>
                            </button>
                            <span class="text-sm font-medium text-gray-700">{{ category.label }}</span>
                            <span class="font-mono text-xs text-gray-400">{{ category.key }}</span>
                            <span
                                class="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{{
                                    category.count
                                }}</span>
                        </div>
                        <div v-show="expandedCategories[category.key]" class="px-3 py-2">
                            <p v-if="category.count === 0" class="text-sm text-gray-400">Empty.</p>
                            <DataTree v-else :data="category.options"/>
                        </div>
                    </div>
                </div>
            </template>
        </FullWidthBox>

        <FullWidthBox v-if="me && !refreshing" title="Raw JSON" :default-collapsed="true" class="mt-4">
            <pre class="overflow-x-auto rounded bg-gray-900 p-4 text-xs text-gray-100">{{
                    JSON.stringify(me, null, 2)
                }}</pre>
        </FullWidthBox>
    </AppLayout>
</template>
