import { ref } from 'vue';
import api from '../helpers/api';
import { castResource } from '../types/responses.js';

/**
 * Fetch a statistics report from the API. `load(params)` GETs the endpoint with
 * the given filter params (from/to/parent_destination_id), cancelling any
 * in-flight request so rapid filter changes don't race.
 */
export function useReport(endpoint) {
    const loading = ref(false);
    const error = ref(null);
    const data = ref(null);
    let controller = null;

    async function load(params = {}) {
        controller?.abort();
        controller = new AbortController();
        loading.value = true;
        error.value = null;

        try {
            const { data: payload } = await api.get(endpoint, { signal: controller.signal, params });
            data.value = castResource(payload);
        } catch (e) {
            if (e.code === 'ERR_CANCELED') {
                return;
            }

            error.value = 'Could not load this report right now.';
        } finally {
            loading.value = false;
        }
    }

    return { loading, error, data, load };
}
