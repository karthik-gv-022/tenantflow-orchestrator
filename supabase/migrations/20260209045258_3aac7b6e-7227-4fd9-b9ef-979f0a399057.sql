-- Add unique constraint for upsert to work
ALTER TABLE public.user_sessions 
ADD CONSTRAINT user_sessions_user_id_session_token_key 
UNIQUE (user_id, session_token);