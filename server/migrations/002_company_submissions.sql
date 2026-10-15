-- Companies can be added by signed-in users. They go live at once; moderators check them afterwards
-- (checked_at stays null until a moderator keeps or removes the company).
ALTER TABLE companies
  ADD COLUMN status text NOT NULL DEFAULT 'published' CHECK (status IN ('pending', 'published', 'rejected')),
  ADD COLUMN submitted_by uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN website text,
  ADD COLUMN moderator_note text,
  ADD COLUMN checked_at timestamptz;
CREATE INDEX companies_unchecked_idx ON companies(created_at) WHERE submitted_by IS NOT NULL AND checked_at IS NULL;
CREATE INDEX companies_submitted_by_idx ON companies(submitted_by);
CREATE INDEX companies_name_lower_idx ON companies(lower(name));
