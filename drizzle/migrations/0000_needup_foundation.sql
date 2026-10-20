
CREATE TYPE public.post_type AS ENUM ('NEED','CAN_HELP','WORK','GENERAL');

-- communities
CREATE TABLE public.communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  location_name text,
  cover_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.communities TO anon, authenticated;
GRANT ALL ON public.communities TO service_role;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "communities readable" ON public.communities FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.communities (slug,name,description,location_name,cover_url) VALUES
 ('saronkhola','Saronkhola Community','Neighbors helping neighbors in Saronkhola.','Saronkhola, Bagerhat',NULL),
 ('dhaka','Dhaka','The Dhaka city community.','Dhaka',NULL),
 ('students','Students','Study help, notes and tutoring.','Bangladesh','https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=70'),
 ('local-jobs','Local Jobs','Find local work and workers.','Bangladesh','https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=70'),
 ('small-business','Small Business','Support for local shops and makers.','Bangladesh','https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=800&q=70');

-- profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  username text UNIQUE,
  avatar_url text,
  bio text,
  location_name text,
  community_id uuid REFERENCES public.communities(id) ON DELETE SET NULL,
  onboarded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT username_format CHECK (username IS NULL OR username ~ '^[a-z0-9_]{3,30}$')
);
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles public read" ON public.profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- memberships
CREATE TABLE public.user_communities (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, community_id)
);
GRANT SELECT ON public.user_communities TO anon, authenticated;
GRANT INSERT, DELETE ON public.user_communities TO authenticated;
GRANT ALL ON public.user_communities TO service_role;
ALTER TABLE public.user_communities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "memberships readable" ON public.user_communities FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "join self" ON public.user_communities FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "leave self" ON public.user_communities FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- posts
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  community_id uuid REFERENCES public.communities(id) ON DELETE SET NULL,
  post_type public.post_type NOT NULL,
  title text,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 5000),
  location_name text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX posts_created_idx ON public.posts (created_at DESC);
CREATE INDEX posts_community_idx ON public.posts (community_id, created_at DESC);
GRANT SELECT ON public.posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posts readable" ON public.posts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "create own posts" ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own posts" ON public.posts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own posts" ON public.posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- likes
CREATE TABLE public.post_likes (
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
GRANT SELECT ON public.post_likes TO anon, authenticated;
GRANT INSERT, DELETE ON public.post_likes TO authenticated;
GRANT ALL ON public.post_likes TO service_role;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes readable" ON public.post_likes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "like self" ON public.post_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "unlike self" ON public.post_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- comments
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX comments_post_idx ON public.comments (post_id, created_at);
GRANT SELECT ON public.comments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments readable" ON public.comments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "comment self" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "edit own comment" ON public.comments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own comment" ON public.comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- need responses
CREATE TABLE public.need_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  responder_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, responder_id)
);
GRANT SELECT, INSERT ON public.need_responses TO authenticated;
GRANT ALL ON public.need_responses TO service_role;
ALTER TABLE public.need_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "see own or received responses" ON public.need_responses FOR SELECT TO authenticated
  USING (auth.uid() = responder_id OR auth.uid() = (SELECT p.user_id FROM public.posts p WHERE p.id = post_id));
CREATE POLICY "respond as self to others' needs" ON public.need_responses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = responder_id AND EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.post_type = 'NEED' AND p.user_id <> auth.uid()));

-- messaging
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.conversation_participants (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 4000),
  is_read boolean NOT NULL DEFAULT false,
  sent_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_conv_idx ON public.messages (conversation_id, sent_at);

CREATE OR REPLACE FUNCTION public.is_participant(_conv uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = _conv AND user_id = _user)
$$;

GRANT SELECT ON public.conversations TO authenticated;
GRANT SELECT, UPDATE ON public.conversation_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.conversations, public.conversation_participants, public.messages TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants see conversation" ON public.conversations FOR SELECT TO authenticated USING (public.is_participant(id, auth.uid()));
CREATE POLICY "participants see members" ON public.conversation_participants FOR SELECT TO authenticated USING (public.is_participant(conversation_id, auth.uid()));
CREATE POLICY "update own read marker" ON public.conversation_participants FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "participants read messages" ON public.messages FOR SELECT TO authenticated USING (public.is_participant(conversation_id, auth.uid()));
CREATE POLICY "participants send messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id AND public.is_participant(conversation_id, auth.uid()));
CREATE POLICY "recipients mark read" ON public.messages FOR UPDATE TO authenticated USING (public.is_participant(conversation_id, auth.uid()) AND sender_id <> auth.uid()) WITH CHECK (public.is_participant(conversation_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.start_conversation(_other uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _me uuid := auth.uid(); _conv uuid;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _other = _me THEN RAISE EXCEPTION 'cannot message yourself'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _other) THEN RAISE EXCEPTION 'user not found'; END IF;
  SELECT a.conversation_id INTO _conv FROM public.conversation_participants a
    JOIN public.conversation_participants b ON b.conversation_id = a.conversation_id
    WHERE a.user_id = _me AND b.user_id = _other LIMIT 1;
  IF _conv IS NULL THEN
    INSERT INTO public.conversations DEFAULT VALUES RETURNING id INTO _conv;
    INSERT INTO public.conversation_participants (conversation_id, user_id) VALUES (_conv, _me), (_conv, _other);
  END IF;
  RETURN _conv;
END $$;
REVOKE ALL ON FUNCTION public.start_conversation(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.start_conversation(uuid) TO authenticated;

-- notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('like','comment','help','message')),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications (user_id, created_at DESC);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "mark own read" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own notifications" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.notify_post_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _owner uuid; _actor uuid; _type text;
BEGIN
  IF TG_TABLE_NAME = 'post_likes' THEN _actor := NEW.user_id; _type := 'like';
  ELSIF TG_TABLE_NAME = 'comments' THEN _actor := NEW.user_id; _type := 'comment';
  ELSE _actor := NEW.responder_id; _type := 'help'; END IF;
  SELECT user_id INTO _owner FROM public.posts WHERE id = NEW.post_id;
  IF _owner IS NOT NULL AND _owner <> _actor THEN
    INSERT INTO public.notifications (user_id, actor_id, type, post_id) VALUES (_owner, _actor, _type, NEW.post_id);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER like_notify AFTER INSERT ON public.post_likes FOR EACH ROW EXECUTE FUNCTION public.notify_post_owner();
CREATE TRIGGER comment_notify AFTER INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION public.notify_post_owner();
CREATE TRIGGER help_notify AFTER INSERT ON public.need_responses FOR EACH ROW EXECUTE FUNCTION public.notify_post_owner();

CREATE OR REPLACE FUNCTION public.on_new_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  INSERT INTO public.notifications (user_id, actor_id, type, conversation_id)
    SELECT user_id, NEW.sender_id, 'message', NEW.conversation_id FROM public.conversation_participants
    WHERE conversation_id = NEW.conversation_id AND user_id <> NEW.sender_id;
  RETURN NEW;
END $$;
CREATE TRIGGER message_notify AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.on_new_message();

-- updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER posts_touch BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER comments_touch BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _comm uuid; _base text; _uname text;
BEGIN
  SELECT id INTO _comm FROM public.communities WHERE slug = 'saronkhola';
  _base := lower(regexp_replace(coalesce(split_part(NEW.email, '@', 1), 'user'), '[^a-zA-Z0-9_]', '', 'g'));
  IF char_length(_base) < 3 THEN _base := 'user' || _base; END IF;
  _uname := left(_base, 20) || '_' || substr(replace(NEW.id::text, '-', ''), 1, 5);
  INSERT INTO public.profiles (id, full_name, username, avatar_url, community_id, location_name)
  VALUES (NEW.id,
          coalesce(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
          _uname,
          NEW.raw_user_meta_data->>'avatar_url',
          _comm, 'Saronkhola');
  IF _comm IS NOT NULL THEN
    INSERT INTO public.user_communities (user_id, community_id) VALUES (NEW.id, _comm) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
