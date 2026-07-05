/**
 * learning-service gRPC 클라이언트 (nice-grpc).
 *
 * BFF `learn` 도메인 → 백엔드 learning-service (채널 = env.grpc.learnAddr, 기본 localhost:50059).
 *
 * proto와 shared LearnContent 간 차이:
 *   - emoji: proto에 없음 → '' (프론트가 category 기반으로 대체 렌더 가능)
 *   - body:  목록(ContentResponse)엔 없음 → '' , 상세(GetContent)에만 채워짐
 *   - duration: proto는 duration_min(int) → shared는 문자열이라 "N분"으로 변환
 * 완료/즐겨찾기 토글 RPC는 user_state만 돌려줘, 결과 조립을 위해 GetContent를 한 번 더 호출한다.
 * 조회는 x-user-id 메타데이터만, 쓰기는 idempotencyKey를 metadata에 싣는다. DATA_SOURCE=grpc일 때만 사용.
 */
import { createClient, Metadata, type Client } from 'nice-grpc';
import type {
  AdminUpsertLearnContentBody,
  LearnContent,
  LearnFavoriteResult,
  LearnLevel,
  LearnProgressResult,
  LearnProgressSummary,
  LearnQuery,
} from '@candle/shared';
import { env } from '../config/env';
import { getChannel } from './channel';
import {
  ContentLevel,
  ContentSortBy,
  LearningServiceDefinition,
  type ContentDetailResponse,
  type ContentResponse,
  type ContentWithStateResponse,
  type UserContentStateResponse,
} from './gen/candle/learning/v1/learning';

type LearningClient = Client<typeof LearningServiceDefinition>;
let learningClient: LearningClient | null = null;
function learning(): LearningClient {
  return (learningClient ??= createClient(LearningServiceDefinition, getChannel(env.grpc.learnAddr)));
}

const userMeta = (userId: string): Metadata => Metadata({ 'x-user-id': userId });
const callMeta = (userId: string, idempotencyKey: string): Metadata =>
  Metadata({ 'x-user-id': userId, 'x-idempotency-key': idempotencyKey });

const PAGE_SIZE = 200; // 목록 필터는 BFF에서 하므로 넉넉히 받아온다.

// ── enum 매핑 ────────────────────────────────────────────────────────
function levelToShared(level: ContentLevel): LearnLevel {
  switch (level) {
    case ContentLevel.CONTENT_LEVEL_INTERMEDIATE:
      return 'intermediate';
    case ContentLevel.CONTENT_LEVEL_ADVANCED:
      return 'advanced';
    default:
      return 'beginner';
  }
}
function levelToProto(level?: LearnLevel): ContentLevel | undefined {
  switch (level) {
    case 'beginner':
      return ContentLevel.CONTENT_LEVEL_BEGINNER;
    case 'intermediate':
      return ContentLevel.CONTENT_LEVEL_INTERMEDIATE;
    case 'advanced':
      return ContentLevel.CONTENT_LEVEL_ADVANCED;
    default:
      return undefined;
  }
}

// ── proto → shared ──────────────────────────────────────────────────
function toShared(c: ContentResponse, state: UserContentStateResponse | undefined, body: string): LearnContent {
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    category: c.category,
    level: levelToShared(c.level),
    duration: `${c.durationMin}분`,
    readCount: Number(c.readCount),
    emoji: '',
    keywords: c.keywords,
    body,
    published: c.isPublished,
    completed: state?.isCompleted ?? false,
    favorite: state?.isFavorite ?? false,
    ...(state?.completedAt ? { completedAt: state.completedAt.toISOString() } : {}),
  };
}

function toSharedAdmin(c: ContentResponse, body = ''): LearnContent {
  return toShared(c, undefined, body);
}

const fromWithState = (cs: ContentWithStateResponse): LearnContent =>
  cs.content ? toShared(cs.content, cs.userState, '') : ({} as LearnContent);

function fromDetail(d: ContentDetailResponse): LearnContent {
  // ContentDetailResponse는 ContentResponse와 필드가 평평하게 같지만 body를 추가로 가진다.
  const base: ContentResponse = {
    id: d.id,
    title: d.title,
    description: d.description,
    category: d.category,
    level: d.level,
    durationMin: d.durationMin,
    xpReward: d.xpReward,
    keywords: d.keywords,
    isPublished: d.isPublished,
    readCount: d.readCount,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
  return toShared(base, d.userState, d.body);
}

// ── 조회 ─────────────────────────────────────────────────────────────
/** 목록 — favorite/q 여부에 따라 알맞은 RPC를 고르고 나머지 필터는 mock과 동일하게 BFF에서 적용. */
export async function grpcListContents(userId: string, query: LearnQuery): Promise<LearnContent[]> {
  const { level, category, q, favorite } = query;
  const protoLevel = levelToProto(level);
  const meta = { metadata: userMeta(userId) };

  let items: LearnContent[];
  if (favorite) {
    const res = await learning().listFavorites({ userId, page: 0, size: PAGE_SIZE }, meta);
    items = res.contents.map(fromWithState);
  } else if (q) {
    const res = await learning().searchContents(
      { userId, query: q, category, level: protoLevel, page: 0, size: PAGE_SIZE },
      meta,
    );
    items = res.contents.map(fromWithState);
  } else {
    const res = await learning().listContents(
      { userId, category, level: protoLevel, sortBy: ContentSortBy.CONTENT_SORT_BY_LATEST, page: 0, size: PAGE_SIZE },
      meta,
    );
    items = res.contents.map(fromWithState);
  }

  // mock과 동일한 최종 필터(멱등) — published + level/category/favorite/q.
  items = items.filter((c) => c.published);
  if (level) items = items.filter((c) => c.level === level);
  if (category) items = items.filter((c) => c.category === category);
  if (favorite) items = items.filter((c) => c.favorite);
  if (q) {
    const needle = q.toLowerCase();
    items = items.filter(
      (c) =>
        c.title.toLowerCase().includes(needle) ||
        c.description.toLowerCase().includes(needle) ||
        c.keywords.some((k) => k.toLowerCase().includes(needle)),
    );
  }
  return items;
}

export async function grpcListFavorites(userId: string): Promise<LearnContent[]> {
  const res = await learning().listFavorites({ userId, page: 0, size: PAGE_SIZE }, { metadata: userMeta(userId) });
  return res.contents.map(fromWithState).filter((c) => c.published);
}

export async function grpcGetRecommended(userId: string, limit: number): Promise<LearnContent[]> {
  const res = await learning().getRecommendedContents({ userId, limit }, { metadata: userMeta(userId) });
  return res.contents.map(fromWithState).filter((c) => c.published);
}

export async function grpcGetProgress(userId: string): Promise<LearnProgressSummary> {
  const res = await learning().getUserLearningStats({ userId }, { metadata: userMeta(userId) });
  return {
    total: res.totalContents,
    completed: res.completedContents,
    percent: res.overallProgressPct,
    byCategory: res.categoryStats.map((s) => ({
      category: s.category,
      total: s.total,
      completed: s.completed,
      percent: s.progressPct,
    })),
  };
}

export async function grpcGetContent(userId: string, contentId: string): Promise<LearnContent | undefined> {
  const res = await learning().getContent({ userId, contentId }, { metadata: userMeta(userId) });
  if (!res.id) return undefined;
  return fromDetail(res);
}

// ── 쓰기 ─────────────────────────────────────────────────────────────
/** 완료 처리 — CompleteContent(user_state)는 콘텐츠 본문을 안 주므로 GetContent로 조립한다. */
export async function grpcCompleteContent(
  userId: string,
  contentId: string,
  idempotencyKey: string,
): Promise<LearnProgressResult> {
  const state = await learning().completeContent({ userId, contentId }, { metadata: callMeta(userId, idempotencyKey) });
  const detail = await learning().getContent({ userId, contentId }, { metadata: userMeta(userId) });
  const content = fromDetail(detail);
  return {
    content,
    completed: state.isCompleted,
    completedAt: (state.completedAt ?? new Date()).toISOString(),
  };
}

export async function grpcToggleFavorite(
  userId: string,
  contentId: string,
  idempotencyKey: string,
): Promise<LearnFavoriteResult> {
  const state = await learning().toggleFavorite({ userId, contentId }, { metadata: callMeta(userId, idempotencyKey) });
  const detail = await learning().getContent({ userId, contentId }, { metadata: userMeta(userId) });
  return { content: fromDetail(detail), favorite: state.isFavorite };
}

// ── 관리자 ───────────────────────────────────────────────────────────
export interface AdminLearnListResult {
  items: LearnContent[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function grpcAdminListContents(input: {
  published?: boolean;
  page: number;
  limit: number;
}): Promise<AdminLearnListResult> {
  const zeroBasedPage = Math.max(input.page - 1, 0);
  const res = await learning().listAdminContents({
    published: input.published,
    page: zeroBasedPage,
    size: input.limit,
  });
  return {
    items: res.contents.map((content) => toSharedAdmin(content)),
    total: res.totalCount,
    page: res.page + 1,
    limit: res.size,
    totalPages: Math.max(1, Math.ceil(res.totalCount / Math.max(res.size, 1))),
  };
}

function levelToContentLevel(level: LearnLevel): ContentLevel {
  return levelToProto(level) ?? ContentLevel.CONTENT_LEVEL_BEGINNER;
}

export async function grpcAdminCreateContent(body: AdminUpsertLearnContentBody): Promise<LearnContent> {
  const res = await learning().createContent({
    title: body.title,
    description: body.description,
    category: body.category,
    level: levelToContentLevel(body.level),
    body: body.body,
    durationMin: body.durationMin,
    xpReward: String(body.xpReward),
    keywords: body.keywords,
    isPublished: body.published,
  });
  return toSharedAdmin(res, body.body);
}

export async function grpcAdminUpdateContent(
  contentId: string,
  body: AdminUpsertLearnContentBody,
): Promise<LearnContent> {
  const res = await learning().updateContent({
    contentId,
    title: body.title,
    description: body.description,
    category: body.category,
    level: levelToContentLevel(body.level),
    body: body.body,
    durationMin: body.durationMin,
    xpReward: String(body.xpReward),
    keywords: body.keywords,
    isPublished: body.published,
  });
  return toSharedAdmin(res, body.body);
}

export async function grpcAdminSetContentVisibility(contentId: string, published: boolean): Promise<LearnContent> {
  const res = await learning().updateContent({ contentId, isPublished: published });
  return toSharedAdmin(res);
}

export async function grpcAdminDeleteContent(contentId: string): Promise<{ success: boolean }> {
  const res = await learning().deleteContent({ contentId });
  return { success: res.success };
}
