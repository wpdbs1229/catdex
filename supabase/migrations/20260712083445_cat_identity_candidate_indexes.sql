create index if not exists idx_cat_match_candidates_cat_id
  on public.cat_match_candidates(cat_id);

create index if not exists idx_cat_observations_resolved_cat_id
  on public.cat_observations(resolved_cat_id);
