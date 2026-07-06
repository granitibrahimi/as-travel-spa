import { defineStore } from 'pinia';
import api from '../helpers/api';
import { workspaces as WORKSPACES, userMenu as USER_MENU } from '../config/workspaces';
import { useAuthStore } from './auth';

const ACTIVE_KEY = 'as.activeWorkspace';

const canSee = (auth, item) => {
    if (item.canAny) {
        return auth.canAny(item.canAny);
    }

    if (item.can) {
        return auth.can(item.can);
    }

    return true;
};

/**
 * Sidebar/workspace state. Workspaces + navigation are defined locally
 * (config/workspaces.js) and filtered by the user's permissions. The active
 * workspace is the user's last choice (localStorage, then /me's `workspace`).
 */
export const useLayoutStore = defineStore('layout', {
    state: () => ({
        activeWorkspace: null,
    }),

    getters: {
        // The workspaces the user may enter, tagged with the active one.
        accessibleWorkspaces() {
            const auth = useAuthStore();

            return WORKSPACES
                .filter((workspace) => auth.can(workspace.can))
                .map((workspace) => ({
                    key: workspace.key,
                    label: workspace.label,
                    home: workspace.home,
                    active: workspace.key === this.activeWorkspace,
                }));
        },

        currentWorkspace() {
            return WORKSPACES.find((workspace) => workspace.key === this.activeWorkspace) ?? null;
        },

        // Permission-filtered groups for the active workspace; empty groups drop.
        navigation() {
            const auth = useAuthStore();
            const workspace = this.currentWorkspace;

            if (!workspace) {
                return [];
            }

            return workspace.groups
                .map((group) => ({
                    label: group.label,
                    items: group.items.filter((item) => canSee(auth, item)),
                }))
                .filter((group) => group.items.length > 0);
        },

        userMenuItems() {
            const auth = useAuthStore();

            return USER_MENU.filter((item) => canSee(auth, item));
        },
    },

    actions: {
        // Resolve the active workspace: localStorage override, else the user's
        // last-selected (from /me), else the first workspace they can access.
        init() {
            const auth = useAuthStore();
            const accessible = WORKSPACES.filter((w) => auth.can(w.can)).map((w) => w.key);
            const stored = localStorage.getItem(ACTIVE_KEY);
            const candidates = [stored, auth.user?.workspace];

            this.activeWorkspace = candidates.find((key) => key && accessible.includes(key)) ?? accessible[0] ?? null;
        },

        switchWorkspace(key) {
            const auth = useAuthStore();
            const workspace = WORKSPACES.find((w) => w.key === key);

            if (!workspace || !auth.can(workspace.can)) {
                return;
            }

            this.activeWorkspace = key;
            localStorage.setItem(ACTIVE_KEY, key);
            // Best-effort persist so it sticks across devices; the local choice
            // already applied even if this fails.
            api.patch('/workspace', { key }).catch(() => {});
        },
    },
});
