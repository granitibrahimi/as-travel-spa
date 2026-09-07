<script setup>
import { onMounted, reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import api from '../../../helpers/api.js';
import { routeUrl } from '../../../helpers/route.js';
import { castResource } from '../../../types/responses.js';
import { useAuthStore } from '../../../stores/auth.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import DateInput from '../../../components/Form/DateInput.vue';
import Textarea from '../../../components/Form/Textarea.vue';
import Select from '../../../components/Form/Select.vue';
import NiceCheckbox from '../../../components/Form/NiceCheckbox.vue';
import UserDetails from '../../../components/UserDetails.vue';
import VacationBalanceBox from '../../../components/VacationBalanceBox.vue';
import Loader from '../../../components/Loader.vue';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const id = route.params.id;

// The update endpoint validates dates as d.m.Y, and DateInput's v-model is d.m.Y,
// so the edit endpoint hands dates back in that format — bound/sent verbatim.

const vacationTypes = ref([]);
const statuses = ref([]);
const userId = ref(null);
const userName = ref('');
// Full user record for the left-hand "User details" panel — fetched best-effort
// so the layout mirrors the vacation request show page; falls back to just the
// name from the request when the viewer can't read users.
const userDetails = ref(null);
const ready = ref(false);

const form = reactive({
    type: null,
    from: '',
    to: '',
    working_weekend: false,
    description: '',
    status: null,
    response: '',
});
const errors = ref({});
const processing = ref(false);

onMounted(async () => {
    // GetVacationRequestForEditAction wraps its payload as { data: { data: <fields>,
    // vacationTypes: [...], statuses: [...] } }; castResource() unwraps one level,
    // the request fields sit one deeper.
    const { data } = await api.get(`/users/vacations/${id}/edit`);
    const body = castResource(data);
    const fields = body.data;

    vacationTypes.value = body.vacationTypes;
    statuses.value = body.statuses ?? [];
    userId.value = fields.user_id;
    userName.value = fields.user ?? '';
    Object.assign(form, {
        type: fields.type,
        from: fields.from,
        to: fields.to,
        working_weekend: fields.working_weekend ?? false,
        description: fields.description ?? '',
        status: fields.status ?? null,
        response: fields.response ?? '',
    });
    ready.value = true;

    await loadUserDetails(fields.user_id);
});

async function loadUserDetails(forUserId) {
    if (! auth.can('users.show')) {
        return;
    }

    try {
        const res = await api.get(`/users/users/${forUserId ?? userId.value}`);
        userDetails.value = castResource(res.data);
    } catch {
        userDetails.value = null;
    }
}

async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    try {
        await api.put(`/users/vacations/${id}`, {
            type: form.type,
            from: form.from,
            to: form.to,
            working_weekend: form.working_weekend ? 1 : 0,
            description: form.description,
            status: form.status,
            response: form.response,
        });
        router.push(routeUrl('vacations.show', id));
    } catch (error) {
        if (error.response?.status === 422) {
            errors.value = Object.fromEntries(
                Object.entries(error.response.data.errors ?? {}).map(([field, messages]) => [field, messages[0]]),
            );
        } else {
            throw error;
        }
    } finally {
        processing.value = false;
    }
}
</script>

<template>
    <AppLayout title="Edit vacation request" fluid>
        <Loader v-if="! ready" />
        <form v-else class="space-y-6" @submit.prevent="submit">
            <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div class="space-y-6">
                    <UserDetails v-if="userDetails" :user="userDetails" title="User details" />
                    <FullWidthBox v-else title="User details" :collapsible="false">
                        <p class="text-sm text-gray-700">{{ userName || '—' }}</p>
                    </FullWidthBox>

                    <VacationBalanceBox v-if="userDetails" :user="userDetails" @recalculated="loadUserDetails()" />
                </div>

                <div class="space-y-6">
                    <FullWidthBox title="Request" :collapsible="false">
                        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Select v-model="form.type" :options="vacationTypes" label="Type *" :placeholder="null" :error="errors.type" />
                            <div class="hidden md:block" />
                            <DateInput v-model="form.from" label="From *" :error="errors.from" />
                            <DateInput v-model="form.to" label="To *" :error="errors.to" />
                        </div>
                        <NiceCheckbox v-model="form.working_weekend" label="Includes a working weekend" class="mt-4" />
                        <div class="mt-4">
                            <Textarea v-model="form.description" label="Description" :error="errors.description" />
                        </div>
                    </FullWidthBox>

                    <FullWidthBox title="Response" :collapsible="false">
                        <div class="space-y-4">
                            <Select v-model="form.status" :options="statuses" label="Decision" :placeholder="null" :error="errors.status" />
                            <Textarea v-model="form.response" label="Response note" :error="errors.response" />
                        </div>
                    </FullWidthBox>
                </div>
            </div>

            <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink :to="routeUrl('vacations.show', id)" class="inline-flex items-center rounded border border-gray-300 bg-white px-4 py-1.5 text-sm hover:bg-gray-50">Cancel</RouterLink>
                <Button type="submit" variant="primary" :disabled="processing">
                    {{ processing ? 'Saving…' : 'Update request' }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
