-- Trigger usaba NEW.goal_id pero en DELETE NEW es NULL → UPDATE afecta 0 rows.
-- Fix: usar COALESCE(NEW.goal_id, OLD.goal_id) y saltar si el goal ya fue borrado.
CREATE OR REPLACE FUNCTION public.update_goal_current_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_goal_id UUID := COALESCE(NEW.goal_id, OLD.goal_id);
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.goals WHERE id = v_goal_id) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE public.goals
  SET current_amount = (
    SELECT COALESCE(SUM(
      CASE WHEN gm.type = 'deposit' THEN gm.amount ELSE -gm.amount END
    ), 0)
    FROM public.goal_movements gm
    WHERE gm.goal_id = v_goal_id
  )
  WHERE id = v_goal_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;
