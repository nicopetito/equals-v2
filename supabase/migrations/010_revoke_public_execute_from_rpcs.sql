-- REVOKE PUBLIC de todos los RPCs
-- El REVOKE FROM anon de los migrations anteriores era insuficiente:
-- anon hereda EXECUTE de PUBLIC. Se revoca PUBLIC y se mantienen
-- los grants explícitos a authenticated y service_role.

REVOKE EXECUTE ON FUNCTION public.rpc_exchange_conversion(uuid,uuid,numeric,numeric,text,text,numeric,text,text,date,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpc_fixed_term_create(uuid,text,numeric,text,numeric,integer,date,date,numeric,numeric,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpc_fixed_term_reinvest(uuid,uuid,numeric,numeric,text,numeric,integer,date,date,numeric,numeric,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpc_fixed_term_withdraw(uuid,uuid,numeric,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpc_goal_deposit(uuid,uuid,numeric,text,text,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpc_goal_withdraw(uuid,uuid,numeric,text,text,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpc_recurring_execute(uuid,uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpc_refund_credit(uuid) FROM PUBLIC;
