<script setup>
import { onMounted, reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import api from '../../../helpers/api.js';
import { routeUrl } from '../../../helpers/route.js';
import { castMutation, castResource } from '../../../types/responses.js';
import { useAuthStore } from '../../../stores/auth.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import InputText from '../../../components/Form/InputText.vue';
import Textarea from '../../../components/Form/Textarea.vue';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const id = route.params.id ?? null;
// Clone mode: create a new role that gets a copy of every permission of role `id`.
const isClone = route.name === 'userRoles.clone';
const isEdit = Boolean(id) && ! isClone;
const sourceRole = ref(null);

const form = reactive({
    name: '',
    description: '',
});
const errors = ref({});
const processing = ref(false);

onMounted(async () => {
    if (id) {
        const { data } = await api.get(`/users/roles/${id}`);
        const role = castResource(data);
        sourceRole.value = role;
        Object.assign(form, {
            name: isClone ? `${role.name ?? ''} (copy)` : (role.name ?? ''),
            description: role.description ?? '',
        });
    }
});

async function submit() {
    if (processing.value) {
        return;
    }

    processing.value = true;
    errors.value = {};

    try {
        if (isClone) {
            const { data } = await api.post(`/users/roles/${id}/clone`, form);
            const { id: newId } = castMutation(data);
            router.push(newId && auth.can('roles.permissions')
                ? routeUrl('userRoles.permissions', newId)
                : routeUrl('userRoles.list'));
            return;
        }

        await (isEdit ? api.put(`/users/roles/${id}`, form) : api.post('/users/roles', form));
        router.push(routeUrl('userRoles.list'));
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
    <AppLayout :title="isClone ? 'Clone role' : (isEdit ? 'Edit role' : 'New role')">
        <form class="space-y-6" @submit.prevent="submit">
            <FullWidthBox title="Role details" :collapsible="false">
                <div class="space-y-4">
                    <p v-if="isClone && sourceRole" class="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                        The new role gets a copy of all {{ sourceRole.permissions_count ?? '' }} permissions of
                        <strong>{{ sourceRole.name }}</strong>. {{ sourceRole.name }} keeps its permissions.
                    </p>
                    <InputText v-model="form.name" label="Name *" :error="errors.name" />
                    <Textarea v-model="form.description" label="Description" :error="errors.description" />
                </div>
            </FullWidthBox>

            <footer class="flex items-center justify-end gap-3 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
                <RouterLink :to="routeUrl('userRoles.list')" class="inline-block rounded border border-gray-300 bg-white px-4 py-1.5 text-sm hover:bg-gray-50">
                    Cancel
                </RouterLink>
                <Button type="submit" variant="primary" :disabled="processing">
                    {{ processing ? 'Saving…' : (isClone ? 'Clone role' : (isEdit ? 'Update role' : 'Create role')) }}
                </Button>
            </footer>
        </form>
    </AppLayout>
</template>
