<script setup>
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import AppLayout from '../../layouts/AppLayout.vue';
import FullWidthBox from '../../components/FullWidthBox.vue';
import Button from '../../components/Button.vue';
import WarehouseGrid from '../../components/WarehouseGrid.vue';
import { useWarehouseStore } from '../../stores/warehouse.js';
import { parseShelfRequest, planRoute } from '../../helpers/warehouse.js';

const store = useWarehouseStore();

const orderText = ref('');
const result = ref(null);
const copied = ref(false);

const requests = computed(() => parseShelfRequest(orderText.value));
const highlightNumbers = computed(() => requests.value.map((r) => r.number));

function build() {
    copied.value = false;
    result.value = planRoute(store.map, parseShelfRequest(orderText.value));
}

function reset() {
    orderText.value = '';
    result.value = null;
    copied.value = false;
}

const pickListText = computed(() => {
    if (!result.value?.ok) {
        return '';
    }

    const lines = result.value.stops.map(
        (stop) => `${stop.seq}. Shelf ${stop.number}${stop.qty > 1 ? ` ×${stop.qty}` : ''}  (+${stop.steps} steps)`,
    );

    lines.push(`↩ Return to entrance  (+${result.value.returnSteps} steps)`);
    lines.push(`Total: ${result.value.stops.length} stops, ${result.value.totalSteps} steps (round trip)`);
    return lines.join('\n');
});

async function copyPickList() {
    try {
        await navigator.clipboard.writeText(pickListText.value);
        copied.value = true;
    } catch {
        copied.value = false;
    }
}
</script>

<template>
    <AppLayout title="Build pick route" fluid>
        <div class="grid gap-6 lg:grid-cols-[380px_1fr]">
            <FullWidthBox title="Order" :collapsible="false">
                <template #actions>
                    <RouterLink to="/warehouse/map" class="text-sm text-red-600 hover:underline">Edit map</RouterLink>
                </template>

                <p class="mb-2 text-sm text-gray-500">
                    Paste the shelf numbers for this order — one per line (or comma separated).
                    Add a quantity with <code class="rounded bg-gray-100 px-1">A-12 x3</code>.
                </p>

                <textarea
                    v-model="orderText"
                    rows="12"
                    class="w-full rounded border border-gray-300 p-2 font-mono text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    placeholder="A-01&#10;A-05 x2&#10;B-12&#10;C-03"
                />

                <div class="mt-2 flex items-center gap-2">
                    <Button type="button" variant="primary" @click="build">Build route</Button>
                    <Button type="button" @click="reset">Clear</Button>
                    <span class="text-xs text-gray-400">{{ requests.length }} shelves</span>
                </div>

                <p v-if="!store.map.entrance" class="mt-3 rounded bg-amber-50 px-3 py-2 text-sm text-amber-700">
                    No entrance is set on the map. Open the map editor and place one first.
                </p>
                <p v-if="!store.shelfCount" class="mt-3 rounded bg-amber-50 px-3 py-2 text-sm text-amber-700">
                    The map has no shelves yet.
                </p>
            </FullWidthBox>

            <FullWidthBox title="Route" :collapsible="false">
                <div v-if="!result" class="py-12 text-center text-sm text-gray-400">
                    Enter an order and press <strong>Build route</strong>.
                </div>

                <div v-else-if="result.error" class="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
                    {{ result.error }}
                </div>

                <template v-else>
                    <div class="mb-3 flex flex-wrap items-center gap-4 text-sm">
                        <span class="font-semibold">{{ result.stops.length }} stops</span>
                        <span class="text-gray-500">
                            {{ result.totalSteps }} steps round trip
                            <span class="text-gray-400">(incl. {{ result.returnSteps }} back to entrance)</span>
                        </span>
                        <Button type="button" size="sm" @click="copyPickList">Copy pick list</Button>
                        <span v-if="copied" class="text-xs text-green-600">Copied</span>
                    </div>

                    <div
                        v-if="result.missing.length"
                        class="mb-2 rounded bg-amber-50 px-3 py-2 text-sm text-amber-700"
                    >
                        Not on the map: <strong>{{ result.missing.join(', ') }}</strong>
                    </div>
                    <div
                        v-if="result.unreachable.length"
                        class="mb-3 rounded bg-amber-50 px-3 py-2 text-sm text-amber-700"
                    >
                        Walled off from the entrance: <strong>{{ result.unreachable.join(', ') }}</strong>
                    </div>

                    <div class="grid gap-4 xl:grid-cols-[300px_1fr]">
                        <div class="overflow-x-auto">
                            <table class="w-full border-collapse border border-gray-300 text-sm">
                                <thead>
                                    <tr class="text-left text-xs uppercase text-gray-500">
                                        <th class="border border-gray-300 px-2 py-1.5 text-center" style="width: 40px;">#</th>
                                        <th class="border border-gray-300 px-2 py-1.5">Shelf</th>
                                        <th class="border border-gray-300 px-2 py-1.5 text-center" style="width: 50px;">Qty</th>
                                        <th class="border border-gray-300 px-2 py-1.5 text-right" style="width: 70px;">Steps</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="stop in result.stops" :key="stop.seq" class="hover:bg-gray-50">
                                        <td class="border border-gray-300 px-2 py-1.5 text-center font-semibold">{{ stop.seq }}</td>
                                        <td class="border border-gray-300 px-2 py-1.5 font-medium">{{ stop.number }}</td>
                                        <td class="border border-gray-300 px-2 py-1.5 text-center">{{ stop.qty }}</td>
                                        <td class="border border-gray-300 px-2 py-1.5 text-right tabular-nums">
                                            +{{ stop.steps }}
                                            <span class="block text-xs text-gray-400">{{ stop.cumulativeSteps }}</span>
                                        </td>
                                    </tr>
                                    <tr class="bg-gray-50 text-gray-600">
                                        <td class="border border-gray-300 px-2 py-1.5 text-center">↩</td>
                                        <td class="border border-gray-300 px-2 py-1.5 italic" colspan="2">Return to entrance</td>
                                        <td class="border border-gray-300 px-2 py-1.5 text-right tabular-nums">
                                            +{{ result.returnSteps }}
                                            <span class="block text-xs text-gray-400">{{ result.totalSteps }}</span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <WarehouseGrid
                            :map="store.map"
                            :path="result.path"
                            :stops="result.stops"
                            :highlight="highlightNumbers"
                        />
                    </div>
                </template>
            </FullWidthBox>
        </div>
    </AppLayout>
</template>
