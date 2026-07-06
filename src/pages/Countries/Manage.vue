<script setup>
import { onMounted, reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import api from '../../helpers/api';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import Button from '../../components/Button.vue';
import InputText from '../../components/Form/InputText.vue';

const route = useRoute();
const router = useRouter();
const id = route.params.id;

const form = reactive({
    name: '',
    nationality: '',
    phone_code: '',
    iso2: '',
    iso3: '',
    active: true,
});
const errors = ref({});
const processing = ref(false);
const loaded = ref(false);

onMounted(async () => {
    const { data } = await api.get(`/countries/${id}`);
    const country = data.data ?? data;
    Object.assign(form, {
        name: country.name ?? '',
        nationality: country.nationality ?? '',
        phone_code: country.phone_code ?? '',
        iso2: country.iso2 ?? '',
        iso3: country.iso3 ?? '',
        active: Boolean(country.active),
    });
    loaded.value = true;
});

async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    try {
        await api.put(`/countries/${id}`, form);
        router.push('/countries');
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
    <AppLayout title="Edit country">
        <form class="space-y-6" @submit.prevent="submit">
            <FullWidthBox title="Country details" :collapsible="false">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <InputText v-model="form.name" label="Name *" :error="errors.name" />
                    <InputText v-model="form.nationality" label="Nationality *" :error="errors.nationality" />
                    <InputText v-model="form.phone_code" label="Phone code *" :error="errors.phone_code" />

                    <div class="grid grid-cols-2 gap-4">
                        <InputText v-model="form.iso2" label="ISO2 *" maxlength="2" :error="errors.iso2" />
                        <InputText v-model="form.iso3" label="ISO3 *" maxlength="3" :error="errors.iso3" />
                    </div>
                </div>

                <div class="mt-4">
                    <label class="mb-1 block text-sm font-medium text-gray-700">Active</label>
                    <button
                        type="button"
                        role="switch"
                        :aria-checked="form.active"
                        class="relative h-6 w-11 rounded-full transition-colors"
                        :class="form.active ? 'bg-green-500' : 'bg-gray-300'"
                        @click="form.active = !form.active"
                    >
                        <span class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform" :class="form.active ? 'translate-x-5' : ''" />
                    </button>
                    <p v-if="errors.active" class="mt-1 text-xs text-red-600">{{ errors.active }}</p>
                </div>
            </FullWidthBox>

            <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink to="/countries" class="inline-block rounded border border-gray-300 bg-white px-4 py-1.5 text-sm hover:bg-gray-50">
                    Cancel
                </RouterLink>
                <Button type="submit" variant="primary" :disabled="processing || ! loaded">
                    {{ processing ? 'Saving…' : 'Update country' }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
