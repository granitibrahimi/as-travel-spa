<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import api from '../../../helpers/api.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import NiceCheckbox from '../../../components/Form/NiceCheckbox.vue';
import Loader from '../../../components/Loader.vue';

const route = useRoute();
const id = route.params.id;

const role = ref(null);
const groups = ref([]);
const selected = ref(new Set());
const loading = ref(true);
const processing = ref(false);
const saved = ref(false);
const q = ref('');

onMounted(async () => {
    try {
        const { data } = await api.get(`/roles/${id}/permissions`);
        role.value = data.role;
        groups.value = data.groups;
        selected.value = new Set(data.assigned);
    } finally {
        loading.value = false;
    }
});

// Client-side filter; hides non-matching permissions and empty groups. Filtering
// never changes the selection — only what's visible (and what "select all" spans).
const filteredGroups = computed(() => {
    const term = q.value.trim().toLowerCase();

    if (!term) {
        return groups.value;
    }

    return groups.value
        .map((group) => ({
            ...group,
            permissions: group.permissions.filter((permission) =>
                `${permission.key} ${permission.description ?? ''}`.toLowerCase().includes(term)),
        }))
        .filter((group) => group.permissions.length > 0);
});

function toggle(permissionId) {
    const next = new Set(selected.value);

    if (next.has(permissionId)) {
        next.delete(permissionId);
    } else {
        next.add(permissionId);
    }

    selected.value = next;
}

function toggleGroup(group, checked) {
    const next = new Set(selected.value);

    group.permissions.forEach((permission) => {
        if (checked) {
            next.add(permission.id);
        } else {
            next.delete(permission.id);
        }
    });

    selected.value = next;
}

function groupAllChecked(group) {
    return group.permissions.length > 0 && group.permissions.every((permission) => selected.value.has(permission.id));
}

async function save() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    saved.value = false;

    try {
        await api.post(`/roles/${id}/permissions`, { permissions: Array.from(selected.value) });
        saved.value = true;
    } finally {
        processing.value = false;
    }
}
</script>

<template>
    <AppLayout :title="role ? `Permissions — ${role.name}` : 'Permissions'" fluid>
        <Loader v-if="loading" />
        <template v-else>
            <div class="space-y-6">
                <div class="flex flex-wrap items-end gap-3 md:max-w-sm">
                    <div class="w-full">
                        <InputText v-model="q" label="Search permissions" placeholder="Key or description…" />
                    </div>
                </div>

                <p v-if="saved" class="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                    Permissions updated successfully.
                </p>

                <p v-if="filteredGroups.length === 0" class="text-sm text-gray-400">No permissions match “{{ q }}”.</p>

                <FullWidthBox
                    v-for="group in filteredGroups"
                    :key="group.group"
                    :title="group.group"
                    :collapsible="false"
                >
                    <template #actions>
                        <NiceCheckbox
                            :model-value="groupAllChecked(group)"
                            label="Select all"
                            @update:model-value="(checked) => toggleGroup(group, checked)"
                        />
                    </template>

                    <div class="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                        <div
                            v-for="permission in group.permissions"
                            :key="permission.id"
                            class="flex items-start gap-2 rounded border border-gray-100 px-2 py-1.5 hover:bg-gray-50"
                        >
                            <NiceCheckbox
                                :model-value="selected.has(permission.id)"
                                @update:model-value="() => toggle(permission.id)"
                            />
                            <span class="min-w-0">
                                <span class="block truncate text-sm text-gray-800">{{ permission.description || permission.key }}</span>
                                <span class="block truncate font-mono text-xs text-gray-400">{{ permission.key }}</span>
                            </span>
                        </div>
                    </div>
                </FullWidthBox>
            </div>

            <footer class="mt-6 flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink to="/roles" class="inline-block rounded border border-gray-300 bg-white px-4 py-1.5 text-sm hover:bg-gray-50">
                    Back
                </RouterLink>
                <Button type="button" variant="primary" :disabled="processing" @click="save">
                    {{ processing ? 'Saving…' : 'Save permissions' }}
                </Button>
            </footer>
        </template>
    </AppLayout>
</template>
