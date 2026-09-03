// Warehouse picking — a local, browser-only tool: draw a 2D shelf map and turn
// an order's shelf numbers into the shortest shelf-by-shelf pick route. No
// platform API involved (see src/stores/warehouse.js).
const WarehouseMapEditor = () => import('../../pages/Warehouse/MapEditor.vue');
const WarehousePickRoute = () => import('../../pages/Warehouse/PickRoute.vue');

export default [
    { path: '/warehouse/map', name: 'warehouse.map', component: WarehouseMapEditor },
    { path: '/warehouse/pick', name: 'warehouse.pick', component: WarehousePickRoute },
];
