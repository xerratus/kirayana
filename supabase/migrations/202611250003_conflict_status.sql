-- A stale client version is an HTTP conflict, not a database serialization retry.
create or replace function public.save_organizer(p_owner uuid, p_expected_version bigint, p_operation uuid, p_content jsonb, p_layout jsonb, p_revision bigint) returns bigint
language plpgsql security definer set search_path = '' as $$
declare current_doc public.organizers; receipt public.organizer_operations; c jsonb; l jsonb; next_version bigint; request_body jsonb;
begin
  if auth.uid() is null or auth.uid() <> p_owner then raise exception 'Account ownership mismatch.' using errcode='42501'; end if;
  if p_operation is null or p_revision is null or p_revision < 0 or p_expected_version is null then raise exception 'Invalid save request.'; end if;
  -- Serializes first creation and subsequent writes for this owner, including concurrent tabs.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner::text,0));
  request_body := jsonb_build_object('sha256', encode(sha256(convert_to(jsonb_build_object('content',p_content,'layout',p_layout,'revision',p_revision,'expected',p_expected_version)::text,'UTF8')),'hex'));
  select * into receipt from public.organizer_operations where owner_id=p_owner and operation_id=p_operation;
  if found then
    if receipt.request <> request_body then raise exception 'Save operation was reused with different data.'; end if;
    return receipt.result_version;
  end if;
  select * into current_doc from public.organizers where owner_id=p_owner for update;
  if coalesce(current_doc.version,0) <> p_expected_version then raise exception 'This organizer changed in another tab or device. Export your unsaved work before refreshing.' using errcode='PT409'; end if;
  c := coalesce(p_content,current_doc.content); l := coalesce(p_layout,current_doc.layout);
  perform public.validate_organizer(c,l,p_owner);
  next_version := coalesce(current_doc.version,0)+1;
  insert into public.organizers(owner_id,content,layout,version,content_version,layout_version,client_revision)
    values(p_owner,c,l,next_version,1,1,p_revision)
    on conflict(owner_id) do update set content=excluded.content,layout=excluded.layout,version=next_version,
      content_version=public.organizers.content_version + case when p_content is null then 0 else 1 end,
      layout_version=public.organizers.layout_version + case when p_layout is null then 0 else 1 end,
      client_revision=p_revision,updated_at=now();
  -- Store hashes instead of full document copies in receipts (bounded growth per save).
  insert into public.organizer_operations(owner_id,operation_id,request,result_version) values(p_owner,p_operation,request_body,next_version);
  delete from public.organizer_operations where owner_id=p_owner and created_at < now()-interval '30 days';
  return next_version;
end;
$$;
