CREATE OR REPLACE FUNCTION notify_table_update() RETURNS TRIGGER AS $$
DECLARE
  payload jsonb;
BEGIN
  -- Create a JSON payload with the table name, action, and row ID
  IF TG_OP = 'DELETE' THEN
    payload = json_build_object(
      'table', TG_TABLE_NAME,
      'action', TG_OP,
      'id', OLD.id
    );
  ELSE
    payload = json_build_object(
      'table', TG_TABLE_NAME,
      'action', TG_OP,
      'id', NEW.id
    );
  END IF;

  PERFORM pg_notify('db_changes', payload::text);
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply to shifts
DROP TRIGGER IF EXISTS shifts_notify_trigger ON shifts;
CREATE TRIGGER shifts_notify_trigger
AFTER INSERT OR UPDATE OR DELETE ON shifts
FOR EACH ROW EXECUTE FUNCTION notify_table_update();

-- Apply to shift_assignments
DROP TRIGGER IF EXISTS shift_assignments_notify_trigger ON shift_assignments;
CREATE TRIGGER shift_assignments_notify_trigger
AFTER INSERT OR UPDATE OR DELETE ON shift_assignments
FOR EACH ROW EXECUTE FUNCTION notify_table_update();

-- Apply to swap_requests
DROP TRIGGER IF EXISTS swap_requests_notify_trigger ON swap_requests;
CREATE TRIGGER swap_requests_notify_trigger
AFTER INSERT OR UPDATE OR DELETE ON swap_requests
FOR EACH ROW EXECUTE FUNCTION notify_table_update();

-- Apply to notifications (drives in-app notification center updates)
DROP TRIGGER IF EXISTS notifications_notify_trigger ON notifications;
CREATE TRIGGER notifications_notify_trigger
AFTER INSERT OR UPDATE OR DELETE ON notifications
FOR EACH ROW EXECUTE FUNCTION notify_table_update();
