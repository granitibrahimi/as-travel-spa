<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import api from '../../../helpers/api.js';
import { useAuthStore } from '../../../stores/auth.js';
import AppLayout from '../../../layouts/AppLayout.vue';
import FullWidthBox from '../../../components/FullWidthBox.vue';
import Button from '../../../components/Button.vue';
import ApiPagination from '../../../components/ApiPagination.vue';
import Loader from '../../../components/Loader.vue';

const auth = useAuthStore();
const route = useRoute();
const id = route.params.id;

const credential = ref(null);
const password = ref(null);
const revealing = ref(false);
const corrupted = ref(false);
const logs = ref(null);

async function fetchCredential() {
    const { data } = await api.get(`/online-system-credentials/${id}`);
    credential.value = data.data ?? data;
}

async function reveal() {
    revealing.value = true;
    corrupted.value = false;

    try {
        const { data } = await api.post(`/online-system-credentials/${id}/reveal`);
        password.value = data.password;
        corrupted.value = Boolean(data.corrupted);
    } finally {
        revealing.value = false;
    }
}

async function fetchLogs(page = 1) {
    const { data } = await api.get(`/online-system-credentials/${id}/logs`, { params: { page } });
    logs.value = { data: data.data, ...(data.meta ?? data) };
}

function copyPassword() {
    if (password.value) {
        navigator.clipboard.writeText(password.value);
    }
}

onMounted(async () => {
    await fetchCredential();
    if (auth.can('onlineSystemCredentials.viewAccessLogs')) {
        await fetchLogs();
    }
});
</script>

<template>
    <AppLayout title="Credential">
        <div v-if="! credential"><Loader /></div>

        <div v-else class="space-y-6">
            <FullWidthBox title="Credential" :collapsible="false">
                <table class="w-full border-collapse border border-gray-300 text-sm">
                    <tbody>
                        <tr><th class="border border-gray-300 px-2 py-2 text-left text-gray-500" style="width:180px;">Title</th><td class="border border-gray-300 px-2 py-2">{{ credential.title || '—' }}</td></tr>
                        <tr><th class="border border-gray-300 px-2 py-2 text-left text-gray-500">Supplier</th><td class="border border-gray-300 px-2 py-2">{{ credential.supplier?.name ?? '—' }}</td></tr>
                        <tr><th class="border border-gray-300 px-2 py-2 text-left text-gray-500">URL</th><td class="border border-gray-300 px-2 py-2"><a :href="credential.url" target="_blank" rel="noopener" class="text-red-700 hover:underline">{{ credential.url }}</a></td></tr>
                        <tr><th class="border border-gray-300 px-2 py-2 text-left text-gray-500">Username</th><td class="border border-gray-300 px-2 py-2">{{ credential.username }}</td></tr>
                        <tr><th class="border border-gray-300 px-2 py-2 text-left text-gray-500">Agent code</th><td class="border border-gray-300 px-2 py-2">{{ credential.agent_code || '—' }}</td></tr>
                        <tr>
                            <th class="border border-gray-300 px-2 py-2 text-left text-gray-500">Password</th>
                            <td class="border border-gray-300 px-2 py-2">
                                <template v-if="password !== null">
                                    <span class="font-mono">{{ password || '—' }}</span>
                                    <button v-if="password" type="button" class="ml-2 text-xs text-gray-500 hover:text-gray-800" @click="copyPassword">copy</button>
                                    <span v-if="corrupted" class="ml-2 text-xs text-red-600">Password is corrupted — please update it.</span>
                                </template>
                                <Button v-else-if="auth.can('onlineSystemCredentials.show')" size="sm" :disabled="revealing" @click="reveal">
                                    {{ revealing ? 'Revealing…' : 'Reveal password' }}
                                </Button>
                                <span v-else class="text-gray-400">••••••••</span>
                            </td>
                        </tr>
                        <tr><th class="border border-gray-300 px-2 py-2 text-left text-gray-500">Note</th><td class="border border-gray-300 px-2 py-2 whitespace-pre-line">{{ credential.note || '—' }}</td></tr>
                    </tbody>
                </table>

                <template #footer>
                    <RouterLink to="/online-credentials" class="inline-block rounded border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50">
                        Back to list
                    </RouterLink>
                </template>
            </FullWidthBox>

            <FullWidthBox v-if="auth.can('onlineSystemCredentials.viewAccessLogs')" title="Access log" :collapsible="false">
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                            <tr class="text-left text-xs uppercase text-gray-500">
                                <th class="border border-gray-300 px-2 py-2">User</th>
                                <th class="border border-gray-300 px-2 py-2">Message</th>
                                <th class="border border-gray-300 px-2 py-2" style="width: 160px;">Accessed at</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="! logs"><td colspan="3" class="border border-gray-300 px-2 py-2"><Loader /></td></tr>
                            <tr v-else-if="logs.data.length === 0"><td colspan="3" class="border border-gray-300 px-2 py-4 text-center text-gray-400">No access yet.</td></tr>
                            <tr v-for="(entry, i) in logs?.data ?? []" :key="i" class="hover:bg-gray-50">
                                <td class="border border-gray-300 px-2 py-2">{{ entry.user }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ entry.message || '—' }}</td>
                                <td class="border border-gray-300 px-2 py-2 text-gray-600">{{ entry.at }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <ApiPagination v-if="logs" :paginator="logs" class="mt-4" @page="fetchLogs" />
            </FullWidthBox>
        </div>
    </AppLayout>
</template>
