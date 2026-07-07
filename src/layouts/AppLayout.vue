<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useLayoutStore } from '../stores/layout';
import { useNotificationsStore } from '../stores/notifications';
import { useFormOptionsStore } from '../stores/formOptions';
import { isDark, toggleTheme } from '../helpers/theme';

const props = defineProps({
    title: { type: String, default: '' },
    // When true the content spans the full screen width instead of a centered column.
    fluid: { type: Boolean, default: false },
});

const auth = useAuthStore();
const layout = useLayoutStore();
const notifications = useNotificationsStore();
const formOptions = useFormOptionsStore();
const router = useRouter();
const route = useRoute();

// Manual refresh of the shared form options (shows the sync screen).
function updateData() {
    userMenuOpen.value = false;
    formOptions.sync({ force: true });
}

const canSeeNotifications = computed(() => auth.can('userNotifications.list'));

// Resolve the active workspace once the user is known.
onMounted(() => {
    if (!layout.activeWorkspace) {
        layout.init();
    }

    if (canSeeNotifications.value) {
        notifications.fetchUnread();
    }
});

const containerClass = computed(() => (props.fluid ? 'w-full px-6' : 'max-w-6xl mx-auto px-6'));

const navigation = computed(() => layout.navigation);
const workspaces = computed(() => layout.accessibleWorkspaces);
const activeWorkspace = computed(() => layout.activeWorkspace);
const activeHome = computed(() => workspaces.value.find((w) => w.active)?.home ?? '/');
const hasSidebar = computed(() => navigation.value.length > 0);

watch(() => props.title, (title) => {
    document.title = title ? `${title} · AS Travel` : 'AS Travel';
}, { immediate: true });

function switchWorkspace(key) {
    userMenuOpen.value = false;

    if (workspaces.value.find((w) => w.key === key)?.active) {
        return;
    }

    layout.switchWorkspace(key);
    const home = workspaces.value.find((w) => w.key === key)?.home ?? '/';
    router.push(home);
}

// Collapsed by default on small screens; the header button toggles it.
const sidebarOpen = ref(false);

// Per-group collapse state, persisted across reloads. Keyed by group label.
const NAV_STORAGE_KEY = 'as.nav.collapsedGroups';
const collapsedGroups = ref({});

try {
    collapsedGroups.value = JSON.parse(window.localStorage.getItem(NAV_STORAGE_KEY)) ?? {};
} catch {
    collapsedGroups.value = {};
}

const isActive = (to) => route.path === to;
const groupHasActive = (group) => group.items.some((item) => isActive(item.to));

// The user's explicit toggle always wins. With no explicit choice, a group
// defaults to open when it holds the active page (so the current location isn't
// hidden) and collapsed otherwise.
const isGroupCollapsed = (group) => {
    const override = collapsedGroups.value[group.label];

    if (override !== undefined) {
        return Boolean(override);
    }

    return !groupHasActive(group);
};

function toggleGroup(label) {
    const group = navigation.value.find((item) => item.label === label);
    const next = group ? !isGroupCollapsed(group) : true;
    collapsedGroups.value = { ...collapsedGroups.value, [label]: next };

    try {
        window.localStorage.setItem(NAV_STORAGE_KEY, JSON.stringify(collapsedGroups.value));
    } catch {
        // Ignore storage failures (private mode, quota) — collapse still works for the session.
    }
}

// Header account dropdown: workspaces, account links and sign out.
const userMenu = computed(() => (auth.user ? { name: auth.user.name, items: layout.userMenuItems } : null));
const userMenuOpen = ref(false);

async function signOut() {
    userMenuOpen.value = false;
    await auth.logout();
    router.push({ name: 'login' });
}
</script>

<template>
    <div class="min-h-screen bg-gray-50 pt-14 text-gray-900">
        <header class="fixed inset-x-0 top-0 z-30 h-14 border-b border-gray-200 bg-white">
            <div class="flex h-full items-center px-6">
                <!-- Left: sidebar toggle + logo -->
                <div class="flex flex-1 items-center gap-3">
                    <button
                        v-if="hasSidebar"
                        type="button"
                        class="rounded border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50 lg:hidden"
                        aria-label="Toggle navigation"
                        @click="sidebarOpen = !sidebarOpen"
                    >
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <RouterLink :to="activeHome" class="flex items-baseline gap-1">
                        <span class="font-semibold text-red-600">AS Travel</span>
                        <span v-if="activeWorkspace" class="hidden text-xs font-medium uppercase text-gray-400 sm:inline">[{{ activeWorkspace }}]</span>
                    </RouterLink>
                </div>

                <!-- Center: dynamic page title -->
                <div class="flex flex-1 items-center justify-center">
                    <h1 v-if="title" class="truncate text-lg font-bold">{{ title }}</h1>
                </div>

                <!-- Right: user menu (workspaces + account) -->
                <div class="flex flex-1 items-center justify-end gap-4">
                    <RouterLink
                        v-if="canSeeNotifications"
                        to="/notifications"
                        class="relative inline-flex h-8 w-8 items-center justify-center rounded text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                        aria-label="Notifications"
                    >
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        <span
                            v-if="notifications.unread > 0"
                            class="absolute -right-0.5 -top-0.5 inline-flex min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-4 text-white"
                        >
                            {{ notifications.unread > 99 ? '99+' : notifications.unread }}
                        </span>
                    </RouterLink>

                    <div v-if="userMenu" class="relative z-50">
                        <div v-if="userMenuOpen" class="fixed inset-0 -z-10" @click="userMenuOpen = false" />
                        <button
                            type="button"
                            class="inline-flex items-center gap-1.5 rounded px-2 py-1 text-sm text-gray-700 hover:bg-gray-50"
                            :aria-expanded="userMenuOpen"
                            @click="userMenuOpen = !userMenuOpen"
                        >
                            <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span class="hidden max-w-[160px] truncate sm:inline">{{ userMenu.name }}</span>
                            <svg class="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6" />
                            </svg>
                        </button>

                        <div
                            v-if="userMenuOpen"
                            class="absolute right-0 z-50 mt-1 w-56 overflow-hidden rounded-md border border-gray-200 bg-white py-1 shadow-lg"
                        >
                            <!-- Account -->
                            <p class="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Shortcuts</p>
                            <RouterLink
                                v-for="item in userMenu.items"
                                :key="item.to"
                                :to="item.to"
                                class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                @click="userMenuOpen = false"
                            >
                                {{ item.label }}
                            </RouterLink>

                            <div class="my-1 border-t border-gray-100" />

                            <!-- Workspaces -->
                            <p class="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Workspaces</p>
                            <button
                                v-for="workspace in workspaces"
                                :key="workspace.key"
                                type="button"
                                class="flex w-full items-center justify-between px-4 py-2 text-sm hover:bg-gray-50"
                                :class="workspace.active ? 'font-medium text-red-700' : 'text-gray-700'"
                                @click="switchWorkspace(workspace.key)"
                            >
                                {{ workspace.label }}
                                <span v-if="workspace.active" class="text-xs">●</span>
                            </button>

                            <div class="my-1 border-t border-gray-100" />
                            <button
                                type="button"
                                class="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                                :disabled="formOptions.status === 'syncing'"
                                @click="updateData"
                            >
                                {{ formOptions.status === 'syncing' ? 'Updating…' : 'Update data' }}
                                <svg
                                    class="h-4 w-4 text-gray-400"
                                    :class="{ 'animate-spin': formOptions.status === 'syncing' }"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    viewBox="0 0 24 24"
                                >
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h5M20 20v-5h-5M20 9a8 8 0 00-14.9-3M4 15a8 8 0 0014.9 3" />
                                </svg>
                            </button>

                            <button
                                type="button"
                                class="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                @click="toggleTheme"
                            >
                                {{ isDark ? 'Light mode' : 'Dark mode' }}
                                <svg v-if="isDark" class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="4" />
                                    <path stroke-linecap="round" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41" />
                                </svg>
                                <svg v-else class="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                                </svg>
                            </button>

                            <div class="my-1 border-t border-gray-100" />
                            <button
                                type="button"
                                class="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50"
                                @click="signOut"
                            >
                                Sign out
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </header>

        <!-- Left sidebar -->
        <aside
            v-if="hasSidebar"
            class="sidebar-scroll fixed bottom-0 left-0 top-14 z-20 w-56 overflow-y-auto border-r border-gray-200 bg-white px-4 py-6 transition-transform lg:translate-x-0"
            :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
        >
            <nav class="space-y-4">
                <div v-for="(group, i) in navigation" :key="group.separator ? `sep-${i}` : group.label">
                    <!-- Section divider, declared as { separator: true } in workspaces.js. -->
                    <hr v-if="group.separator" class="border-t border-gray-200" />

                    <!-- Single-item group renders as a plain top-level link (no accordion). -->
                    <RouterLink
                        v-else-if="group.items.length === 1"
                        :to="group.items[0].to"
                        class="block px-2 text-xs font-semibold uppercase tracking-wide"
                        :class="isActive(group.items[0].to) ? 'text-red-700' : 'text-gray-400 hover:text-gray-600'"
                        @click="sidebarOpen = false"
                    >
                        {{ group.label }}
                    </RouterLink>

                    <template v-else>
                        <button
                            type="button"
                            class="mb-1 flex w-full items-center justify-between px-2 text-xs font-semibold uppercase tracking-wide text-gray-400 hover:text-gray-600"
                            :aria-expanded="!isGroupCollapsed(group)"
                            @click="toggleGroup(group.label)"
                        >
                            <span>{{ group.label }}</span>
                            <svg
                                class="h-3 w-3 transition-transform"
                                :class="{ '-rotate-90': isGroupCollapsed(group) }"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2.5"
                                viewBox="0 0 24 24"
                            >
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6" />
                            </svg>
                        </button>
                        <ul v-show="!isGroupCollapsed(group)" class="ml-3 space-y-0.5 border-l border-gray-200 pl-2">
                            <li v-for="item in group.items" :key="item.to">
                                <RouterLink
                                    :to="item.to"
                                    class="block rounded px-2 py-1.5 text-sm"
                                    :class="isActive(item.to) ? 'bg-red-50 font-medium text-red-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'"
                                    @click="sidebarOpen = false"
                                >
                                    {{ item.label }}
                                </RouterLink>
                            </li>
                        </ul>
                    </template>
                </div>
            </nav>
        </aside>

        <!-- Backdrop for the mobile sidebar -->
        <div
            v-if="hasSidebar && sidebarOpen"
            class="fixed inset-0 z-10 bg-black/30 lg:hidden"
            @click="sidebarOpen = false"
        />

        <main :class="hasSidebar ? 'lg:ml-56' : ''" class="py-8">
            <div :class="containerClass">
                <slot />
            </div>
        </main>
    </div>
</template>

<style scoped>
/* Consistent thin scrollbar for the sidebar across platforms. */
.sidebar-scroll {
    scrollbar-width: thin;
    scrollbar-color: #cbd5e1 transparent;
}

.sidebar-scroll::-webkit-scrollbar {
    width: 8px;
}

.sidebar-scroll::-webkit-scrollbar-track {
    background: transparent;
}

.sidebar-scroll::-webkit-scrollbar-thumb {
    background-color: #cbd5e1;
    border-radius: 9999px;
    border: 2px solid transparent;
    background-clip: content-box;
}

.sidebar-scroll::-webkit-scrollbar-thumb:hover {
    background-color: #94a3b8;
}
</style>
