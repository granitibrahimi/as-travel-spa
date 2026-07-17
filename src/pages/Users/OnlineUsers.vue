<script setup>
import { computed } from 'vue';
import { useAuthStore } from '../../stores/auth.js';
import { usePresenceStore } from '../../stores/presence.js';
import { workspaces } from '../../config/workspaces.js';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';

const auth = useAuthStore();
const presence = usePresenceStore();

const canView = computed(() => auth.can('onlineUsers.list'));

// Build a path -> friendly label lookup from the navigation config once, so we
// can show "All Suppliers" instead of a raw "/suppliers".
const pageLabels = (() => {
    const map = { '/': 'Home' };

    workspaces.forEach((workspace) => {
        workspace.groups.forEach((group) => {
            // Groups may be separators ({ separator: true }) with no items.
            group.items?.forEach((item) => {
                map[item.to] = item.label;
            });
        });
    });

    return map;
})();

function pageLabel(url) {
    if (!url) {
        return null;
    }

    // Strip query/hash before matching against known routes.
    const path = url.split('?')[0].split('#')[0];

    return pageLabels[path] ?? null;
}

const users = computed(() => presence.users);
</script>

<template>
    <AppLayout title="Online Users" fluid>
        <FullWidthBox :collapsible="false">
            <template #title>
                <span class="flex items-center gap-2">
                    <span class="relative flex h-2.5 w-2.5">
                        <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                        <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
                    </span>
                    Online Users
                    <span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{{ presence.count }}</span>
                </span>
            </template>

            <p v-if="!canView" class="py-6 text-center text-sm text-gray-400">
                You don't have permission to view online users.
            </p>

            <div v-else-if="presence.status === 'error'" class="py-6 text-center text-sm">
                <p class="font-medium text-red-600">Couldn't connect to the real-time server.</p>
                <p class="mt-1 text-gray-400">
                    The presence channel authorization request was rejected (check the
                    <code class="font-mono">/broadcasting/auth</code> endpoint's CORS / auth config).
                </p>
            </div>

            <p v-else-if="presence.status !== 'joined'" class="py-6 text-center text-sm text-gray-400">
                Connecting to the real-time server…
            </p>

            <div class="overflow-x-auto">
                <table class="w-full min-w-[640px] table-fixed border-collapse border border-gray-300 text-sm">
                    <colgroup>
                        <col style="width: 48px;">
                        <col style="width: 30%;">
                        <col style="width: 25%;">
                        <col>
                    </colgroup>
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-3 py-2"></th>
                            <th class="border border-gray-300 px-3 py-2">User</th>
                            <th class="border border-gray-300 px-3 py-2">Current page</th>
                            <th class="border border-gray-300 px-3 py-2 font-mono">URL</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="users.length === 0">
                            <td colspan="4" class="border border-gray-300 px-3 py-4 text-center text-gray-400">
                                No users online.
                            </td>
                        </tr>
                        <tr v-for="user in users" :key="user.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-3 py-2 text-center align-top">
                                <span class="inline-block h-2.5 w-2.5 rounded-full bg-green-500" title="Online" />
                            </td>
                            <td class="border border-gray-300 px-3 py-2 align-top font-medium">
                                <span class="truncate">{{ user.name }}</span>
                                <span v-if="user.self" class="ml-1 text-xs font-normal text-gray-400">(you)</span>
                            </td>
                            <td class="border border-gray-300 px-3 py-2 align-top">
                                <span v-if="pageLabel(user.url)">{{ pageLabel(user.url) }}</span>
                                <span v-else class="text-gray-400">—</span>
                            </td>
                            <td class="border border-gray-300 px-3 py-2 align-top font-mono text-xs text-gray-600 break-all">
                                {{ user.url ?? '—' }}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </FullWidthBox>
    </AppLayout>
</template>
