-- Private account data. Never joined into public responses.
CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  token_hash  text PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_idx ON sessions(user_id);

CREATE TABLE companies (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  industry    text NOT NULL,
  size        text,
  color       text NOT NULL DEFAULT '#42685c',
  initials    text NOT NULL,
  is_demo     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Branch metadata only. Reviews are company-wide; no branch scores.
CREATE TABLE offices (
  id          bigserial PRIMARY KEY,
  company_id  text NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  city        text NOT NULL,
  state       text NOT NULL,
  lat         double precision NOT NULL,
  lng         double precision NOT NULL,
  is_primary  boolean NOT NULL DEFAULT false
);
CREATE INDEX offices_company_idx ON offices(company_id);
CREATE INDEX offices_geo_idx ON offices(lat, lng);

CREATE TABLE reviews (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        text NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status            text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','published','changes_requested','rejected','hidden')),
  employment        text NOT NULL CHECK (employment IN ('current','former')),
  language          text NOT NULL CHECK (language IN ('en','ms','zh')),
  overall           smallint NOT NULL CHECK (overall BETWEEN 1 AND 5),
  pay               smallint NOT NULL CHECK (pay BETWEEN 1 AND 5),
  management        smallint NOT NULL CHECK (management BETWEEN 1 AND 5),
  culture           smallint NOT NULL CHECK (culture BETWEEN 1 AND 5),
  growth            smallint NOT NULL CHECK (growth BETWEEN 1 AND 5),
  balance           smallint NOT NULL CHECK (balance BETWEEN 1 AND 5),
  title             text NOT NULL,
  pros              text NOT NULL,
  cons              text NOT NULL,
  moderator_note    text,
  is_demo           boolean NOT NULL DEFAULT false,
  version           integer NOT NULL DEFAULT 1,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  published_at      timestamptz,
  UNIQUE (company_id, user_id)
);
CREATE INDEX reviews_company_status_idx ON reviews(company_id, status, published_at DESC);
CREATE INDEX reviews_status_idx ON reviews(status, updated_at);

CREATE TABLE reports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id    uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  reporter_id  uuid REFERENCES users(id) ON DELETE SET NULL,
  reason       text NOT NULL,
  status       text NOT NULL DEFAULT 'open' CHECK (status IN ('open','dismissed','actioned')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  resolved_at  timestamptz
);
CREATE INDEX reports_open_idx ON reports(status, created_at);

CREATE TABLE appeals (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id    uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  message      text NOT NULL,
  status       text NOT NULL DEFAULT 'open' CHECK (status IN ('open','accepted','declined')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  resolved_at  timestamptz
);
CREATE UNIQUE INDEX appeals_one_open_idx ON appeals(review_id) WHERE status = 'open';

-- Audit trail of moderator decisions. Moderator identity is the account email
-- at decision time, kept private to moderators.
CREATE TABLE moderation_events (
  id           bigserial PRIMARY KEY,
  review_id    uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  moderator    text NOT NULL,
  action       text NOT NULL,
  note         text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX moderation_events_review_idx ON moderation_events(review_id);
