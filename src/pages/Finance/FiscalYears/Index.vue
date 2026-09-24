<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import api from '../../../helpers/api.js';
import { routeUrl } from '../../../helpers/route.js';
import { castResource } from '../../../types/responses.js';
import { useAuthStore } from '../../../stores/auth.js';
import { useNotificationsStore } from '../../../stores/notifications.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import ConfirmDialog from '../../../components/ConfirmDialog.vue';
import Loader from '../../../components/Loader.vue';

// GET  /finance/fiscal-years            → { years: [{ year, starts_at, ends_at, status: { id, name },
//                                           locked, closed_at, closed_by: { id, name } | null, error,
//                                           trial_balance_accounts, can_close, can_reopen }] }
// POST /finance/fiscal-years/:year/close  — locks the year and queues the job that stores its trial balance
// POST /finance/fiscal-years/:year/reopen — last closed year only; deletes its stored trial balance
// Status ids: 0 open, 1 closing (job running), 2 closed, 3 failed.
const STATUS = { OPEN: 0, CLOSING: 1, CLOSED: 2, FAILED: 3 };

const auth = useAuthStore();
const notifications = useNotificationsStore();

const years = ref(null);
const loading = ref(false);
const error = ref(null);
const pending = ref(null); // { year, action: 'close' | 'reopen' }
const processing = ref(false);
let pollTimer = null;

const anyClosing = computed(() => (years.value ?? []).some((year) => year.status.id === STATUS.CLOSING));

async function fetchYears({ quiet = false } = {}) {
    if (! quiet) {
        loading.value = true;
    }

    try {
        const { data } = await api.get('/finance/fiscal-years');
        years.value = castResource(data).years;
        error.value = null;
    } catch {
        error.value = 'Could not load the fiscal years right now.';
    } finally {
        loading.value = false;
        schedulePoll();
    }
}

// While a closing job runs, refresh every few seconds until it finishes.
function schedulePoll() {
    clearTimeout(pollTimer);

    if (anyClosing.value) {
        pollTimer = setTimeout(() => fetchYears({ quiet: true }), 3000);
    }
}

async function confirmPending() {
    if (processing.value || ! pending.value) {
        return;
    }

    const { year, action } = pending.value;
    processing.value = true;

    try {
        await api.post(`/finance/fiscal-years/${year}/${action}`);
        notifications.push({
            type: 'success',
            message: action === 'close'
                ? `Closing ${year} — the trial balance is being stored.`
                : `${year} reopened.`,
        });
        pending.value = null;
        await fetchYears({ quiet: true });
    } catch (e) {
        notifications.push({
            type: 'error',
            message: e.response?.data?.errors?.year?.[0] ?? e.response?.data?.message ?? `Could not ${action} ${year}.`,
        });
    } finally {
        processing.value = false;
    }
}

// "01.01.2025 00:00:00" → "01.01.2025": the year always runs from the start
// of its first day to the end of its last, so the time adds nothing here.
function dateOnly(dateTime) {
    return String(dateTime ?? '').split(' ')[0];
}

function statusClass(status) {
    return {
        [STATUS.OPEN]: 'bg-gray-100 text-gray-600',
        [STATUS.CLOSING]: 'bg-amber-100 text-amber-800',
        [STATUS.CLOSED]: 'bg-green-100 text-green-700',
        [STATUS.FAILED]: 'bg-red-100 text-red-700',
    }[status.id];
}

const dialog = computed(() => {
    if (! pending.value) {
        return { title: '', message: '' };
    }

    const { year, action } = pending.value;

    return action === 'close'
        ? {
            title: `Close fiscal year ${year}?`,
            message: `Nothing can be posted, changed or deleted on or before 31.12.${year} once it is closed, and its trial balance is stored as it stands now.`,
            confirmLabel: 'Yes, close it',
            variant: 'primary',
        }
        : {
            title: `Reopen fiscal year ${year}?`,
            message: `Its stored trial balance is deleted and postings into ${year} are allowed again until it is closed again.`,
            confirmLabel: 'Yes, reopen it',
            variant: 'danger',
        };
});

onMounted(() => fetchYears());
onBeforeUnmount(() => clearTimeout(pollTimer));
</script>

<template>
    <AppLayout title="Fiscal years">
        <FullWidthBox title="Fiscal years" :collapsible="false">
            <p class="mb-4 text-sm text-gray-500">
                Closing a year locks it and every year before it, and stores its trial balance. Years close in order; only the last closed year can be reopened.
            </p>

            <p v-if="error" class="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{{ error }}</p>

            <div v-else class="overflow-x-auto">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                        <tr class="text-left text-xs uppercase text-gray-500">
                            <th class="border border-gray-300 px-2 py-2" style="width: 80px;">Year</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 120px;">From</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 120px;">To</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 120px;">Status</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 150px;">Closed at</th>
                            <th class="border border-gray-300 px-2 py-2" style="width: 180px;">Closed by</th>
                            <th class="border border-gray-300 px-2 py-2 text-right" style="width: 110px;">Accounts stored</th>
                            <th class="border border-gray-300 px-2 py-2 text-center" style="width: 260px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading || ! years">
                            <td colspan="8" class="border border-gray-300 px-2 py-2"><Loader /></td>
                        </tr>
                        <tr v-for="year in (loading ? [] : years ?? [])" :key="year.year" class="hover:bg-gray-50">
                            <td class="border border-gray-300 px-2 py-2 font-semibold">{{ year.year }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ dateOnly(year.starts_at) }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ dateOnly(year.ends_at) }}</td>
                            <td class="border border-gray-300 px-2 py-2">
                                <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold" :class="statusClass(year.status)">{{ year.status.name }}</span>
                                <span v-if="year.locked && year.status.id === STATUS.OPEN" class="ml-1 text-xs text-gray-500" title="Locked by a later closed year">🔒</span>
                                <p v-if="year.status.id === STATUS.FAILED && year.error" class="mt-1 text-xs text-red-600">{{ year.error }}</p>
                            </td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ year.closed_at ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ year.closed_by?.name ?? '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2 text-right tabular-nums">{{ year.status.id === STATUS.CLOSED ? year.trial_balance_accounts : '—' }}</td>
                            <td class="border border-gray-300 px-2 py-2">
                                <div class="flex flex-wrap justify-center gap-2">
                                    <RouterLink
                                        v-if="year.status.id === STATUS.CLOSED"
                                        :to="routeUrl('fiscalYears.trialBalance', year.year)"
                                        class="inline-block rounded border border-gray-300 bg-white px-3 py-1 text-xs hover:bg-gray-50"
                                    >Trial balance</RouterLink>
                                    <Button
                                        v-if="year.can_close && auth.can('fiscalYears.close')"
                                        type="button"
                                        variant="primary"
                                        size="sm"
                                        @click="pending = { year: year.year, action: 'close' }"
                                    >{{ year.status.id === STATUS.FAILED ? 'Retry close' : 'Close year' }}</Button>
                                    <Button
                                        v-if="year.can_reopen && auth.can('fiscalYears.reopen')"
                                        type="button"
                                        variant="danger"
                                        size="sm"
                                        @click="pending = { year: year.year, action: 'reopen' }"
                                    >Reopen</Button>
                                    <span v-if="year.status.id === STATUS.CLOSING" class="text-xs text-amber-700">Storing trial balance…</span>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </FullWidthBox>

        <ConfirmDialog
            :show="Boolean(pending)"
            :title="dialog.title"
            :message="dialog.message"
            :confirm-label="dialog.confirmLabel"
            :confirm-variant="dialog.variant"
            :processing="processing"
            @confirm="confirmPending"
            @cancel="pending = null"
        />
    </AppLayout>
</template>
