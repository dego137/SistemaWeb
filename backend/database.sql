-- Table: public.users

-- DROP TABLE IF EXISTS public.users;

CREATE TABLE IF NOT EXISTS public.users
(
    id integer NOT NULL DEFAULT nextval('users_id_seq'::regclass),
    username character varying COLLATE pg_catalog."default",
    first_name character varying COLLATE pg_catalog."default",
    last_name character varying COLLATE pg_catalog."default",
    email character varying COLLATE pg_catalog."default",
    phone_number character varying COLLATE pg_catalog."default",
    dni character varying COLLATE pg_catalog."default",
    status status,
    password character varying COLLATE pg_catalog."default",
    role role,
    url_video character varying COLLATE pg_catalog."default",
    CONSTRAINT users_pkey PRIMARY KEY (id)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.users
    OWNER to postgres;
-- Index: ix_users_dni

-- DROP INDEX IF EXISTS public.ix_users_dni;

CREATE UNIQUE INDEX IF NOT EXISTS ix_users_dni
    ON public.users USING btree
    (dni COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;
-- Index: ix_users_email

-- DROP INDEX IF EXISTS public.ix_users_email;

CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email
    ON public.users USING btree
    (email COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;
-- Index: ix_users_first_name

-- DROP INDEX IF EXISTS public.ix_users_first_name;

CREATE INDEX IF NOT EXISTS ix_users_first_name
    ON public.users USING btree
    (first_name COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;
-- Index: ix_users_id

-- DROP INDEX IF EXISTS public.ix_users_id;

CREATE INDEX IF NOT EXISTS ix_users_id
    ON public.users USING btree
    (id ASC NULLS LAST)
    TABLESPACE pg_default;
-- Index: ix_users_last_name

-- DROP INDEX IF EXISTS public.ix_users_last_name;

CREATE INDEX IF NOT EXISTS ix_users_last_name
    ON public.users USING btree
    (last_name COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;
-- Index: ix_users_phone_number

-- DROP INDEX IF EXISTS public.ix_users_phone_number;

CREATE INDEX IF NOT EXISTS ix_users_phone_number
    ON public.users USING btree
    (phone_number COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;
-- Index: ix_users_username

-- DROP INDEX IF EXISTS public.ix_users_username;

CREATE UNIQUE INDEX IF NOT EXISTS ix_users_username
    ON public.users USING btree
    (username COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;


-- Table: public.video_processing

-- DROP TABLE IF EXISTS public.video_processing;

CREATE TABLE IF NOT EXISTS public.video_processing
(
    id integer NOT NULL DEFAULT nextval('video_processing_id_seq'::regclass),
    user_id integer,
    blinks_detected integer,
    microsleeps double precision,
    yawns_detected integer,
    yawns_duration double precision,
    created_at timestamp without time zone,
    CONSTRAINT video_processing_pkey PRIMARY KEY (id),
    CONSTRAINT video_processing_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.video_processing
    OWNER to postgres;
-- Index: ix_video_processing_id

-- DROP INDEX IF EXISTS public.ix_video_processing_id;

CREATE INDEX IF NOT EXISTS ix_video_processing_id
    ON public.video_processing USING btree
    (id ASC NULLS LAST)
    TABLESPACE pg_default;
-- Index: ix_video_processing_user_id

-- DROP INDEX IF EXISTS public.ix_video_processing_user_id;

CREATE INDEX IF NOT EXISTS ix_video_processing_user_id
    ON public.video_processing USING btree
    (user_id ASC NULLS LAST)
    TABLESPACE pg_default;