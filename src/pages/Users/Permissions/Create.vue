<script setup>
import { reactive, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import api from '../../../helpers/api.js';
import { routeUrl } from '../../../helpers/route.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import Textarea from '../../../components/Form/Textarea.vue';
import { useNotificationsStore } from '../../../stores/notifications';

const router = useRouter();
const notifications = useNotificationsStore();

// A permission is a UserPermission row: a dot-namespaced `key` (e.g.
// customers.create), an optional `group` (used only to bucket the list view),
// and an optional human `description`.
const form = reactive({ key: '', group: '', description: '' });
const errors = ref({});
const processing = ref(false);

async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    try {
        await api.post('/users/permissions', form);
        notifications.push({
            type: 'success',
            title: 'Permission created',
            message: form.key,
        });
        router.push(routeUrl('userPermissions.list'));
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
    <AppLayout title="New permission">
        <form class="space-y-6" @submit.prevent="submit">
            <FullWidthBox title="Permission details" :collapsible="false">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <InputText v-model="form.key" label="Key *" placeholder="e.g. customers.create" :error="errors.key" />
                    <InputText v-model="form.group" label="Group" placeholder="e.g. Customers" :error="errors.group" />
                    <div class="md:col-span-2">
                        <Textarea v-model="form.description" label="Description" :rows="3" :error="errors.description" />
                    </div>
                </div>
            </FullWidthBox>

            <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink :to="routeUrl('userPermissions.list')" class="inline-block rounded border border-gray-300 bg-white px-4 py-1.5 text-sm hover:bg-gray-50">
                    Cancel
                </RouterLink>
                <Button type="submit" variant="primary" :disabled="processing">
                    {{ processing ? 'Saving…' : 'Create permission' }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
