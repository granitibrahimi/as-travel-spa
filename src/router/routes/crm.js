// CRM operations: tasks, support tickets, and the statistics reports.
// Order note: `/tasks/dashboard` and `/tasks/create` precede `/tasks/:id`.
const TasksIndex = () => import('../../pages/Tasks/Index.vue');
const TasksDashboard = () => import('../../pages/Tasks/Dashboard.vue');
const TasksCreate = () => import('../../pages/Tasks/Create.vue');
const TasksShow = () => import('../../pages/Tasks/Show.vue');
const SupportIndex = () => import('../../pages/Support/Index.vue');
const SupportCreate = () => import('../../pages/Support/Create.vue');
const SupportShow = () => import('../../pages/Support/Show.vue');
const WhatsappIndex = () => import('../../pages/Whatsapp/Index.vue');

export default [
    { path: '/whatsapp', name: 'whatsappConversations.list', component: WhatsappIndex },
    { path: '/tasks', name: 'tasks.list', component: TasksIndex },
    { path: '/tasks/dashboard', name: 'tasks.dashboard', component: TasksDashboard },
    { path: '/tasks/create', name: 'tasks.create', component: TasksCreate },
    { path: '/tasks/:id', name: 'tasks.show', component: TasksShow },
    { path: '/support', name: 'supportTickets.list', component: SupportIndex },
    { path: '/support/create', name: 'supportTickets.create', component: SupportCreate },
    { path: '/support/:id', name: 'supportTickets.show', component: SupportShow },
];
