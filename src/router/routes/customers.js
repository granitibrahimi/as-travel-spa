// Customers domain: customers and their finance sub-resources (invoices,
// credit-notes, pro-invoices, payments, gift-cards, reconciliations, refunds,
// transaction-links), plus projects and travelers (persons).
// Order note: static `/customers/...` and nested `.../create` paths precede
// `/customers/:id`; `.../:id/edit` precedes `.../:id`.
const CustomersIndex = () => import('../../pages/Customers/Customers/Index.vue');
const CustomersCreate = () => import('../../pages/Customers/Customers/Create.vue');
const CustomersEdit = () => import('../../pages/Customers/Customers/Edit.vue');
const CustomersShow = () => import('../../pages/Customers/Customers/Show.vue');
const CustomersReconcile = () => import('../../pages/Customers/Customers/Reconcile.vue');
const CustomersStatistics = () => import('../../pages/Customers/Customers/Statistics.vue');
const CustomersStatements = () => import('../../pages/Customers/Customers/Statements.vue');
const CustomerInvoiceShow = () => import('../../pages/Customers/Invoices/Show.vue');
const CustomerInvoiceCreate = () => import('../../pages/Customers/Invoices/Create.vue');
const CustomerInvoiceEdit = () => import('../../pages/Customers/Invoices/Edit.vue');
const CustomerInvoiceChangeCustomer = () => import('../../pages/Customers/Invoices/ChangeCustomer.vue');
const CustomerInvoiceChangeAgent = () => import('../../pages/Customers/Invoices/ChangeAgent.vue');
const CustomerInvoiceChangeDate = () => import('../../pages/Customers/Invoices/ChangeDate.vue');
const CustomerInvoiceChangeDueDate = () => import('../../pages/Customers/Invoices/ChangeDueDate.vue');
const CustomerCreditNoteShow = () => import('../../pages/Customers/CreditNotes/Show.vue');
const CustomerCreditNoteCreate = () => import('../../pages/Customers/CreditNotes/Create.vue');
const CustomerCreditNoteEdit = () => import('../../pages/Customers/CreditNotes/Edit.vue');
const CustomerPaymentShow = () => import('../../pages/Customers/Payments/Show.vue');
const CustomerPaymentsIndex = () => import('../../pages/Customers/Payments/Index.vue');
const CustomerPaymentCreate = () => import('../../pages/Customers/Payments/Create.vue');
const CustomerPaymentEdit = () => import('../../pages/Customers/Payments/Edit.vue');
const CustomerGiftCardShow = () => import('../../pages/Customers/GiftCards/Show.vue');
const CustomerGiftCardsIndex = () => import('../../pages/Customers/GiftCards/Index.vue');
const CustomerGiftCardsCreate = () => import('../../pages/Customers/GiftCards/Create.vue');
const CustomerGiftCardsEdit = () => import('../../pages/Customers/GiftCards/Edit.vue');
const CustomerReconciliationsIndex = () => import('../../pages/Customers/Reconciliations/Index.vue');
const CustomerReconciliationShow = () => import('../../pages/Customers/Reconciliations/Show.vue');
const CustomerTransactionLinksIndex = () => import('../../pages/Customers/TransactionLinks/Index.vue');
const CustomerRefundShow = () => import('../../pages/Customers/Refunds/Show.vue');
const InvoicesIndex = () => import('../../pages/Customers/Invoices/Index.vue');
const InvoicesDue = () => import('../../pages/Customers/Invoices/Due.vue');
const CreditNotesIndex = () => import('../../pages/Customers/CreditNotes/Index.vue');
const ProInvoiceCreate = () => import('../../pages/Customers/ProInvoices/Create.vue');
const ProInvoicesIndex = () => import('../../pages/Customers/ProInvoices/Index.vue');
const CustomerProInvoicesShow = () => import('../../pages/Customers/ProInvoices/Show.vue');
const CustomerProInvoicesEdit = () => import('../../pages/Customers/ProInvoices/Edit.vue');
const ProjectsList = () => import('../../pages/Customers/Projects/List.vue');
const ProjectsCreate = () => import('../../pages/Customers/Projects/Create.vue');
const ProjectsShow = () => import('../../pages/Customers/Projects/Show.vue');
const PersonsIndex = () => import('../../pages/Customers/Persons/Index.vue');
const PersonsManage = () => import('../../pages/Customers/Persons/Manage.vue');
const PersonsShow = () => import('../../pages/Customers/Persons/Show.vue');

export default [
    { path: '/customers/customers', name: 'customers.list', component: CustomersIndex },
    { path: '/customers/customers/create', name: 'customers.create', component: CustomersCreate },
    { path: '/customers/invoices', name: 'customerInvoices.list', component: InvoicesIndex },
    { path: '/customers/invoices/due', name: 'customerInvoices.due', component: InvoicesDue },
    { path: '/customers/credit-notes', name: 'customerCreditNotes.list', component: CreditNotesIndex },
    { path: '/customers/pro-invoices', name: 'customerProInvoices.list', component: ProInvoicesIndex },
    { path: '/customers/pro-invoices/:id/edit', name: 'customerProInvoices.edit', component: CustomerProInvoicesEdit },
    { path: '/customers/pro-invoices/:id', name: 'customerProInvoices.show', component: CustomerProInvoicesShow },
    { path: '/customers/:customer/invoices/create', name: 'customerInvoices.create', component: CustomerInvoiceCreate },
    { path: '/customers/:customer/credit-notes/create', name: 'customerCreditNotes.create', component: CustomerCreditNoteCreate },
    { path: '/customers/:customer/pro-invoices/create', name: 'customerProInvoices.create', component: ProInvoiceCreate },
    { path: '/customers/:customer/payments/create', name: 'customerPayments.create', component: CustomerPaymentCreate },
    { path: '/customers/:customer/gift-cards/create', name: 'customerGiftCards.create', component: CustomerGiftCardsCreate },
    { path: '/customers/projects', name: 'customerProjects.list', component: ProjectsList, props: { mode: 'active' } },
    { path: '/customers/projects/finished', name: 'customerProjects.finished', component: ProjectsList, props: { mode: 'finished' } },
    { path: '/customers/projects/create', name: 'customerProjects.create', component: ProjectsCreate },
    { path: '/customers/projects/:id', name: 'customerProjects.show', component: ProjectsShow },
    { path: '/customers/:id/reconcile', name: 'customers.reconcile', component: CustomersReconcile },
    { path: '/customers/:id/statistics', name: 'customers.statistics', component: CustomersStatistics },
    { path: '/customers/:id/statements', name: 'customers.statements', component: CustomersStatements },
    { path: '/customers/:id/edit', name: 'customers.edit', component: CustomersEdit },
    { path: '/customers/customers/:id', name: 'customers.show', component: CustomersShow },
    { path: '/customers/invoices/:id/edit', name: 'customerInvoices.edit', component: CustomerInvoiceEdit },
    { path: '/customers/invoices/:id/change-customer', name: 'customerInvoices.changeCustomer', component: CustomerInvoiceChangeCustomer },
    { path: '/customers/invoices/:id/change-agent', name: 'customerInvoices.changeAgent', component: CustomerInvoiceChangeAgent },
    { path: '/customers/invoices/:id/change-date', name: 'customerInvoices.changeDate', component: CustomerInvoiceChangeDate },
    { path: '/customers/invoices/:id/change-due-date', name: 'customerInvoices.changeDueDate', component: CustomerInvoiceChangeDueDate },
    { path: '/customers/invoices/:id', name: 'customerInvoices.show', component: CustomerInvoiceShow },
    { path: '/customers/credit-notes/:id/edit', name: 'customerCreditNotes.edit', component: CustomerCreditNoteEdit },
    { path: '/customers/credit-notes/:id', name: 'customerCreditNotes.show', component: CustomerCreditNoteShow },
    { path: '/customers/payments', name: 'customerPayments.list', component: CustomerPaymentsIndex },
    { path: '/customers/payments/:id/edit', name: 'customerPayments.edit', component: CustomerPaymentEdit },
    { path: '/customers/payments/:id', name: 'customerPayments.show', component: CustomerPaymentShow },
    { path: '/customers/gift-cards', name: 'customerGiftCards.list', component: CustomerGiftCardsIndex },
    { path: '/customers/reconciliations', name: 'customerReconciliations.list', component: CustomerReconciliationsIndex },
    { path: '/customers/reconciliations/:id', name: 'customerReconciliations.show', component: CustomerReconciliationShow },
    { path: '/customers/transaction-links', name: 'customerTransactionLinks.list', component: CustomerTransactionLinksIndex },
    { path: '/customers/gift-cards/:id/edit', name: 'customerGiftCards.edit', component: CustomerGiftCardsEdit },
    { path: '/customers/gift-cards/:id', name: 'customerGiftCards.show', component: CustomerGiftCardShow },
    { path: '/customers/refunds/:id', name: 'customerRefunds.show', component: CustomerRefundShow },
    { path: '/customers/travelers', name: 'persons.list', component: PersonsIndex },
    { path: '/customers/travelers/create', name: 'persons.create', component: PersonsManage },
    { path: '/customers/travelers/:id/edit', name: 'persons.edit', component: PersonsManage },
    { path: '/customers/travelers/:id', name: 'persons.show', component: PersonsShow },
];
