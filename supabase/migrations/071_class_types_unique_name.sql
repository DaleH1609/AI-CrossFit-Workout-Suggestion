-- One class type name per gym.
--
-- Nothing stopped a gym creating "Run Club" twice. It happened during
-- debugging: two rows, same gym, same name, different colours, both rendered
-- in the palette and both listed in the class-type picker with no way to tell
-- them apart. Picking the wrong one silently attaches classes to a type the
-- owner thinks they are not using.
--
-- Case-insensitive and trim-insensitive, because "Run Club", "run club" and
-- "Run Club " are the same thing to the person reading the schedule, and
-- allowing all three produces exactly the confusion this is meant to prevent.
--
-- Verified before writing: the table currently holds no duplicate
-- (gym_id, lower(trim(name))) groups, so this applies without a cleanup step.
-- If that changes before it runs, the index creation will fail loudly rather
-- than silently discard a row — which is the right failure mode.

CREATE UNIQUE INDEX IF NOT EXISTS class_types_gym_name_unique
  ON public.class_types (gym_id, lower(trim(name)));

-- The application should not rely on catching a 23505 to give a good message,
-- so the POST route checks for an existing name first. This index is the
-- backstop for the race between two concurrent creates, and for anything
-- writing to the table outside that route.
