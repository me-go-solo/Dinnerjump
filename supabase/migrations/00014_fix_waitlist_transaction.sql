-- Fix race condition: wrap the entire function in a serializable transaction
-- and lock the relevant rows to prevent concurrent registration issues
CREATE OR REPLACE FUNCTION process_duo_registration(p_duo_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_event_id UUID;
  v_total_paid INT;
  v_after_minimum INT;
  v_remainder INT;
  v_promoted_ids UUID[];
BEGIN
  -- Lock the duo row first to prevent concurrent calls for the same duo
  SELECT event_id INTO v_event_id FROM duos WHERE id = p_duo_id FOR UPDATE;

  -- Lock all duos for this event to get a consistent count
  PERFORM id FROM duos WHERE event_id = v_event_id FOR UPDATE;

  SELECT COUNT(*) INTO v_total_paid FROM duos
  WHERE event_id = v_event_id AND status IN ('registered', 'waitlisted', 'confirmed');

  IF v_total_paid < 9 THEN
    UPDATE duos SET status = 'registered' WHERE id = p_duo_id;
    RETURN jsonb_build_object('action', 'registered', 'total_paid', v_total_paid, 'duos_needed', 9 - v_total_paid);
  END IF;

  IF v_total_paid = 9 THEN
    UPDATE duos SET status = 'confirmed' WHERE event_id = v_event_id AND status = 'registered';
    UPDATE events SET status = 'confirmed' WHERE id = v_event_id;
    RETURN jsonb_build_object('action', 'event_confirmed', 'total_paid', v_total_paid,
      'promoted_duo_ids', to_jsonb(ARRAY(SELECT id FROM duos WHERE event_id = v_event_id AND status = 'confirmed')));
  END IF;

  v_after_minimum := v_total_paid - 9;
  v_remainder := v_after_minimum % 3;

  IF v_remainder = 0 THEN
    WITH promoted AS (
      UPDATE duos SET status = 'confirmed' WHERE event_id = v_event_id AND status = 'waitlisted' RETURNING id
    )
    SELECT ARRAY_AGG(id) INTO v_promoted_ids FROM promoted;
    RETURN jsonb_build_object('action', 'table_confirmed', 'total_paid', v_total_paid, 'promoted_duo_ids', to_jsonb(v_promoted_ids));
  ELSE
    UPDATE duos SET status = 'waitlisted' WHERE id = p_duo_id;
    RETURN jsonb_build_object('action', 'waitlisted', 'total_paid', v_total_paid, 'duos_needed', 3 - v_remainder);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
