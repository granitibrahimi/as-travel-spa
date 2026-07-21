const UsersIndex = () => import('../../pages/Users/Users/Index.vue');
const UsersManage = () => import('../../pages/Users/Users/Manage.vue');
const UsersShow = () => import('../../pages/Users/Users/Show.vue');
const UsersActivityLogs = () => import('../../pages/Users/Users/ActivityLogs.vue');
const UsersAuditLogShow = () => import('../../pages/Users/Users/AuditLogs/Show.vue');
const UsersPassword = () => import('../../pages/Users/Password.vue');
const PermissionsIndex = () => import('../../pages/Users/Permissions/Index.vue');
const PermissionsCreate = () => import('../../pages/Users/Permissions/Create.vue');
const PermissionsShow = () => import('../../pages/Users/Permissions/Show.vue');
const PermissionsEdit = () => import('../../pages/Users/Permissions/Edit.vue');
const RolesIndex = () => import('../../pages/Users/Roles/Index.vue');
const RolesManage = () => import('../../pages/Users/Roles/Manage.vue');
const RolesPermissions = () => import('../../pages/Users/Roles/Permissions.vue');
const NotificationsIndex = () => import('../../pages/Users/Notifications/Index.vue');
const NotificationsShow = () => import('../../pages/Users/Notifications/Show.vue');

export default [
    // Permissions
    { path: '/users/permissions/create', name: 'userPermissions.create', component: PermissionsCreate },
    { path: '/users/permissions/:id', name: 'userPermissions.show', component: PermissionsShow },
    { path: '/users/permissions/:id/edit', name: 'userPermissions.edit', component: PermissionsEdit },
    { path: '/users/permissions', name: 'userPermissions.list', component: PermissionsIndex },

    // Roles
    { path: '/users/roles', name: 'userRoles.list', component: RolesIndex },
    { path: '/users/roles/create', name: 'userRoles.create', component: RolesManage },
    { path: '/users/roles/:id/edit', name: 'userRoles.edit', component: RolesManage },
    { path: '/users/roles/:id/permissions', name: 'userRoles.permissions', component: RolesPermissions },

    // Notifications
    { path: '/users/notifications', name: 'notifications.list', component: NotificationsIndex },
    { path: '/users/notifications/:id', name: 'notifications.show', component: NotificationsShow },

    // Activity Logs
    { path: '/users/activity-logs', name: 'users.activityLogs', component: UsersActivityLogs },
    { path: '/users/activity-logs/:id', name: 'users.activityLogAudit', component: UsersAuditLogShow },

    // Users
    { path: '/users/users', name: 'users.list', component: UsersIndex },
    { path: '/users/users/create', name: 'users.create', component: UsersManage },
    { path: '/users/users/:id/edit', name: 'users.edit', component: UsersManage },
    { path: '/users/users/:id', name: 'users.show', component: UsersShow },
    { path: '/users/password', name: 'users.editPassword', component: UsersPassword },
];
