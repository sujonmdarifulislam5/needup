GRANT SELECT ON public.communities, public.profiles, public.user_communities, public.posts, public.post_likes, public.comments TO anon;
GRANT SELECT ON public.communities, public.profiles, public.conversations TO authenticated;
GRANT UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.user_communities, public.post_likes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts, public.comments TO authenticated;
GRANT SELECT, INSERT ON public.need_responses TO authenticated;
GRANT SELECT, UPDATE ON public.conversation_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.communities, public.profiles, public.user_communities, public.posts, public.post_likes, public.comments, public.need_responses, public.conversations, public.conversation_participants, public.messages, public.notifications TO service_role;
ALTER TABLE public.posts ADD COLUMN status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed'));
ALTER TABLE public.comments ADD COLUMN parent_id uuid REFERENCES public.comments(id) ON DELETE SET NULL;
CREATE OR REPLACE FUNCTION public.validate_comment_parent() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.parent_id IS NOT NULL AND (NEW.parent_id = NEW.id OR NOT EXISTS (SELECT 1 FROM public.comments WHERE id=NEW.parent_id AND post_id=NEW.post_id AND parent_id IS NULL)) THEN RAISE EXCEPTION 'Reply must reference a top-level comment on the same post'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER validate_comment_parent BEFORE INSERT OR UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.validate_comment_parent();
CREATE OR REPLACE FUNCTION public.notify_post_owner() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _owner uuid; _actor uuid; _type text; _parent_owner uuid;
BEGIN
 IF TG_TABLE_NAME='post_likes' THEN _actor:=NEW.user_id; _type:='like';
 ELSIF TG_TABLE_NAME='comments' THEN _actor:=NEW.user_id; _type:='comment';
 ELSE _actor:=NEW.responder_id; _type:='help'; END IF;
 SELECT user_id INTO _owner FROM public.posts WHERE id=NEW.post_id;
 IF _owner IS NOT NULL AND _owner <> _actor THEN INSERT INTO public.notifications(user_id,actor_id,type,post_id) VALUES(_owner,_actor,_type,NEW.post_id); END IF;
 IF TG_TABLE_NAME='comments' THEN
  IF NEW.parent_id IS NOT NULL THEN
   SELECT user_id INTO _parent_owner FROM public.comments WHERE id=NEW.parent_id;
   IF _parent_owner IS NOT NULL AND _parent_owner <> _actor AND _parent_owner IS DISTINCT FROM _owner THEN
    INSERT INTO public.notifications(user_id,actor_id,type,post_id) VALUES(_parent_owner,_actor,'comment',NEW.post_id);
   END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.guard_interaction_update() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF TG_TABLE_NAME='messages' AND (to_jsonb(NEW)-'is_read') IS DISTINCT FROM (to_jsonb(OLD)-'is_read') THEN RAISE EXCEPTION 'Only message read status may be updated'; END IF;
 IF TG_TABLE_NAME='notifications' AND (to_jsonb(NEW)-'is_read') IS DISTINCT FROM (to_jsonb(OLD)-'is_read') THEN RAISE EXCEPTION 'Only notification read status may be updated'; END IF;
 IF TG_TABLE_NAME='conversation_participants' AND (to_jsonb(NEW)-'last_read_at') IS DISTINCT FROM (to_jsonb(OLD)-'last_read_at') THEN RAISE EXCEPTION 'Only the read marker may be updated'; END IF;
 IF TG_TABLE_NAME='comments' AND (NEW.post_id IS DISTINCT FROM OLD.post_id OR NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.parent_id IS DISTINCT FROM OLD.parent_id) THEN RAISE EXCEPTION 'Comment ownership and thread cannot change'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_message_update BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.guard_interaction_update();
CREATE TRIGGER guard_notification_update BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.guard_interaction_update();
CREATE TRIGGER guard_participant_update BEFORE UPDATE ON public.conversation_participants FOR EACH ROW EXECUTE FUNCTION public.guard_interaction_update();
CREATE TRIGGER guard_comment_update BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.guard_interaction_update();
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications, public.need_responses, public.comments;
REVOKE ALL ON FUNCTION public.is_participant(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_participant(uuid,uuid) TO authenticated, service_role;