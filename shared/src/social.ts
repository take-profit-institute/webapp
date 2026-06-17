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
    /** Whether the completed mission's reward has already been claimed. */
    claimed: Type.Optional(Type.Boolean()),
    icon: Type.String(),
  },
);
export type Mission = Static<typeof Mission>;

export const MissionQuery = Type.Object({
  category: Type.Optional(MissionCategory),
});
export type MissionQuery = Static<typeof MissionQuery>;

export const MissionIdParams = Type.Object({ id: Type.String() });
export type MissionIdParams = Static<typeof MissionIdParams>;

/** Increment progress on a mission (mock helper). */
export const MissionProgressBody = Type.Object({
  amount: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
});
export type MissionProgressBody = Static<typeof MissionProgressBody>;

/** Result of claiming a completed mission's reward. */
export const ClaimRewardResult = Type.Object({
  mission: Mission,
  rewardedPoints: Type.Number(),
  totalPoints: Type.Number({ description: 'Total claimed points after this claim' }),
});
export type ClaimRewardResult = Static<typeof ClaimRewardResult>;

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

export const LearnIdParams = Type.Object({ id: Type.String() });
export type LearnIdParams = Static<typeof LearnIdParams>;

/** Result of marking a learning content as completed/read. */
export const LearnProgressResult = Type.Object({
  content: LearnContent,
  completed: Type.Boolean(),
  completedAt: Type.String({ format: 'date-time' }),
});
export type LearnProgressResult = Static<typeof LearnProgressResult>;
