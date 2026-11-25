-- Avoid column/PLpgSQL variable ambiguity when validating populated collections.
create or replace function public.validate_organizer(c jsonb, l jsonb, owner uuid) returns void
language plpgsql set search_path = '' as $$
declare n jsonb; f jsonb; v jsonb; file jsonb; node_layout jsonb; entry record; total bigint := 0; node_ids text[]; field_ids text[]; cursor_id text; seen text[]; parent jsonb;
begin
  if c is null or l is null or jsonb_typeof(c) <> 'object' or jsonb_typeof(l) <> 'object'
    or octet_length(c::text) + octet_length(l::text) > 20971520
    or c->>'schemaVersion' <> '3'
    or jsonb_typeof(c->'nodes') is distinct from 'array'
    or jsonb_typeof(c->'fields') is distinct from 'array'
    or jsonb_typeof(c->'records') is distinct from 'array'
    or jsonb_typeof(c->'skills') is distinct from 'array'
    or jsonb_typeof(c->'items') is distinct from 'object'
    or jsonb_typeof(c->'attachments') is distinct from 'array'
    or jsonb_typeof(l->'nodes') is distinct from 'object'
    or jsonb_typeof(l->'views') is distinct from 'object'
    or jsonb_array_length(c->'nodes') > 10000 or jsonb_array_length(c->'records') > 50000
  then raise exception 'Invalid organizer format or size.'; end if;
  select array_agg(value->>'id') into node_ids from jsonb_array_elements(c->'nodes');
  if cardinality(node_ids) = 0 or cardinality(node_ids) <> (select count(distinct id) from unnest(node_ids) id)
    or not exists (select 1 from jsonb_array_elements(c->'nodes') x where x->>'id'=c->>'rootId' and x->>'kind'='user' and x->'parentId'='null'::jsonb)
    or not exists (select 1 from jsonb_array_elements(c->'nodes') x where x->>'id'=l->>'viewId' and x->>'kind' in ('user','entity'))
    or not (l->'views' ? (l->>'viewId')) then raise exception 'Invalid root or canvas.'; end if;
  for n in select value from jsonb_array_elements(c->'nodes') loop
    node_layout := l->'nodes'->(n->>'id');
    if jsonb_typeof(n->'createdAt') is distinct from 'string' or jsonb_typeof(node_layout->'updatedAt') is distinct from 'string' then raise exception 'Invalid space dates.'; end if;
    for entry in select * from jsonb_each(node_layout) loop
      if entry.key in ('fanOpen','fanCollapsed','fanPositioned') and jsonb_typeof(entry.value)<>'boolean' then raise exception 'Invalid fan state.'; end if;
      if entry.key='anchorAngle' and jsonb_typeof(entry.value)<>'number' then raise exception 'Invalid arc angle.'; end if;
      if entry.key='fanAnchor' and (jsonb_typeof(entry.value->'angle') is distinct from 'number' or jsonb_typeof(entry.value->'radius') is distinct from 'number' or jsonb_typeof(entry.value->'orbRadius') is distinct from 'number' or (entry.value->>'radius')::numeric<=0 or (entry.value->>'orbRadius')::numeric<=0) then raise exception 'Invalid fan anchor.'; end if;
    end loop;
    if n ? 'values' then perform public.validate_organizer_values(c,n->>'parentId',n->'values'); end if;
    if coalesce(n->>'id','') !~ '^[0-9a-f-]{36}$' or coalesce(n->>'kind','') not in ('user','entity','skills','collection','subset','item','tasks')
      or coalesce(length(trim(n->>'name')),0) not between 1 and 80 or coalesce(n->>'color','') !~ '^#[0-9a-fA-F]{6}$'
      or jsonb_typeof(l->'nodes'->(n->>'id')->'position'->'x') is distinct from 'number'
      or jsonb_typeof(l->'nodes'->(n->>'id')->'position'->'y') is distinct from 'number'
      or jsonb_typeof(l->'nodes'->(n->>'id')->'collapsed') is distinct from 'boolean'
    then raise exception 'Invalid space.'; end if;
    if n->>'id' <> c->>'rootId' then
      select value into parent from jsonb_array_elements(c->'nodes') where value->>'id'=n->>'parentId';
      if parent is null or parent->>'kind' not in ('user','entity','subset') or (parent->>'kind'='subset' and n->>'kind'<>'entity') or n->>'kind'='user' then raise exception 'Invalid space parent.'; end if;
    end if;
    seen := array[n->>'id']; cursor_id := n->>'parentId';
    while cursor_id is not null loop
      if cursor_id=any(seen) then raise exception 'Circular space relationship.'; end if;
      seen := array_append(seen,cursor_id);
      select value->>'parentId' into cursor_id from jsonb_array_elements(c->'nodes') where value->>'id'=cursor_id;
    end loop;
    if n ? 'tasks' then
      if n->>'kind'<>'tasks' or jsonb_typeof(n->'tasks')<>'array' then raise exception 'Invalid tasks.'; end if;
      if jsonb_array_length(n->'tasks') <> (select count(distinct x->>'id') from jsonb_array_elements(n->'tasks') x) then raise exception 'Duplicate tasks.'; end if;
      for v in select value from jsonb_array_elements(n->'tasks') loop
        if coalesce(length(trim(v->>'title')),0) not between 1 and 280 or jsonb_typeof(v->'completed') is distinct from 'boolean' or coalesce(v->>'id','')='' then raise exception 'Invalid task.'; end if;
      end loop;
    end if;
  end loop;
  select array_agg(value->>'id') into field_ids from jsonb_array_elements(c->'fields');
  if cardinality(field_ids) <> (select count(distinct id) from unnest(field_ids) id) then raise exception 'Duplicate fields.'; end if;
  for f in select value from jsonb_array_elements(c->'fields') loop
    if coalesce(length(trim(f->>'name')),0) not between 1 and 80
      or coalesce(f->>'type','') not in ('text','long-text','number','date','checkbox','select')
      or jsonb_typeof(f->'options') is distinct from 'array' or jsonb_typeof(f->'required') is distinct from 'boolean'
      or not exists (select 1 from jsonb_array_elements(c->'nodes') candidate where candidate->>'id'=f->>'collectionId' and candidate->>'kind' in ('collection','subset')) then raise exception 'Invalid field.'; end if;
    if exists(select 1 from jsonb_array_elements(f->'options') x where jsonb_typeof(x)<>'string') then raise exception 'Invalid field options.'; end if;
  end loop;
  if jsonb_array_length(c->'records') <> (select count(distinct x->>'id') from jsonb_array_elements(c->'records') x) then raise exception 'Duplicate records.'; end if;
  for entry in select * from jsonb_each(c->'items') loop
    if jsonb_typeof(entry.value)<>'string' or not exists(select 1 from jsonb_array_elements(c->'nodes') candidate where candidate->>'id'=entry.key and candidate->>'kind'='item') then raise exception 'Invalid Item notes.'; end if;
  end loop;
  for v in select value from jsonb_array_elements(c->'records') loop
    if coalesce(v->>'id','')='' or jsonb_typeof(v->'revision') is distinct from 'number' or (v->>'revision')::numeric < 1 or (v->>'revision')::numeric <> trunc((v->>'revision')::numeric) then raise exception 'Invalid record revision.'; end if;
    perform public.validate_organizer_values(c,v->>'collectionId',v->'values');
    if jsonb_typeof(v->'values') is distinct from 'object' or not exists (select 1 from jsonb_array_elements(c->'nodes') candidate where candidate->>'id'=v->>'collectionId' and candidate->>'kind'='collection') then raise exception 'Invalid record.'; end if;
  end loop;
  if jsonb_array_length(c->'skills') <> (select count(distinct x->>'id') from jsonb_array_elements(c->'skills') x)
    or jsonb_array_length(c->'skills') <> (select count(distinct x->>'command') from jsonb_array_elements(c->'skills') x) then raise exception 'Duplicate skills.'; end if;
  for n in select value from jsonb_array_elements(c->'skills') loop
    if coalesce(length(trim(n->>'name')),0) not between 1 and 80 or coalesce(n->>'id','')='' or jsonb_typeof(n->'enabled') is distinct from 'boolean'
      or jsonb_typeof(n->'instructions') is distinct from 'string' or jsonb_typeof(n->'description') is distinct from 'string'
      or coalesce(n->>'command','') !~ '^[a-z][a-z0-9-]{1,39}$' or jsonb_typeof(n->'version') is distinct from 'number'
      or length(n->>'instructions')>20000 or length(n->>'description')>500 or (n->>'version')::numeric<1 or (n->>'version')::numeric<>trunc((n->>'version')::numeric)
      or (n->>'scope' is not null and not exists(select 1 from jsonb_array_elements(c->'nodes') x where x->>'id'=n->>'scope' and x->>'kind' in ('user','entity'))) then raise exception 'Invalid skill.'; end if;
  end loop;
  for v in select value from jsonb_each(l->'views') loop
    if jsonb_typeof(v->'camera'->'zoom') is distinct from 'number' or (v->'camera'->>'zoom')::numeric not between 0.5 and 2
      or jsonb_typeof(v->'camera'->'pan'->'x') is distinct from 'number' or jsonb_typeof(v->'camera'->'pan'->'y') is distinct from 'number'
      or jsonb_typeof(v->'panels') is distinct from 'object' or jsonb_typeof(v->'openPanels') is distinct from 'array' then raise exception 'Invalid canvas layout.'; end if;
    for file in select value from jsonb_each(v->'panels') loop
      if jsonb_typeof(file->'x') is distinct from 'number' or jsonb_typeof(file->'y') is distinct from 'number' then raise exception 'Invalid panel position.'; end if;
    end loop;
    if v ? 'subPositions' then
      if jsonb_typeof(v->'subPositions')<>'object' then raise exception 'Invalid fan positions.'; end if;
      for file in select value from jsonb_each(v->'subPositions') loop
        if jsonb_typeof(file->'x') is distinct from 'number' or jsonb_typeof(file->'y') is distinct from 'number' then raise exception 'Invalid fan position.'; end if;
      end loop;
    end if;
  end loop;
  if jsonb_array_length(c->'attachments') <> (select count(distinct x->>'id') from jsonb_array_elements(c->'attachments') x) then raise exception 'Duplicate attachments.'; end if;
  for file in select value from jsonb_array_elements(c->'attachments') loop
    if jsonb_typeof(file->'name') is distinct from 'string' or jsonb_typeof(file->'type') is distinct from 'string' then raise exception 'Invalid attachment metadata.'; end if;
    if coalesce(file->>'id','') !~ '^[0-9a-f-]{36}$' or jsonb_typeof(file->'size') is distinct from 'number'
      or (file->>'size')::bigint not between 0 and 10485760 or coalesce(file->>'path','') !~ ('^' || owner::text || '/' || (file->>'id') || '/[0-9a-f]{64}$')
      or not exists (select 1 from storage.objects o where o.bucket_id='attachments' and o.name=file->>'path' and (o.metadata->>'size')::bigint=(file->>'size')::bigint)
    then raise exception 'Invalid or missing attachment.'; end if;
    total := total + (file->>'size')::bigint;
  end loop;
  if total > 26214400 then raise exception 'Attachments exceed 25 MB.'; end if;
end;
$$;
