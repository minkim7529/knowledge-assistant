-- Supabase(Postgres) 스키마: 멀티모달 지식 어시스턴트
-- Supabase SQL Editor에서 실행

create extension if not exists vector;

create table if not exists documents (
    id uuid primary key default gen_random_uuid(),
    filename text not null,
    mime_type text not null,
    created_at timestamptz not null default now()
);

create table if not exists chunks (
    id uuid primary key default gen_random_uuid(),
    document_id uuid not null references documents(id) on delete cascade,
    chunk_index int not null,
    content text not null,
    content_tsv tsvector generated always as (to_tsvector('simple', content)) stored,
    embedding vector(768),
    created_at timestamptz not null default now()
);

create index if not exists chunks_embedding_idx
    on chunks using hnsw (embedding vector_cosine_ops);

create index if not exists chunks_tsv_idx
    on chunks using gin (content_tsv);

create table if not exists images (
    id uuid primary key default gen_random_uuid(),
    document_id uuid references documents(id) on delete cascade,
    filename text not null,
    storage_path text not null,
    caption text not null,
    caption_tsv tsvector generated always as (to_tsvector('simple', caption)) stored,
    embedding vector(768),
    created_at timestamptz not null default now()
);

create index if not exists images_embedding_idx
    on images using hnsw (embedding vector_cosine_ops);

create index if not exists images_tsv_idx
    on images using gin (caption_tsv);

create table if not exists conversations (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now()
);

create table if not exists messages (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references conversations(id) on delete cascade,
    role text not null check (role in ('user', 'assistant')),
    content text not null,
    citations jsonb not null default '[]',
    created_at timestamptz not null default now()
);

-- 하이브리드 검색용 RPC 함수
-- 참고: to_tsvector('simple', ...)는 한국어 형태소 분석을 하지 않고 공백/구두점 기준으로만
-- 토큰화한다 (Supabase 기본 제공 범위 내 한계). 의미 검색(vector)이 주력이고,
-- FTS는 키워드 매칭을 보완하는 역할로 하이브리드 검색에 함께 사용된다.

create or replace function match_chunks(query_embedding vector(768), match_count int)
returns table (id uuid, document_id uuid, chunk_index int, content text, similarity float)
language sql stable
as $$
    select id, document_id, chunk_index, content,
           1 - (embedding <=> query_embedding) as similarity
    from chunks
    order by embedding <=> query_embedding
    limit match_count;
$$;

create or replace function match_images(query_embedding vector(768), match_count int)
returns table (id uuid, document_id uuid, filename text, storage_path text, caption text, similarity float)
language sql stable
as $$
    select id, document_id, filename, storage_path, caption,
           1 - (embedding <=> query_embedding) as similarity
    from images
    order by embedding <=> query_embedding
    limit match_count;
$$;

create or replace function search_chunks_fts(query text, match_count int)
returns table (id uuid, document_id uuid, chunk_index int, content text, rank float)
language sql stable
as $$
    select id, document_id, chunk_index, content,
           ts_rank(content_tsv, websearch_to_tsquery('simple', query)) as rank
    from chunks
    where content_tsv @@ websearch_to_tsquery('simple', query)
    order by rank desc
    limit match_count;
$$;

create or replace function search_images_fts(query text, match_count int)
returns table (id uuid, document_id uuid, filename text, storage_path text, caption text, rank float)
language sql stable
as $$
    select id, document_id, filename, storage_path, caption,
           ts_rank(caption_tsv, websearch_to_tsquery('simple', query)) as rank
    from images
    where caption_tsv @@ websearch_to_tsquery('simple', query)
    order by rank desc
    limit match_count;
$$;
