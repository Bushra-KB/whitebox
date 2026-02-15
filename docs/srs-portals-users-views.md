# WhiteBox SRS: Portals, Users, Views, and Features

## 1. Purpose
Define the Software Requirements Specification (SRS) for WhiteBox user portals, user classes, views, and feature scope based on the current product implementation.

## 2. Scope
This SRS covers:
- Public web experience and intake flow
- Portal entry/routing
- Reporter Portal
- Organisation Portal
- System Admin Portal
- Role/access model and core integrations (Supabase DB/RPC/Edge Functions)

This SRS does not cover:
- Backend schema design in full detail
- Deployment runbooks
- Visual design system specs

## 3. Product Context
WhiteBox is a grievance and risk management platform with:
- Public intake/reporting flow (`/report/new`)
- Authenticated multi-portal workspace (`/portal/*`)
- Supabase-backed storage, auth, RLS-aware reads/writes, RPCs, and edge functions

## 4. User Classes and Roles

### 4.1 User Classes
1. Public Visitor
2. Reporter (authenticated)
3. Anonymous Reporter (generated/anonymous credentials)
4. Organisation Owner
5. Organisation Team Member (role via `organization_users` + `roles`)
6. System Administrator

### 4.2 User Type Values Used in Code
- `organization_owner`
- `independent`
- `anonymous`
- `administrator`
- Also mapped in portal router: `system_admin`, `admin`

## 5. Access and Routing Requirements

### 5.1 Authentication Gate
- Any route under `/portal/*` requires active session.
- If no session, redirect to `/login?redirectTo=<path>`.

### 5.2 Portal Home Router (`/portal`)
Role-to-destination mapping:
- `organization_owner` -> `/portal/org`
- `independent` -> `/portal/reporter`
- `anonymous` -> `/portal/reporter`
- `system_admin` -> `/portal/admin`
- `admin` -> `/portal/admin`
- `administrator` -> `/portal/admin`
- unknown/null -> choose-workspace screen

### 5.3 Organisation Approval Gate
If org account is not approved/active, redirect org users to `/portal/org/pending`.

### 5.4 Admin API Authorization
`admin-portal` edge function currently allows only `user_profiles.user_type = 'administrator'`.

Requirement:
- All admin portal data mutations/reads via `adminInvoke` must be rejected for non-admin users.

## 6. Portal and View Inventory

## 6.1 Public Views

| Route | View | Primary Features |
|---|---|---|
| `/` | Landing | Product intro, value prop, navigation |
| `/login` | Login | Email/password sign-in, redirect back to intended portal route |
| `/report/new` | Create Report | Multi-step intake form, anonymous mode, dynamic intake config via RPC, localisation, file upload, feedback capture |
| `/org/signup` | Organisation Signup | Register org + org owner, create ownership/role links, pending approval flow |
| `/guides` | Guides | Static support content |
| `/policies` | Policies | Static policy content |
| `/contact` | Contact | Static contact/support page |

## 6.2 Reporter Portal Views

| Route | View | Primary Features |
|---|---|---|
| `/portal/reporter` | Dashboard | Reporter KPI cards, recent updates/comments |
| `/portal/reporter/reports` | Reports | Tabbed list (Created/Filter/Active/Spam/Archived), report details modal, attachments, actions, status activity timeline |
| `/portal/reporter/account/profile` | Profile | Manage profile (non-anonymous), country selector, readonly email |
| `/portal/reporter/account/security` | Security | Change password |
| `/portal/reporter/account/notifications` | Notifications | Notification preferences in `user_profiles.notification_preferences` |
| `/portal/reporter/account/consent` | Consent & Policy | Consent history from `user_policy_consents` + policy metadata |

## 6.3 Organisation Portal Views

| Route | View | Primary Features |
|---|---|---|
| `/portal/org` | Dashboard | Org KPIs, pipeline summary, urgent activity |
| `/portal/org/reports` | Reports Workbench | Full report operations, status transitions, filter decisions, comments, actions, risk mapping, detail tabs |
| `/portal/org/actions` | Actions | Create/update remediation actions, due dates, status management |
| `/portal/org/issues` | Issues | Cluster/aggregate issues by risk categories/subcategories |
| `/portal/org/account/profile` | Account Profile | Update profile + org-user department/job title |
| `/portal/org/account/security` | Account Security | Change password, 2FA placeholder |
| `/portal/org/account/notifications` | Notifications | Org notification settings in `organization_notification_settings` |
| `/portal/org/account/consent` | Consent | Policy consent history with platform/org tabs |
| `/portal/org/organisations/profile` | Organisation Profile | Core org metadata, sectors/countries, logo, contact info |
| `/portal/org/organisations/worksites` | Worksites | CRUD worksites |
| `/portal/org/organisations/policies` | Org Policies | Policy CRUD + org automation toggles |
| `/portal/org/organisations/departments` | Departments | CRUD departments, members, scoped routing criteria |
| `/portal/org/organisations/triage-workflows` | Triage Workflows | Workflow CRUD, preprocessing config, status/action config, deadline config, assignment criteria |
| `/portal/org/organisations/users` | Users | Invite existing users, assign roles, activate/deactivate |
| `/portal/org/organisations/add-ons` | Add-ons | Enable/disable paid add-ons persisted in `organisations.contact_info` |
| `/portal/org/organisations/relationships` | Relationships | Manage supply-chain relationships |
| `/portal/org/organisations/deadlines` | Deadlines | Configure SLA deadlines per stage |
| `/portal/org/pending` | Pending Access | Pending/blocked/removed organisation access messaging |

## 6.4 System Admin Portal Views

| Route | View | Primary Features |
|---|---|---|
| `/portal/admin` | Dashboard | Platform metrics (reports, queues, archive, spam) |
| `/portal/admin/users` | Users | List/filter users, change user type, activate/deactivate |
| `/portal/admin/reports` | Reports | Global report management, status updates, filter decisions, details |
| `/portal/admin/organisations` | Organisations | List/update orgs, approve/block/unblock/remove, manage org types, org details |
| `/portal/admin/risks` | Risks | Risk catalog CRUD/toggle, category/subcategory management |
| `/portal/admin/contracts` | Contracts | Relationship contract visibility |
| `/portal/admin/relationships` | Supply Chains | Relationship CRUD/toggle |
| `/portal/admin/archive` | Archive | Archived reports review + reopen path |
| `/portal/admin/spam` | Spam | Spam queue review and clear spam flag |
| `/portal/admin/policies` | Policies | Global/organization policy CRUD + activate/deactivate |
| `/portal/admin/intake-form` | Intake Form Builder | No-code intake config management: versions/configs, publish/unpublish/remove, fields, conditions, translations |
| `/portal/admin/security` | Security | Platform security settings (stored in `platform_settings`) |
| `/portal/admin/audio` | Audio | Audio/accessibility settings (stored in `platform_settings`) |
| `/portal/admin/languages` | Countries & Languages | Language CRUD, country CRUD, country-language mapping CRUD |
| `/portal/admin/consent-control` | Consent Control | Consent stats + policy visibility |
| `/portal/admin/feedbacks` | Feedbacks | Feedback analytics/listing from `feedbacks` |
| `/portal/admin/settings` | Settings | Admin profile updates + platform settings + AI prompt settings |

## 7. Functional Requirements (FR)

### 7.1 Public Intake
- FR-001: System shall allow anonymous and identified report submission.
- FR-002: System shall support multilingual intake labels/help text.
- FR-003: System shall resolve active intake form config by country/program using `get_active_intake_form_config`.
- FR-004: System shall store report payload to structured columns + `intake_payload` JSON.
- FR-005: System shall support file attachments and review before submit.
- FR-006: System shall capture post-submit feedback in `feedbacks`.

### 7.2 Reporter Portal
- FR-010: Reporter shall view submitted reports and statuses.
- FR-011: Reporter shall view report activity (comments, status history, actions).
- FR-012: Reporter shall manage own profile (except restricted anonymous fields).
- FR-013: Reporter shall manage notification preferences.
- FR-014: Reporter shall view policy consent history.

### 7.3 Organisation Portal
- FR-020: Org user shall view and manage reports for own organisation.
- FR-021: Org user shall run status transitions and filtering decisions per allowed workflows.
- FR-022: Org user shall create/manage report actions.
- FR-023: Org user shall manage org master data (profile, worksites, relationships).
- FR-024: Org user shall manage policy/automation settings.
- FR-025: Org user shall manage departments and triage workflows.
- FR-026: Org user shall manage organisation users and role assignment.

### 7.4 Admin Portal
- FR-030: Admin shall have platform-wide user, org, report, risk, relationship, policy governance.
- FR-031: Admin shall manage no-code intake form builder configs.
- FR-032: Admin shall publish/unpublish intake configs and enforce one active published per scope.
- FR-033: Admin shall not be able to remove the default global intake form.
- FR-034: Admin shall only remove non-default configs when unpublished and not referenced by reports.
- FR-035: Admin shall manage localization catalogs (countries/languages mappings).

## 8. Data and Integration Requirements

### 8.1 Core Integration Points
- Edge Function: `create-report`
- Edge Function: `admin-portal`
- RPC: `get_active_intake_form_config`
- RPC: status/filter transition RPCs (e.g., `set_report_status`, `apply_report_filter_decision`)

### 8.2 Key Entities
- `user_profiles`, `organization_users`, `roles`
- `organisations`, `worksites`, `organization_relationships`
- `reports`, `report_comments`, `report_actions`, `feedbacks`
- `report_statuses`, `report_status_transitions`, `report_status_history`
- `policies`, `user_policy_consents`
- `intake_form_configs`, `intake_form_fields`, `intake_form_conditions`, `intake_form_translations`
- `platform_settings`, `languages`, `countries`, `country_languages`

## 9. Non-Functional Requirements (NFR)
- NFR-001 Security: Auth required for `/portal/*`; role checks on admin APIs.
- NFR-002 Reliability: Graceful fallback when no active intake config is published.
- NFR-003 Performance: Portal lists should support filtering and pagination (current implementation mostly client-side; pagination enhancement recommended).
- NFR-004 Auditability: Status transitions/comments/actions should remain traceable.
- NFR-005 Usability: Clear portal navigation by role; pending-access page for blocked/pending orgs.
- NFR-006 Localisation: Intake supports language/country mapping and translation overrides.

## 10. Current Gaps / Risks (for SRS alignment)
1. Admin role mismatch risk:
- Portal router accepts `system_admin`, `admin`, `administrator` for `/portal/admin`.
- `admin-portal` edge function currently authorizes only `administrator`.

2. Access-control consistency:
- `/portal/*` login is enforced by middleware, but many fine-grained role checks are in client logic or edge functions.
- Recommend explicit server-side route guards per portal segment.

3. 2FA is placeholder in org security view (not fully implemented).

4. Several pages show UX placeholders for sort/filter/search or future analytics.

## 11. Acceptance Criteria (Phase 1)
1. Every listed route is mapped to a user class and feature intent.
2. Role routing from `/portal` matches approved user type taxonomy.
3. Admin-critical features are executable only through authorized admin APIs.
4. Intake form builder supports create/publish/unpublish/remove with default protection.
5. Reporter and org users can complete end-to-end report lifecycle activities relevant to their portal.

## 12. Traceability to Current Implementation
Primary references used:
- `src/app/(public)/*`
- `src/app/(portal)/portal/*`
- `src/components/admin/*`, `src/components/portal/*`, `src/components/reporter/*`
- `src/lib/adminApi.ts`, `src/lib/orgContext.ts`, `src/middleware.ts`
- `supabase/functions/admin-portal/index.ts`, `supabase/functions/create-report/index.ts`
- `supabase/migrations/014_intake_form_builder.sql` and related migrations

---
Prepared as an implementation-grounded SRS draft. Next step is converting FR/NFR items into prioritized tickets (MVP vs Phase 2).
