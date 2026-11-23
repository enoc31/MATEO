BEGIN;
SELECT plan(4);
INSERT INTO public.ongs (id, nombre) VALUES ('e1000000-0000-0000-0000-000000000001', 'Legacy UUID test');
INSERT INTO public.beneficiarios (id, ong_id, nombre, apellido, cedula, sexo, fecha_nacimiento)
VALUES ('e2000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'Test', 'Member', 'V-90200001', 'M', '1990-01-01');
SELECT ok(has_function_privilege('service_role', 'public.crear_reporte_aporte(uuid,uuid,uuid,boolean,text,text,text,text,text,numeric,numeric,numeric,numeric,text,text,text,text,boolean,date,text,text,text)', 'EXECUTE'), 'Service role retains execute');
SELECT ok(NOT has_function_privilege('anon', 'public.crear_reporte_aporte(uuid,uuid,uuid,boolean,text,text,text,text,text,numeric,numeric,numeric,numeric,text,text,text,text,boolean,date,text,text,text)', 'EXECUTE'), 'Anonymous role remains denied');
SELECT ok(NOT has_function_privilege('authenticated', 'public.crear_reporte_aporte(uuid,uuid,uuid,boolean,text,text,text,text,text,numeric,numeric,numeric,numeric,text,text,text,text,boolean,date,text,text,text)', 'EXECUTE'), 'Authenticated role remains denied');
SET LOCAL ROLE service_role;
SELECT lives_ok($$SELECT public.crear_reporte_aporte(p_ong_id => 'e1000000-0000-0000-0000-000000000001'::uuid, p_miembro_id => 'e2000000-0000-0000-0000-000000000001'::uuid, p_monto_original => 10, p_monto_usd => 10)$$, 'Service role can report a UUID member');
RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
