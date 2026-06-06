-- Adds support for the "Agent answering…" indicator and linking AI replies to
-- the buyer question they answer.
--
--  * ai_status: lifecycle of AI processing for a buyer comment.
--      none       -> not an AI-processed comment (host/system/assistant)
--      processing -> a buyer comment the Stream Producer DeepAgent is working on
--      done       -> processing finished (whether it replied, ignored, or escalated)
--  * reply_to_comment_id: for an assistant reply, the buyer comment it answers,
--    so the frontend can render the reply linked to that question.

alter table public.comments
  add column if not exists ai_status text not null default 'none',
  add column if not exists reply_to_comment_id uuid references public.comments(id);

create index if not exists comments_reply_to_comment_id_idx
  on public.comments (reply_to_comment_id);
