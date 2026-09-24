<script setup>
import { computed, onMounted, ref } from 'vue';
import api from '../../../helpers/api.js';
import { useFormOptionsStore, toOptions } from '../../../stores/formOptions.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Select from '../../../components/Form/Select.vue';
import Loader from '../../../components/Loader.vue';

const formOptions = useFormOptionsStore();

const types = ref(null);
const loading = ref(false);
const q = ref('');
const classification = ref('');
const onlyUsed = ref(false);

// Classification options come from the shared form-options store.
const classifications = computed(() => toOptions(formOptions.accountClassifications));

// A row's `classification` is serialized as { id, name }; the option value
// may be the enum's int or its label — match tolerantly against both.
function matchesClassification(type) {
    if (! classification.value) {
        return true;
    }

    const selected = classifications.value.find((option) => String(option.value) === String(classification.value));
    const rowId = String(type.classification?.id ?? '');
    const rowName = String(type.classification?.name ?? '').toLowerCase();

    return rowId === String(classification.value)
        || rowName === String(classification.value).toLowerCase()
        || (selected && rowName === String(selected.label).toLowerCase());
}

async function fetchTypes() {
    loading.value = true;

    try {
        const { data } = await api.get('/finance/accounts/types');
        types.value = data.data;
    } finally {
        loading.value = false;
    }
}

onMounted(() => fetchTypes());

// The API returns types in presentation order (sort_order, then id).
const bySortOrder = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id;

// Main types (no parent, or a parent missing from the list) with their
// subtypes nested under `children`, both in presentation order. `total` is the
// number of accounts using the type or any of its subtypes.
const tree = computed(() => {
    const list = types.value ?? [];
    const ids = new Set(list.map((type) => type.id));
    const childrenOf = new Map();

    for (const type of list) {
        if (type.parent_id && ids.has(type.parent_id)) {
            childrenOf.set(type.parent_id, [...(childrenOf.get(type.parent_id) ?? []), type]);
        }
    }

    return list
        .filter((type) => ! type.parent_id || ! ids.has(type.parent_id))
        .map((root) => {
            const children = (childrenOf.get(root.id) ?? []).slice().sort(bySortOrder);

            return {
                ...root,
                children,
                total: root.accounts_count + children.reduce((sum, child) => sum + child.accounts_count, 0),
            };
        })
        .sort(bySortOrder);
});

// A parent stays visible when it or any of its subtypes matches; when the
// parent itself matches the search, all its subtypes are shown.
const filtered = computed(() => {
    const term = q.value.trim().toLowerCase();
    const matchesTerm = (type) => ! term || `${type.name} ${type.classification?.name ?? ''} ${type.note ?? ''}`.toLowerCase().includes(term);
    const isUsed = (type) => ! onlyUsed.value || type.accounts_count > 0;

    return tree.value
        .filter(matchesClassification)
        .map((root) => ({
            ...root,
            children: root.children.filter((child) => (matchesTerm(root) || matchesTerm(child)) && isUsed(child)),
        }))
        .filter((root) => (matchesTerm(root) || root.children.length > 0)
            && (! onlyUsed.value || root.total > 0));
});

const shownCount = computed(() => filtered.value.reduce((sum, root) => sum + 1 + root.children.length, 0));
</script>

<template>
    <AppLayout title="Account types">
        <FullWidthBox title="Account types" :collapsible="false">
            <div class="mb-4 grid grid-cols-1 items-center gap-3 sm:grid-cols-3 md:max-w-3xl">
                <input v-model="q" type="text" placeholder="Name or classification…" class="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500">
                <Select v-model="classification" :options="classifications" placeholder="All classifications" />
                <label class="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input v-model="onlyUsed" type="checkbox" class="rounded border-gray-300 text-red-600 focus:ring-red-500">
                    Only types with accounts
                </label>
            </div>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 60px;">ID</th>
                            <th class="border border-gray-300 px-2 py-2">Name</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 90px;">FS note</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 140px;">Classification</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 260px;">If on the other side, report under</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 110px;">Accounts</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! types">
                            <td colspan="6" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="filtered.length === 0">
                            <td colspan="6" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No account types found.</td>
                        </tr>
                        <template v-for="root in (loading ? [] : filtered)" :key="root.id">
                            <tr class="bg-gray-50 hover:bg-gray-100">
                                <td class="border border-gray-300 px-2 py-2 text-center font-semibold">{{ root.id }}</td>
                                <td class="border border-gray-300 px-2 py-2 font-semibold">{{ root.name }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-center font-semibold">{{ root.note ?? '—' }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ root.classification?.name }}</td>
                                <td class="border border-gray-300 px-2 py-2" />
                                <td class="border border-gray-300 px-2 py-2 text-right font-semibold tabular-nums">{{ root.total }}</td>
                            </tr>
                            <tr v-for="child in root.children" :key="child.id" class="hover:bg-gray-50" :class="{ 'text-gray-400': child.accounts_count === 0 }">
                                <td class="border border-gray-300 px-2 py-2 text-center">{{ child.id }}</td>
                                <td class="border border-gray-300 py-2 pl-8 pr-2">
                                    <span class="mr-1 text-gray-300">└</span>{{ child.name }}
                                </td>
                                <td class="border border-gray-300 px-2 py-2" />
                                <td class="border border-gray-300 px-2 py-2" :class="{ 'text-gray-600': child.accounts_count > 0 }">{{ child.classification?.name }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-gray-600">
                                    <template v-if="child.opposite_type">
                                        {{ child.opposite_type.name }}<span v-if="child.split_by_party" class="text-gray-400"> (per customer / supplier)</span>
                                    </template>
                                </td>
                                <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ child.accounts_count }}</td>
                            </tr>
                        </template>
                    </tbody>
                </table>
            </div>

            <p class="mt-3 text-sm text-gray-500">Total: {{ shownCount }}</p>
        </FullWidthBox>
    </AppLayout>
</template>
