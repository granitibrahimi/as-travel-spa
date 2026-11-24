// Packages: package price search (hotel contracts + charter + transfer) and the
// contracts, charters and transfers behind it.
const PackageSearch = () => import('../../pages/Packages/Search.vue');
const HotelContractsIndex = () => import('../../pages/Packages/Contracts/Index.vue');
const HotelContractsShow = () => import('../../pages/Packages/Contracts/Show.vue');
const PackageChartersIndex = () => import('../../pages/Packages/Charters/Index.vue');
const PackageChartersManage = () => import('../../pages/Packages/Charters/Manage.vue');
const PackageTransfersIndex = () => import('../../pages/Packages/Transfers/Index.vue');
const PackageTransfersManage = () => import('../../pages/Packages/Transfers/Manage.vue');

export default [
    { path: '/packages/search', name: 'packages.search', component: PackageSearch },
    { path: '/packages/contracts', name: 'hotelContracts.list', component: HotelContractsIndex },
    { path: '/packages/contracts/:id', name: 'hotelContracts.show', component: HotelContractsShow },
    { path: '/packages/charters', name: 'packageCharters.list', component: PackageChartersIndex },
    { path: '/packages/charters/create', name: 'packageCharters.create', component: PackageChartersManage },
    { path: '/packages/charters/:id/edit', name: 'packageCharters.edit', component: PackageChartersManage },
    { path: '/packages/transfers', name: 'packageTransfers.list', component: PackageTransfersIndex },
    { path: '/packages/transfers/create', name: 'packageTransfers.create', component: PackageTransfersManage },
    { path: '/packages/transfers/:id/edit', name: 'packageTransfers.edit', component: PackageTransfersManage },
];
