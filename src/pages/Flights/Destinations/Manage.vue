<script setup>
import { onMounted, reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import flightsApi from '../../../helpers/flightsApi.js';
import { FLIGHT_PROVIDERS } from '../../../helpers/flightProviders.js';
import { routeUrl } from '../../../helpers/route.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Alert from '../../../components/Alert.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';

const route = useRoute();
const router = useRouter();

const destinationId = route.params.id ?? null;
const isEdit = Boolean(destinationId);

const form = reactive({
    name: '',
    shortcut: '',
    country: '',
});

// Per-provider identifier, keyed by provider slug (provider_identifiers keys).
// Rendered as one input per provider; blanks are dropped before submit so only
// served providers persist.
const providerIds = reactive(
    Object.fromEntries(FLIGHT_PROVIDERS.map((provider) => [provider.slug, ''])),
);

const errors = ref({});
const error = ref('');
const processing = ref(false);
const loaded = ref(!isEdit);

onMounted(async () => {
    if (!isEdit) {
        return;
    }

    try {
        const { data } = await flightsApi.get(`/destinations/${destinationId}`);
        Object.assign(form, {
            name: data.name ?? '',
            shortcut: data.shortcut ?? '',
            country: data.country ?? '',
        });
        Object.entries(data.provider_identifiers ?? {}).forEach(([key, value]) => {
            if (key in providerIds) {
                providerIds[key] = value ?? '';
            }
        });
    } catch (e) {
        error.value = e.response?.data?.message ?? 'Could not load the destination.';
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

    const provider_identifiers = Object.fromEntries(
        Object.entries(providerIds)
            .map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
            .filter(([, value]) => value !== '' && value !== null),
    );

    const payload = {
        name: form.name,
        shortcut: form.shortcut || null,
        country: form.country || null,
        provider_identifiers: Object.keys(provider_identifiers).length ? provider_identifiers : null,
    };

    try {
        if (isEdit) {
            await flightsApi.put(`/destinations/${destinationId}`, payload);
        } else {
            await flightsApi.post('/destinations', payload);
        }

        router.push(routeUrl('flightDestinations.list'));
    } catch (e) {
        if (e.response?.status === 422) {
            errors.value = Object.fromEntries(
                Object.entries(e.response.data.errors ?? {}).map(([field, messages]) => [field, messages[0]]),
            );
        } else {
            error.value = e.response?.data?.message ?? 'Could not save the destination.';
        }
    } finally {
        processing.value = false;
    }
}
</script>

<template>
    <AppLayout :title="isEdit ? 'Edit destination' : 'New destination'">
        <form class="space-y-6" @submit.prevent="submit">
            <Alert v-if="error" type="danger">{{ error }}</Alert>

            <FullWidthBox title="Destination details" :collapsible="false">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <InputText v-model="form.name" label="Name *" :error="errors.name" />
                    <InputText v-model="form.shortcut" label="IATA code" maxlength="8" placeholder="e.g. PRN" :error="errors.shortcut" />
                    <InputText v-model="form.country" label="Country (ISO2)" maxlength="2" placeholder="e.g. XK" :error="errors.country" />
                </div>
            </FullWidthBox>

            <FullWidthBox title="Provider identifiers" :collapsible="false">
                <p class="mb-4 text-sm text-gray-500">
                    This destination's id/code for each provider that serves it. Leave blank where it isn't served.
                </p>
                <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <InputText
                        v-for="provider in FLIGHT_PROVIDERS"
                        :key="provider.slug"
                        v-model="providerIds[provider.slug]"
                        :label="provider.name"
                        :error="errors[`provider_identifiers.${provider.slug}`] || errors.provider_identifiers"
                    />
                </div>
            </FullWidthBox>

            <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink :to="routeUrl('flightDestinations.list')" class="rounded border border-gray-300 px-4 py-1.5 text-sm hover:bg-gray-50">Cancel</RouterLink>
                <Button type="submit" variant="primary" :disabled="processing || ! loaded">
                    {{ processing ? 'Saving…' : (isEdit ? 'Update destination' : 'Create destination') }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
