<script setup>
import { onMounted, reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import api, {getDestinationsAutosuggestEndpoint} from '../../../helpers/api.js';
import { routeUrl } from '../../../helpers/route.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import AsyncSelect from '../../../components/Form/AsyncSelect.vue';
import Loader from '../../../components/Loader.vue';

const route = useRoute();
const router = useRouter();
const id = route.params.id ?? null;
const isEdit = Boolean(id);

const form = reactive({ name: '', parent_destination_id: null });
const parentInitial = ref(null);
const errors = ref({});
const processing = ref(false);
// AsyncSelect reads `initial-option` only at mount, so hold the form until the
// edit hydration below has populated `parentInitial` (create mode is ready now).
const loaded = ref(!isEdit);

onMounted(async () => {
    if (!isEdit) {
        return;
    }

    try {
        const { data } = await api.get(`/destinations/${id}`);
        const destination = data.data;
        form.name = destination.name;
        form.parent_destination_id = destination.parent_destination_id ?? null;
        parentInitial.value = destination.parent_destination ?? null;
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

    try {
        await (isEdit ? api.put(`/destinations/${id}`, form) : api.post('/destinations', form));
        router.push(routeUrl('destinations.list'));
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
    <AppLayout :title="isEdit ? 'Edit destination' : 'New destination'">
        <Loader v-if="! loaded" />

        <form v-else class="space-y-6" @submit.prevent="submit">
            <FullWidthBox title="Destination details" :collapsible="false">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <InputText v-model="form.name" label="Name *" placeholder="e.g. Male" :error="errors.name" />
                    <AsyncSelect
                        v-model="form.parent_destination_id"
                        :url="getDestinationsAutosuggestEndpoint()"
                        :initial-option="parentInitial"
                        label="Parent destination *"
                        placeholder="Search parent destination…"
                        :error="errors.parent_destination_id"
                    />
                </div>
            </FullWidthBox>

            <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink :to="routeUrl('destinations.list')" class="inline-block rounded border border-gray-300 bg-white px-4 py-1.5 text-sm hover:bg-gray-50">
                    Cancel
                </RouterLink>
                <Button type="submit" variant="primary" :disabled="processing">
                    {{ processing ? 'Saving…' : (isEdit ? 'Update destination' : 'Create destination') }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
