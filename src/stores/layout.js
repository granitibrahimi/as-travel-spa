import { defineStore } from 'pinia';
import api from '../helpers/api';
import { workspaces as WORKSPACES, userMenu as USER_MENU } from '../config/workspaces';
import { useAuthStore } from './auth';

const ACTIVE_KEY = 'as.activeWorkspace';

// Whether the current user may see a workspace / nav item. `can` may be a
// single permission string OR an array (the user needs ANY of them); `canAny`
// is the explicit any-of list. No requirement declared → always visible.
const allows = (auth, entry) => {
    if (entry.canAny) {
        return auth.canAny(entry.canAny);
    }

    if (Array.isArray(entry.can)) {
        return auth.canAny(entry.can);
    }

    if (entry.can) {
        return auth.can(entry.can);
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
                .filter((workspace) => allows(auth, workspace))
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

            const groups = workspace.groups
                .map((group) => (group.separator
                    ? { separator: true }
                    : { label: group.label, items: group.items.filter((item) => allows(auth, item)) }))
                .filter((group) => group.separator || group.items.length > 0);

            // Drop separators that would render at the very top/bottom or back to
            // back once permission filtering has removed neighbouring groups.
            return groups.filter((group, i) => {
                if (!group.separator) {
                    return true;
                }

                const prev = groups[i - 1];
                const next = groups[i + 1];

                return prev && next && !prev.separator;
            });
        },

        userMenuItems() {
            const auth = useAuthStore();

            return USER_MENU.filter((item) => allows(auth, item));
        },
    },

    actions: {
        // Resolve the active workspace: localStorage override, else the user's
        // last-selected (from /me), else the first workspace they can access.
        init() {
            const auth = useAuthStore();
            const accessible = WORKSPACES.filter((w) => allows(auth, w)).map((w) => w.key);
            const stored = localStorage.getItem(ACTIVE_KEY);
            const candidates = [stored, auth.user?.workspace];

            this.activeWorkspace = candidates.find((key) => key && accessible.includes(key)) ?? accessible[0] ?? null;
        },

        switchWorkspace(key) {
            const auth = useAuthStore();
            const workspace = WORKSPACES.find((w) => w.key === key);

            if (!workspace || !allows(auth, workspace)) {
                return;
            }

            this.activeWorkspace = key;
            localStorage.setItem(ACTIVE_KEY, key);
            // Best-effort persist so it sticks across devices; the local choice
            // already applied even if this fails.
            api.patch('/users/workspace', { key }).catch(() => {});
        },
    },
});
