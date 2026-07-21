<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import flightsApi from '../../../helpers/flightsApi.js';
import { FLIGHT_PROVIDERS } from '../../../helpers/flightProviders.js';
import { routeUrl } from '../../../helpers/route.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Alert from '../../../components/Alert.vue';
import Button from '../../../components/Button.vue';
import Select from '../../../components/Form/Select.vue';
import NiceCheckbox from '../../../components/Form/NiceCheckbox.vue';

const route = useRoute();
const router = useRouter();

const optionId = route.params.id ?? null;
const isEdit = Boolean(optionId);

const form = reactive({
    from_destination_id: null,
    to_destination_id: null,
    is_return: false,
    providers: [],
});

const destinationOptions = ref([]);
const errors = ref({});
const error = ref('');
const processing = ref(false);
const loaded = ref(false);

const providerError = computed(() =>
    errors.value.providers
        || Object.entries(errors.value).find(([key]) => key.startsWith('providers.'))?.[1]
        || '',
);

function toggleProvider(value) {
    const index = form.providers.indexOf(value);

    if (index === -1) {
        form.providers.push(value);
    } else {
        form.providers.splice(index, 1);
    }
}

onMounted(async () => {
    try {
        const { data } = await flightsApi.get('/destinations');
        destinationOptions.value = data.map((destination) => ({
            value: destination.id,
            label: destination.shortcut ? `${destination.name} (${destination.shortcut})` : destination.name,
        }));

        if (isEdit) {
            const { data: option } = await flightsApi.get(`/travel-options/${optionId}`);
            Object.assign(form, {
                from_destination_id: option.from_destination_id,
                to_destination_id: option.to_destination_id,
                is_return: Boolean(option.is_return),
                providers: [...(option.providers ?? [])],
            });
        }
    } catch (e) {
        error.value = e.response?.data?.message ?? 'Could not load the travel option.';
    } finally {
        loaded.value = true;
    }
});

async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};
    error.value = '';

    const payload = {
        from_destination_id: form.from_destination_id,
        to_destination_id: form.to_destination_id,
        is_return: form.is_return,
        providers: form.providers,
    };

    try {
        if (isEdit) {
            await flightsApi.put(`/travel-options/${optionId}`, payload);
        } else {
            await flightsApi.post('/travel-options', payload);
        }

        router.push(routeUrl('travelOptions.list'));
    } catch (e) {
        if (e.response?.status === 422) {
            errors.value = Object.fromEntries(
                Object.entries(e.response.data.errors ?? {}).map(([field, messages]) => [field, messages[0]]),
            );
        } else {
            error.value = e.response?.data?.message ?? 'Could not save the travel option.';
        }
    } finally {
        processing.value = false;
    }
}
</script>

<template>
    <AppLayout :title="isEdit ? 'Edit travel option' : 'New travel option'">
        <form class="space-y-6" @submit.prevent="submit">
            <Alert v-if="error" type="danger">{{ error }}</Alert>

            <FullWidthBox title="Route" :collapsible="false">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Select v-model="form.from_destination_id" :options="destinationOptions" label="From *" placeholder="Choose origin…" :error="errors.from_destination_id" />
                    <Select v-model="form.to_destination_id" :options="destinationOptions" label="To *" placeholder="Choose destination…" :error="errors.to_destination_id" />
                </div>
                <div class="mt-4">
                    <NiceCheckbox v-model="form.is_return" label="Return leg available" :error="errors.is_return" />
                </div>
            </FullWidthBox>

            <FullWidthBox title="Providers" :collapsible="false">
                <p class="mb-4 text-sm text-gray-500">Which providers serve this route.</p>
                <div class="grid grid-cols-2 gap-3 md:grid-cols-3">
                    <label v-for="provider in FLIGHT_PROVIDERS" :key="provider.value" class="flex cursor-pointer items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            :checked="form.providers.includes(provider.value)"
                            class="rounded border-gray-300 text-red-600 focus:ring-red-500"
                            @change="toggleProvider(provider.value)"
                        >
                        {{ provider.name }}
                    </label>
                </div>
                <p v-if="providerError" class="mt-2 text-xs text-red-600">{{ providerError }}</p>
            </FullWidthBox>

            <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink :to="routeUrl('travelOptions.list')" class="rounded border border-gray-300 px-4 py-1.5 text-sm hover:bg-gray-50">Cancel</RouterLink>
                <Button type="submit" variant="primary" :disabled="processing || ! loaded">
                    {{ processing ? 'Saving…' : (isEdit ? 'Update travel option' : 'Create travel option') }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
