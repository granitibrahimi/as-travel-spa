// CRM operations: tasks, simple requests, support tickets, and the statistics reports.
// Order note: `/tasks/dashboard` and `/tasks/create` precede `/tasks/:id` (same for `/requests`).
const TasksIndex = () => import('../../pages/Tasks/Index.vue');
const TasksDashboard = () => import('../../pages/Tasks/Dashboard.vue');
const TasksCreate = () => import('../../pages/Tasks/Create.vue');
const TasksShow = () => import('../../pages/Tasks/Show.vue');
const TaskOfferManage = () => import('../../pages/Tasks/OfferManage.vue');
const TaskOfferShow = () => import('../../pages/Tasks/OfferShow.vue');
const AiChatAssistant = () => import('../../pages/AiChat/Assistant.vue');
const AiChatBotInstructions = () => import('../../pages/AiChat/BotInstructions.vue');
const AiChatConversations = () => import('../../pages/AiChat/Conversations.vue');
const AiChatInstructions = () => import('../../pages/AiChat/Instructions.vue');
const SupportIndex = () => import('../../pages/Support/Index.vue');
const SupportCreate = () => import('../../pages/Support/Create.vue');
const SupportShow = () => import('../../pages/Support/Show.vue');
const RequestsIndex = () => import('../../pages/Requests/Index.vue');
const RequestsDashboard = () => import('../../pages/Requests/Dashboard.vue');
const RequestsCreate = () => import('../../pages/Requests/Create.vue');
const RequestsShow = () => import('../../pages/Requests/Show.vue');
const WhatsappIndex = () => import('../../pages/Whatsapp/Index.vue');

export default [
    { path: '/whatsapp', name: 'whatsappConversations.list', component: WhatsappIndex },
    { path: '/tasks', name: 'tasks.list', component: TasksIndex },
    { path: '/tasks/dashboard', name: 'tasks.dashboard', component: TasksDashboard },
    { path: '/tasks/create', name: 'tasks.create', component: TasksCreate },
    { path: '/tasks/:id', name: 'tasks.show', component: TasksShow },
    { path: '/tasks/:taskId/offer-requests/:offerRequestId/offers/create', name: 'taskRequestOffers.create', component: TaskOfferManage },
    { path: '/tasks/:taskId/offer-requests/:offerRequestId/offers/:offerId/edit', name: 'taskRequestOffers.edit', component: TaskOfferManage },
    { path: '/tasks/:taskId/offer-requests/:offerRequestId/offers/:offerId', name: 'taskRequestOffers.show', component: TaskOfferShow },
    { path: '/requests', name: 'simpleTasks.list', component: RequestsIndex },
    { path: '/requests/dashboard', name: 'simpleTasks.dashboard', component: RequestsDashboard },
    { path: '/requests/create', name: 'simpleTasks.create', component: RequestsCreate },
    { path: '/requests/:id', name: 'simpleTasks.show', component: RequestsShow },
    { path: '/assistant', name: 'aiChat.assistant', component: AiChatAssistant },
    { path: '/ai-chat/conversations', name: 'aiChat.conversations', component: AiChatConversations },
    { path: '/ai-chat/bot-instructions', name: 'aiChat.botInstructions', component: AiChatBotInstructions },
    { path: '/ai-chat/instructions', name: 'aiChat.instructions', component: AiChatInstructions },
    { path: '/support', name: 'supportTickets.list', component: SupportIndex },
    { path: '/support/create', name: 'supportTickets.create', component: SupportCreate },
    { path: '/support/:id', name: 'supportTickets.show', component: SupportShow },
];
