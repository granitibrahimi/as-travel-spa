const SuppliersIndex = () => import('../../pages/Suppliers/Suppliers/Index.vue');
const SuppliersManage = () => import('../../pages/Suppliers/Suppliers/Manage.vue');
const SuppliersShow = () => import('../../pages/Suppliers/Suppliers/Show.vue');
const SuppliersReconcile = () => import('../../pages/Suppliers/Suppliers/Reconcile.vue');
const SupplierBillsIndex = () => import('../../pages/Suppliers/Bills/Index.vue');
const SupplierBillShow = () => import('../../pages/Suppliers/Bills/Show.vue');
const SupplierCreditNoteShow = () => import('../../pages/Suppliers/CreditNotes/Show.vue');
const SuppliersStatements = () => import('../../pages/Suppliers/Suppliers/Statements.vue');
const SupplierBillsCreate = () => import('../../pages/Suppliers/Bills/Create.vue');
const SupplierCreditNotesIndex = () => import('../../pages/Suppliers/CreditNotes/Index.vue');
const SupplierCreditNotesManage = () => import('../../pages/Suppliers/CreditNotes/Manage.vue');
const SupplierDepositsIndex = () => import('../../pages/Suppliers/Deposits/Index.vue');
const SupplierDepositsCreate = () => import('../../pages/Suppliers/Deposits/Create.vue');
const SupplierDepositsEdit = () => import('../../pages/Suppliers/Deposits/Edit.vue');
const SupplierDepositsShow = () => import('../../pages/Suppliers/Deposits/Show.vue');
const SupplierPaymentsIndex = () => import('../../pages/Suppliers/Payments/Index.vue');
const SupplierPaymentsCreate = () => import('../../pages/Suppliers/Payments/Create.vue');
const SupplierPaymentsEdit = () => import('../../pages/Suppliers/Payments/Edit.vue');
const SupplierPaymentsShow = () => import('../../pages/Suppliers/Payments/Show.vue');
const SupplierGiftCardsIndex = () => import('../../pages/Suppliers/GiftCards/Index.vue');
const SupplierGiftCardsCreate = () => import('../../pages/Suppliers/GiftCards/Create.vue');
const SupplierGiftCardsEdit = () => import('../../pages/Suppliers/GiftCards/Edit.vue');
const SupplierGiftCardsShow = () => import('../../pages/Suppliers/GiftCards/Show.vue');
const SupplierRefundsIndex = () => import('../../pages/Suppliers/Refunds/Index.vue');
const SupplierRefundsCreate = () => import('../../pages/Suppliers/Refunds/Create.vue');
const SupplierRefundsEdit = () => import('../../pages/Suppliers/Refunds/Edit.vue');
const SupplierRefundsShow = () => import('../../pages/Suppliers/Refunds/Show.vue');

export default [
    { path: '/suppliers', name: 'suppliers.list', component: SuppliersIndex },
    { path: '/suppliers/create', name: 'suppliers.create', component: SuppliersManage },
    { path: '/suppliers/:id', name: 'suppliers.show', component: SuppliersShow },
    { path: '/suppliers/:id/edit', name: 'suppliers.edit', component: SuppliersManage },
    { path: '/suppliers/:id/statements', name: 'suppliers.statements', component: SuppliersStatements },
    { path: '/suppliers/:id/reconcile', name: 'suppliers.reconcile', component: SuppliersReconcile },

    // Bills
    { path: '/suppliers/bills', name: 'supplierBills.list', component: SupplierBillsIndex },
    { path: '/suppliers/bills/:supplierId/create', name: 'supplierBills.create', component: SupplierBillsCreate },
    { path: '/suppliers/bills/:id', name: 'supplierBills.show', component: SupplierBillShow },
    { path: '/suppliers/bills/:id/edit', name: 'supplierBills.edit', component: SupplierCreditNoteShow },

    // CreditNotes
    { path: '/suppliers/credit-notes', name: 'supplierCreditNotes.list', component: SupplierCreditNotesIndex },
    { path: '/suppliers/credit-notes/:id', name: 'supplierCreditNotes.show', component: SupplierCreditNoteShow },
    { path: '/suppliers/credit-notes/:supplierId/create', name: 'supplierCreditNotes.create', component: SupplierCreditNotesManage },
    { path: '/suppliers/credit-notes/:id/edit', name: 'supplierCreditNotes.edit', component: SupplierCreditNoteShow },

    // Deposits
    { path: '/suppliers/deposits', name: 'supplierDeposits.list', component: SupplierDepositsIndex },
    { path: '/suppliers/deposits/:supplierId/create', name: 'supplierDeposits.create', component: SupplierDepositsCreate },
    { path: '/suppliers/deposits/:id/edit', name: 'supplierDeposits.edit', component: SupplierDepositsEdit },
    { path: '/suppliers/deposits/:id', name: 'supplierDeposits.show', component: SupplierDepositsShow },


    // Payments
    { path: '/suppliers/payments', name: 'supplierPayments.list', component: SupplierPaymentsIndex },
    { path: '/suppliers/payments/:supplierId/create', name: 'supplierPayments.create', component: SupplierPaymentsCreate },
    { path: '/suppliers/payments/:id/edit', name: 'supplierPayments.edit', component: SupplierPaymentsEdit },
    { path: '/suppliers/payments/:id', name: 'supplierPayments.show', component: SupplierPaymentsShow },

    // GiftCards
    { path: '/suppliers/gift-cards', name: 'supplierGiftCards.list', component: SupplierGiftCardsIndex },
    { path: '/suppliers/gift-cards/:supplierId/create', name: 'supplierGiftCards.create', component: SupplierGiftCardsCreate },
    { path: '/suppliers/gift-cards/:id/edit', name: 'supplierGiftCards.edit', component: SupplierGiftCardsEdit },
    { path: '/supplies/gift-cards/:id', name: 'supplierGiftCards.show', component: SupplierGiftCardsShow },

    // Refunds
    { path: '/suppliers/refunds', name: 'supplierRefunds.list', component: SupplierRefundsIndex },
    { path: '/suppliers/refunds/:supplierId/create', name: 'supplierRefunds.create', component: SupplierRefundsCreate },
    { path: '/suppliers/refunds/:id/edit', name: 'supplierRefunds.edit', component: SupplierRefundsEdit },
    { path: '/suppliers/refunds/:id', name: 'supplierRefunds.show', component: SupplierRefundsShow },
];
