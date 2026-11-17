import { onBeforeUnmount, onMounted, watch } from 'vue';
import api from '../helpers/api';

/**
 * Tell the API the user has this request open, so boards show a "working"
 * icon on its card: a heartbeat every 30 seconds while the tab is visible,
 * and "left" when the page closes. The API forgets a viewer after ~75 s
 * without a heartbeat (closed tab, lost connection).
 */
export function useRequestViewing(taskId) {
    let timer = null;
    let current = null;

    const beat = () => {
        if (current && document.visibilityState === 'visible') {
            api.put(`/simple-tasks/${current}/viewing`).catch(() => {});
        }
    };

    const leave = (id) => {
        if (id) {
            api.delete(`/simple-tasks/${id}/viewing`).catch(() => {});
        }
    };

    const start = (id) => {
        if (current && current !== id) {
            leave(current);
        }
        current = id ? Number(id) : null;
        beat();
    };

    const onVisibility = () => {
        if (document.visibilityState === 'visible') {
            beat();
        }
    };

    onMounted(() => {
        start(taskId());
        timer = setInterval(beat, 30_000);
        document.addEventListener('visibilitychange', onVisibility);
    });

    watch(taskId, (id) => start(id));

    onBeforeUnmount(() => {
        clearInterval(timer);
        document.removeEventListener('visibilitychange', onVisibility);
        leave(current);
        current = null;
    });
}
