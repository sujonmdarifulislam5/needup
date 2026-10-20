CREATE OR REPLACE FUNCTION public.validate_help_response() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.posts WHERE id=NEW.post_id AND post_type='NEED' AND status='open' AND user_id <> NEW.responder_id) THEN RAISE EXCEPTION 'Only open needs from another user accept help'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER validate_help_response BEFORE INSERT ON public.need_responses FOR EACH ROW EXECUTE FUNCTION public.validate_help_response();