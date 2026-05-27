-- rpc_transactions_batch_insert quedó con PUBLIC execute tras migration 013.
-- Mismo patrón que migration 010: REVOKE PUBLIC, authenticated y service_role mantienen acceso explícito.
REVOKE EXECUTE ON FUNCTION public.rpc_transactions_batch_insert(jsonb) FROM PUBLIC;
