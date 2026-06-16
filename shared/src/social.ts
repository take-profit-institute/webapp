import { Type, type Static } from '@sinclair/typebox';

// ── Ranking ────────────────────────────────────────────────────────
export const RankingEntry = Type.Object(
  {
    rank: Type.Number(),
    userId: Type.String(),
    username: Type.String(),
    avatar: Type.String(),
    returnPercent: Type.Number(),
    totalAsset: Type.Number(),
    dayChangePercent: Type.Number({ description: '전일 대비 수익률 변화 (%p)' }),
    badge: Type.Optional(Type.String()),
  },
);
export type RankingEntry = Static<typeof RankingEntry>;

// ── Missions ───────────────────────────────────────────────────────
export const MissionCategory = Type.Union(
  [Type.Literal('daily'), Type.Literal('weekly'), Type.Literal('special')],
);
export type MissionCategory = Static<typeof MissionCategory>;

export const Mission = Type.Object(
  {
    id: Type.String(),
    category: MissionCategory,
    title: Type.String(),
    description: Type.String(),
    reward: Type.Number({ description: 'Reward points' }),
    progress: Type.Number(),
    total: Type.Number(),
    completed: Type.Boolean(),
    icon: Type.String(),
  },
);
export type Mission = Static<typeof Mission>;

export const MissionQuery = Type.Object({
  category: Type.Optional(MissionCategory),
});
export type MissionQuery = Static<typeof MissionQuery>;

// ── Learn ──────────────────────────────────────────────────────────
export const LearnLevel = Type.Union(
  [Type.Literal('beginner'), Type.Literal('intermediate'), Type.Literal('advanced')],
);
export type LearnLevel = Static<typeof LearnLevel>;

export const LearnContent = Type.Object(
  {
    id: Type.String(),
    title: Type.String(),
    description: Type.String(),
    category: Type.String(),
    level: LearnLevel,
    duration: Type.String(),
    readCount: Type.Number(),
    emoji: Type.String(),
  },
);
export type LearnContent = Static<typeof LearnContent>;

export const LearnQuery = Type.Object({
  level: Type.Optional(LearnLevel),
  category: Type.Optional(Type.String()),
});
export type LearnQuery = Static<typeof LearnQuery>;
