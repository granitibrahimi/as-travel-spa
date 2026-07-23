// CRM operations: tasks, support tickets, and the statistics reports.
// Order note: `/tasks/dashboard` and `/tasks/create` precede `/tasks/:id`.
const TasksIndex = () => import('../../pages/Tasks/Index.vue');
const TasksDashboard = () => import('../../pages/Tasks/Dashboard.vue');
const TasksCreate = () => import('../../pages/Tasks/Create.vue');
const TasksShow = () => import('../../pages/Tasks/Show.vue');
const SupportIndex = () => import('../../pages/Support/Index.vue');
const SupportCreate = () => import('../../pages/Support/Create.vue');
const SupportShow = () => import('../../pages/Support/Show.vue');

export default [
    { path: '/tasks', name: 'tasks.list', component: TasksIndex },
    { path: '/tasks/dashboard', name: 'tasks.dashboard', component: TasksDashboard },
    { path: '/tasks/create', name: 'tasks.create', component: TasksCreate },
    { path: '/tasks/:id', name: 'tasks.show', component: TasksShow },
    { path: '/support', name: 'support.list', component: SupportIndex },
    { path: '/support/create', name: 'support.create', component: SupportCreate },
    { path: '/support/:id', name: 'support.show', component: SupportShow },
];
