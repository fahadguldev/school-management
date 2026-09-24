-- ==============================================================================
-- PostgreSQL Multi-Tenant Row-Level Security (RLS) Isolation Layer
-- Academic Intelligence & School Operations SaaS
-- ==============================================================================

-- 1. Organizations (Root Tenant Entity: uses `id`)
ALTER TABLE IF EXISTS "organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "organizations" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON "organizations";
CREATE POLICY tenant_isolation_policy ON "organizations"
  AS PERMISSIVE
  FOR ALL
  TO PUBLIC
  USING (
    (NULLIF(current_setting('app.bypass_rls', true), '') = 'on')
    OR
    (id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid)
  )
  WITH CHECK (
    (NULLIF(current_setting('app.bypass_rls', true), '') = 'on')
    OR
    (id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid)
  );

-- 2. Tenant-Owned Tables (Inherit from BaseEntity: use `organization_id`)
DO $$
DECLARE
  tbl text;
  tenant_tables text[] := ARRAY[
    'users',
    'students',
    'teachers',
    'classes',
    'subjects',
    'academic_years',
    'terms',
    'student_enrollments',
    'teacher_assignments',
    'assessments',
    'marks',
    'results',
    'fees',
    'fee_structures',
    'payments',
    'audit_logs'
  ];
BEGIN
  FOREACH tbl IN ARRAY tenant_tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
      EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I;', tbl);
      EXECUTE format(
        'CREATE POLICY tenant_isolation_policy ON %I
         AS PERMISSIVE
         FOR ALL
         TO PUBLIC
         USING (
           (NULLIF(current_setting(''app.bypass_rls'', true), '''') = ''on'')
           OR
           (organization_id = NULLIF(current_setting(''app.current_organization_id'', true), '''')::uuid)
         )
         WITH CHECK (
           (NULLIF(current_setting(''app.bypass_rls'', true), '''') = ''on'')
           OR
           (organization_id = NULLIF(current_setting(''app.current_organization_id'', true), '''')::uuid)
         );',
        tbl
      );
    END IF;
  END LOOP;
END $$;
