-- 041_reports_functions.sql
-- Helper SQL functions for the analytics/reports dashboard

-- Members joined per month (last N months)
CREATE OR REPLACE FUNCTION members_per_month(p_gym_id uuid, p_months int DEFAULT 12)
RETURNS TABLE(month text, count bigint)
LANGUAGE sql STABLE AS $$
  SELECT
    to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
    COUNT(*) AS count
  FROM users
  WHERE gym_id = p_gym_id
    AND role = 'member'
    AND created_at >= date_trunc('month', now()) - (p_months - 1) * interval '1 month'
  GROUP BY date_trunc('month', created_at)
  ORDER BY 1;
$$;

-- Attendance (confirmed bookings) per month (last N months)
CREATE OR REPLACE FUNCTION attendance_per_month(p_gym_id uuid, p_months int DEFAULT 12)
RETURNS TABLE(month text, count bigint)
LANGUAGE sql STABLE AS $$
  SELECT
    to_char(date_trunc('month', b.created_at), 'YYYY-MM') AS month,
    COUNT(*) AS count
  FROM bookings b
  WHERE b.gym_id = p_gym_id
    AND b.status IN ('confirmed', 'attended')
    AND b.created_at >= date_trunc('month', now()) - (p_months - 1) * interval '1 month'
  GROUP BY date_trunc('month', b.created_at)
  ORDER BY 1;
$$;

-- Attendance heatmap by day-of-week (0=Sun) and hour
CREATE OR REPLACE FUNCTION attendance_heatmap(p_gym_id uuid)
RETURNS TABLE(dow int, hour int, count bigint)
LANGUAGE sql STABLE AS $$
  SELECT
    EXTRACT(DOW FROM ci.starts_at)::int AS dow,
    EXTRACT(HOUR FROM ci.starts_at AT TIME ZONE 'UTC')::int AS hour,
    COUNT(*) AS count
  FROM bookings b
  JOIN class_instances ci ON ci.id = b.instance_id
  WHERE b.gym_id = p_gym_id
    AND b.status IN ('confirmed', 'attended')
    AND ci.starts_at >= now() - interval '90 days'
  GROUP BY 1, 2
  ORDER BY 1, 2;
$$;
