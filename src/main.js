import './app.css';
import { createApp, watch } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { initTheme } from './helpers/theme';
import { setUnauthenticatedHandler, setForbiddenHandler } from './helpers/api';
import { useAuthStore } from './stores/auth';
import { usePresenceStore } from './stores/presence';
import { useIdleStore } from './stores/idle';
import { useNotificationsStore } from './stores/notifications';
import { useFormOptionsStore } from './stores/formOptions';

// Apply the saved/OS theme before anything renders (no flash of wrong theme).
initTheme();

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);

const auth = useAuthStore();
const presence = usePresenceStore();
const idle = useIdleStore();
const notifications = useNotificationsStore();
const formOptions = useFormOptionsStore();

// A 401 from the API drops the token; send the user back to login.
setUnauthenticatedHandler(() => {
    auth.reset();
    router.push({ name: 'login' });
});

// A 403 means the action is not permitted; send the user to the 403 page
// (unless they're already there, to avoid a redundant navigation).
setForbiddenHandler(() => {
    if (router.currentRoute.value.name !== 'forbidden') {
        router.push({ name: 'forbidden' });
    }
});

// Resolve any persisted token into a user before the first render. Pages and
// stores (e.g. AppLayout's workspace/nav resolution) read `auth.user` once at
// mount and don't all react to it arriving later, so we wait for bootstrap
// here rather than mount optimistically. The static boot splash in
// index.html covers this wait visually, so it no longer costs a blank screen.
auth.bootstrap().finally(() => {
    app.use(router);

    // Join/leave the online-users presence channel, subscribe to real-time
    // notifications, and arm the idle auto-logout with auth state.
    // `sessionActive` (ready + token) rather than `isAuthenticated` (token
    // only), so this never fires before `auth.user` is actually populated.
    watch(() => auth.sessionActive, (sessionActive) => {
        if (sessionActive) {
            presence.join();
            notifications.subscribe();

            // Load shared form options from the cached snapshot (no network), so
            // individual pages never have to and a refresh reuses the cache. The
            // network sync runs only on an actual login (see auth.login()).
            formOptions.hydrate();

            // Warn then log out after a spell of inactivity. The redirect carries
            // a hint so the login page can explain why the session ended.
            idle.start(async () => {
                await auth.logout();
                router.push({ name: 'login', query: { reason: 'idle' } });
            });
        } else {
            presence.leave();
            notifications.unsubscribe();
            formOptions.clear();
            idle.stop();
        }
    }, { immediate: true });

    // Broadcast our current location to the channel on every navigation.
    router.afterEach((to) => presence.setLocation(to.fullPath));

    app.mount('#app');
});
