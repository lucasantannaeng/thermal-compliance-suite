-- =====================================================================
-- Thermal Compliance Suite — Supabase Multi-Tenant Schema
-- Isolamento por tenant via RLS. White-label: branding por tenant.
-- NBR 15575:2021 / NBR 16401 — registros de auditoria imutáveis.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- TENANTS (organizações white-label)
-- ---------------------------------------------------------------------
create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null check (slug ~ '^[a-z0-9-]{3,40}$'),
  branding jsonb not null default '{}'::jsonb,
  -- esperado: {primaryColor, logoUrl, responsibleName, professionalTitle, creaCauNumber, artRrtNumber}
  plan text not null default 'pro' check (plan in ('solo','pro','agency')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- USERS (perfil vinculado a auth.users do Supabase)
-- ---------------------------------------------------------------------
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  email text unique not null,
  role text not null default 'member' check (role in ('owner','admin','member')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- PROJECTS (empreendimentos)
-- ---------------------------------------------------------------------
create table projects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  enterprise text,
  address text,
  typology_uh text,
  bioclimatic_zone int not null check (bioclimatic_zone between 1 and 8),
  target_level text not null default 'MINIMO' check (target_level in ('MINIMO','INTERMEDIARIO','SUPERIOR')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- ZONES (ambientes térmicos — payload validado no client pelo motor TS)
-- ---------------------------------------------------------------------
create table zones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  payload jsonb not null, -- ThermalZoneInput serializado
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- COMPLIANCE_REPORTS (dossiês emitidos — append-only p/ auditoria)
-- O hash SHA-256 autentica o conteúdo; QR Code aponta para esta linha.
-- ---------------------------------------------------------------------
create table compliance_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  audit_hash text not null unique,
  result jsonb not null, -- ProjectComplianceResult serializado
  issued_at timestamptz not null default now()
);

-- Índices de consulta multi-tenant
create index idx_users_tenant on users(tenant_id);
create index idx_projects_tenant on projects(tenant_id);
create index idx_zones_project on zones(project_id);
create index idx_reports_tenant on compliance_reports(tenant_id);
create index idx_reports_hash on compliance_reports(audit_hash);

-- =====================================================================
-- ROW LEVEL SECURITY — isolamento estrito por tenant
-- =====================================================================
alter table tenants enable row level security;
alter table users enable row level security;
alter table projects enable row level security;
alter table zones enable row level security;
alter table compliance_reports enable row level security;

-- Helper: tenant do usuário autenticado atual
create or replace function current_tenant_id() returns uuid
language sql stable security definer set search_path = public as $$
  select tenant_id from users where id = auth.uid();
$$;

-- Tenants: membros leem o próprio tenant; ninguém cria direto (onboarding controlado)
create policy tenants_read_own on tenants for select
  using (id = current_tenant_id());

-- Users: vê colegas do mesmo tenant
create policy users_read_same_tenant on users for select
  using (tenant_id = current_tenant_id());
create policy users_update_self on users for update
  using (id = auth.uid()) with check (id = auth.uid());

-- Projects
create policy projects_all_tenant on projects for all
  using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id());

-- Zones
create policy zones_all_tenant on zones for all
  using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id());

-- Reports: append-only (insert + read; sem update/delete = trilha de auditoria)
create policy reports_insert_tenant on compliance_reports for insert
  with check (tenant_id = current_tenant_id());
create policy reports_select_tenant on compliance_reports for select
  using (tenant_id = current_tenant_id());

-- Leitura pública apenas do hash (verificação via QR Code, sem dados sensíveis)
create or replace function verify_dossier(hash_input text)
returns table (project_name text, issued_at timestamptz, audit_hash text)
language sql stable security definer set search_path = public as $$
  select p.name, r.issued_at, r.audit_hash
  from compliance_reports r join projects p on p.id = r.project_id
  where r.audit_hash = hash_input;
$$;
