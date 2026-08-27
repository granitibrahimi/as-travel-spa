import { ref } from 'vue';
import api from '../helpers/api';
import { castResource } from '../types/responses.js';

/**
 * Fetch a statistics report from the API. `load(params)` GETs the endpoint with
 * the given filter params (from/to/parent_destination_id), cancelling any
 * in-flight request so rapid filter changes don't race. A 422 (e.g. bad/missing
 * from-to range) is surfaced as field-level `errors` (keyed like the payload,
 * first message per field — same convention as the invoice create/edit forms)
 * instead of the generic banner, so callers can show it under the offending
 * filter input.
 */
export function useReport(endpoint) {
    const loading = ref(false);
    const error = ref(null);
    const errors = ref({});
    const data = ref(null);
    let controller = null;

    async function load(params = {}) {
        controller?.abort();
        controller = new AbortController();
        loading.value = true;
        error.value = null;
        errors.value = {};

        try {
            const { data: payload } = await api.get(endpoint, { signal: controller.signal, params });
            data.value = castResource(payload);
        } catch (e) {
            if (e.code === 'ERR_CANCELED') {
                return;
            }

            if (e.response?.status === 422) {
                errors.value = Object.fromEntries(
                    Object.entries(e.response.data.errors ?? {}).map(([field, messages]) => [field, messages[0]]),
                );
                error.value = e.response.data.message ?? 'Please fix the errors below.';
            } else {
                error.value = 'Could not load this report right now.';
            }
        } finally {
            loading.value = false;
        }
    }

    return { loading, error, errors, data, load };
}
