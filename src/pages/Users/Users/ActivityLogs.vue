<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import api, {getUsersAutosuggestEndpoint} from '../../../helpers/api.js';
import { routeUrl } from '../../../helpers/route.js';
import { castPaginated } from '../../../types/responses.js';
import { useListFilters } from '../../../composables/useListFilters.js';
import { useFormOptionsStore, toOptions } from '../../../stores/formOptions.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FiltersButton from '../../../components/FiltersButton.vue';
import FiltersPanel from '../../../components/FiltersPanel.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import AsyncSelect from '../../../components/Form/AsyncSelect.vue';
import SearchSelect from '../../../components/Form/SearchSelect.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import ApiPagination from '../../../components/ApiPagination.vue';
import Loader from '../../../components/Loader.vue';

const router = useRouter();
const formOptions = useFormOptionsStore();

const { filters, response: apiResponse, loading, showFilters, activeCount, apply, clear, goToPage } = useListFilters(
    { action: null, user: null, user_name: '', from: '', to: '' },
    async (params, { signal }) => castPaginated((await api.get('/audit-logs/user-activity-logs', { params, signal })).data),
    // The agent's name rides along in the URL so the picker can show it again on Back.
    { urlOnly: ['user_name'] },
);

// Static list of audited actions, synced with the rest of the form options.
const actionOptions = computed(() => toOptions(formOptions.options('user_activity_log_actions')));

// Shown only when the row has audit logs — open the per-entry audit log view.
function viewAuditLogs(log) {
    router.push(routeUrl('users.activityLogAudit', log.id));
}

// input_data is an empty array when there's nothing, or an object of params
// (e.g. { from, to, roles: [...] }) otherwise. Render it compactly.
function formatInput(input) {
    if (!input || Array.isArray(input)) {
        return Array.isArray(input) && input.length ? input.join(', ') : '—';
    }

    const entries = Object.entries(input);

    if (!entries.length) {
        return '—';
    }

    return entries
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join('/') : value}`)
        .join(', ');
}
</script>

<template>
    <AppLayout title="User activity logs" fluid>
        <FullWidthBox title="User activity logs" :collapsible="false">
            <template #actions>
                <FiltersButton v-model="showFilters" :count="activeCount" />
            </template>

            <FiltersPanel :open="showFilters">
                <form class="grid grid-cols-1 gap-3 md:grid-cols-4" @submit.prevent="apply">
                    <SearchSelect v-model="filters.action" :options="actionOptions" label="Action" placeholder="All actions" />
                    <!-- AsyncSelect only reads initialOption on mount, so re-key it whenever the value changes (restore/clear). -->
                    <AsyncSelect
                        :key="filters.user ?? 'none'"
                        v-model="filters.user"
                        label="Agent"
                        :url="getUsersAutosuggestEndpoint()"
                        placeholder="All agents"
                        :initial-option="filters.user ? { name: filters.user_name } : null"
                        @change="(option) => (filters.user_name = option?.label ?? '')"
                    />
                    <DateInput v-model="filters.from" label="From" />
                    <DateInput v-model="filters.to" label="To" />
                    <div class="flex items-end gap-2 md:col-span-4">
                        <Button type="submit" variant="primary" :loading="loading">Filter</Button>
                        <Button type="button" @click="clear">Clear</Button>
                    </div>
                </form>
            </FiltersPanel>

            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 70px;">ID</th>
                            <th class="border border-gray-300 px-2 py-2">User</th>
                            <th class="border border-gray-300 px-2 py-2">Action</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 100px;">Reference ID</th>
                            <th class="border border-gray-300 px-2 py-2">Input</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 140px;">Date</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 120px;">Audit Logs</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! apiResponse">
                            <td colspan="7" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-else-if="apiResponse.data.length === 0">
                            <td colspan="7" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No logs found.</td>
                        </tr>
                        <tr v-for="log in (loading ? [] : apiResponse?.data ?? [])" :key="log.id" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 text-center font-medium">{{ log.id }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ log.user ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2">{{ log.action ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">{{ log.entity_id ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ formatInput(log.input_data) }}</td>
                            <td class="border border-gray-300 px-2 py-2 whitespace-nowrap">{{ log.timestamp }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-center">
                                <Button v-if="log.has_audit_logs" size="sm" @click="viewAuditLogs(log)">Audit Logs</Button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ApiPagination v-if="apiResponse" :paginator="apiResponse.pagination" class="mt-4" @page="goToPage" />
        </FullWidthBox>
    </AppLayout>
</template>
