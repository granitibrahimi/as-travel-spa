// Suppliers domain: suppliers, their sub-resources (bills, credit-notes,
// deposits, payments, gift-cards, refunds) and online system credentials.
// Order note: nested `.../create` and static paths precede `/suppliers/:id`.
const SuppliersIndex = () => import('../../pages/Suppliers/Suppliers/Index.vue');
const SuppliersManage = () => import('../../pages/Suppliers/Suppliers/Manage.vue');
const SuppliersShow = () => import('../../pages/Suppliers/Suppliers/Show.vue');
const SuppliersReconcile = () => import('../../pages/Suppliers/Suppliers/Reconcile.vue');
const SupplierBillShow = () => import('../../pages/Suppliers/Bills/Show.vue');
const SupplierCreditNoteShow = () => import('../../pages/Suppliers/CreditNotes/Show.vue');
const SuppliersStatements = () => import('../../pages/Suppliers/Suppliers/Statements.vue');
const SuppliersCredentials = () => import('../../pages/Suppliers/Suppliers/Credentials.vue');
const SupplierBillsManage = () => import('../../pages/Suppliers/Bills/Manage.vue');
const SupplierCreditNotesManage = () => import('../../pages/Suppliers/CreditNotes/Manage.vue');
const SupplierDepositsIndex = () => import('../../pages/Suppliers/Deposits/Index.vue');
const SupplierDepositsManage = () => import('../../pages/Suppliers/Deposits/Manage.vue');
const SupplierDepositsShow = () => import('../../pages/Suppliers/Deposits/Show.vue');
const SupplierPaymentsIndex = () => import('../../pages/Suppliers/Payments/Index.vue');
const SupplierPaymentsManage = () => import('../../pages/Suppliers/Payments/Manage.vue');
const SupplierPaymentsShow = () => import('../../pages/Suppliers/Payments/Show.vue');
const SupplierGiftCardsIndex = () => import('../../pages/Suppliers/GiftCards/Index.vue');
const SupplierGiftCardsManage = () => import('../../pages/Suppliers/GiftCards/Manage.vue');
const SupplierGiftCardsShow = () => import('../../pages/Suppliers/GiftCards/Show.vue');
const SupplierRefundsIndex = () => import('../../pages/Suppliers/Refunds/Index.vue');
const SupplierRefundsManage = () => import('../../pages/Suppliers/Refunds/Manage.vue');
const SupplierRefundsShow = () => import('../../pages/Suppliers/Refunds/Show.vue');
const OnlineCredentialsIndex = () => import('../../pages/Base/OnlineSystemCredentials/Index.vue');
const OnlineCredentialsShow = () => import('../../pages/Base/OnlineSystemCredentials/Show.vue');

export default [
    { path: '/suppliers', name: 'suppliers.list', component: SuppliersIndex },
    { path: '/suppliers/create', name: 'suppliers.create', component: SuppliersManage },
    { path: '/suppliers/:supplierId/bills/create', name: 'supplierBills.create', component: SupplierBillsManage },
    { path: '/suppliers/:supplierId/credit-notes/create', name: 'supplierCreditNotes.create', component: SupplierCreditNotesManage },
    { path: '/suppliers/:supplierId/deposits/create', name: 'supplierDeposits.create', component: SupplierDepositsManage },
    { path: '/suppliers/:supplierId/payments/create', name: 'supplierPayments.create', component: SupplierPaymentsManage },
    { path: '/suppliers/:supplierId/gift-cards/create', name: 'supplierGiftCards.create', component: SupplierGiftCardsManage },
    { path: '/suppliers/:supplierId/refunds/create', name: 'supplierRefunds.create', component: SupplierRefundsManage },
    { path: '/suppliers/:id/statements', name: 'suppliers.statements', component: SuppliersStatements },
    { path: '/suppliers/:id/credentials', name: 'suppliers.credentials', component: SuppliersCredentials },
    { path: '/suppliers/:id/edit', name: 'suppliers.edit', component: SuppliersManage },
    { path: '/suppliers/:id/reconcile', name: 'suppliers.reconcile', component: SuppliersReconcile },
    { path: '/suppliers/:id', name: 'suppliers.show', component: SuppliersShow },
    { path: '/supplier-bills/:id', name: 'supplierBills.show', component: SupplierBillShow },
    { path: '/supplier-credit-notes/:id', name: 'supplierCreditNotes.show', component: SupplierCreditNoteShow },
    { path: '/supplier-deposits', name: 'supplierDeposits.list', component: SupplierDepositsIndex },
    { path: '/supplier-deposits/:id/edit', name: 'supplierDeposits.edit', component: SupplierDepositsManage },
    { path: '/supplier-deposits/:id', name: 'supplierDeposits.show', component: SupplierDepositsShow },
    { path: '/supplier-payments', name: 'supplierPayments.list', component: SupplierPaymentsIndex },
    { path: '/supplier-payments/:id/edit', name: 'supplierPayments.edit', component: SupplierPaymentsManage },
    { path: '/supplier-payments/:id', name: 'supplierPayments.show', component: SupplierPaymentsShow },
    { path: '/supplier-gift-cards', name: 'supplierGiftCards.list', component: SupplierGiftCardsIndex },
    { path: '/supplier-gift-cards/:id/edit', name: 'supplierGiftCards.edit', component: SupplierGiftCardsManage },
    { path: '/supplier-gift-cards/:id', name: 'supplierGiftCards.show', component: SupplierGiftCardsShow },
    { path: '/supplier-refunds', name: 'supplierRefunds.list', component: SupplierRefundsIndex },
    { path: '/supplier-refunds/:id/edit', name: 'supplierRefunds.edit', component: SupplierRefundsManage },
    { path: '/supplier-refunds/:id', name: 'supplierRefunds.show', component: SupplierRefundsShow },
    { path: '/online-credentials', name: 'onlineCredentials.list', component: OnlineCredentialsIndex },
    { path: '/online-credentials/:id', name: 'onlineCredentials.show', component: OnlineCredentialsShow },
];
