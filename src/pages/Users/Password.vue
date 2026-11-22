<script setup>
import { computed, reactive, ref } from 'vue';
import api from '../../helpers/api';
import { useNotificationsStore } from '../../stores/notifications';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import Button from '../../components/Button.vue';
import Alert from '../../components/Alert.vue';
import InputText from '../../components/Form/InputText.vue';

const notifications = useNotificationsStore();

const form = reactive({
    old_password: '',
    password: '',
    password_confirmation: '',
});

const errors = ref({});
const processing = ref(false);

// Client-side guard: the two new-password fields must match before we submit.
const mismatch = computed(
    () => form.password_confirmation.length > 0 && form.password !== form.password_confirmation,
);

async function submit() {
    if (processing.value) {
        return;
    }

    errors.value = {};

    if (form.password !== form.password_confirmation) {
        errors.value = { password_confirmation: 'Passwords do not match.' };
        return;
    }

    processing.value = true;

    try {
        await api.post('/users/users/password', form);

        notifications.push({ type: 'success', message: 'Password updated successfully.' });
        form.old_password = '';
        form.password = '';
        form.password_confirmation = '';
    } catch (error) {
        if (error.response?.status === 422) {
            errors.value = Object.fromEntries(
                Object.entries(error.response.data.errors ?? {}).map(([field, messages]) => [field, messages[0]]),
            );
        } else if (error.response?.status !== 403) {
            notifications.push({ type: 'error', message: 'Password could not be updated. Please try again.' });
        }
    } finally {
        processing.value = false;
    }
}
</script>

<template>
    <AppLayout title="Update password">
        <form class="space-y-6" @submit.prevent="submit">
            <FullWidthBox title="Update password" :collapsible="false">
                <div class="grid grid-cols-1 gap-4 md:max-w-md">
                    <InputText
                        v-model="form.old_password"
                        type="password"
                        label="Current password *"
                        autocomplete="current-password"
                        :error="errors.old_password"
                    />
                    <InputText
                        v-model="form.password"
                        type="password"
                        label="New password *"
                        autocomplete="new-password"
                        :error="errors.password"
                    />
                    <InputText
                        v-model="form.password_confirmation"
                        type="password"
                        label="Confirm new password *"
                        autocomplete="new-password"
                        :error="errors.password_confirmation"
                    />

                    <Alert v-if="mismatch" type="warning">
                        The new passwords do not match.
                    </Alert>

                    <p class="text-xs text-gray-500">The new password must be at least 8 characters.</p>
                </div>
            </FullWidthBox>

            <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <Button type="submit" variant="primary" :loading="processing" :disabled="processing || mismatch">
                    {{ processing ? 'Updating…' : 'Update password' }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>