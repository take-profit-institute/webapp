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

export const MissionStatus = Type.Union([
  Type.Literal('available'),
  Type.Literal('in_progress'),
  Type.Literal('completed'),
  Type.Literal('failed'),
  Type.Literal('cancelled'),
]);
export type MissionStatus = Static<typeof MissionStatus>;

export const Mission = Type.Object(
  {
    id: Type.String(),
    category: MissionCategory,
    title: Type.String(),
    description: Type.String(),
    reward: Type.Number({ description: 'Reward points' }),
    badgeReward: Type.Optional(Type.String()),
    achievementReward: Type.Optional(Type.String()),
    progress: Type.Number(),
    total: Type.Number(),
    status: MissionStatus,
    joined: Type.Boolean(),
    completed: Type.Boolean(),
    /** Whether the completed mission's reward has already been claimed. */
    claimed: Type.Optional(Type.Boolean()),
    startedAt: Type.Optional(Type.String({ format: 'date-time' })),
    joinedAt: Type.Optional(Type.String({ format: 'date-time' })),
    endsAt: Type.String({ format: 'date-time' }),
    icon: Type.String(),
  },
);
export type Mission = Static<typeof Mission>;

export const MissionQuery = Type.Object({
  category: Type.Optional(MissionCategory),
  status: Type.Optional(MissionStatus),
});
export type MissionQuery = Static<typeof MissionQuery>;

export const MissionIdParams = Type.Object({ id: Type.String() });
export type MissionIdParams = Static<typeof MissionIdParams>;

export const UpsertMissionBody = Type.Object({
  category: MissionCategory,
  title: Type.String(),
  description: Type.String(),
  reward: Type.Number(),
  total: Type.Integer({ minimum: 1 }),
  icon: Type.String(),
  endsAt: Type.String({ format: 'date-time' }),
  badgeReward: Type.Optional(Type.String()),
  achievementReward: Type.Optional(Type.String()),
});
export type UpsertMissionBody = Static<typeof UpsertMissionBody>;

/** Increment progress on a mission (mock helper). */
export const MissionProgressBody = Type.Object({
  amount: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
});
export type MissionProgressBody = Static<typeof MissionProgressBody>;

/** Result of claiming a completed mission's reward. */
export const ClaimRewardResult = Type.Object({
  mission: Mission,
  rewardedPoints: Type.Number(),
  rewardedBadge: Type.Optional(Type.String()),
  rewardedAchievement: Type.Optional(Type.String()),
  totalPoints: Type.Number({ description: 'Total claimed points after this claim' }),
});
export type ClaimRewardResult = Static<typeof ClaimRewardResult>;

export const MissionProgressStatus = Type.Object({
  total: Type.Number(),
  available: Type.Number(),
  inProgress: Type.Number(),
  completed: Type.Number(),
  failed: Type.Number(),
  cancelled: Type.Number(),
  claimableRewards: Type.Number(),
  badges: Type.Array(Type.String()),
  achievements: Type.Array(Type.String()),
});
export type MissionProgressStatus = Static<typeof MissionProgressStatus>;

export const MissionParticipant = Type.Object({
  userId: Type.String(),
  username: Type.String(),
  missionId: Type.String(),
  status: MissionStatus,
  progress: Type.Number(),
  joinedAt: Type.String({ format: 'date-time' }),
});
export type MissionParticipant = Static<typeof MissionParticipant>;

export const MissionStats = Type.Object({
  missionId: Type.String(),
  participants: Type.Number(),
  completed: Type.Number(),
  failed: Type.Number(),
  completionRate: Type.Number(),
  totalRewardedPoints: Type.Number(),
});
export type MissionStats = Static<typeof MissionStats>;

export const ChallengeStatus = Type.Union([
  Type.Literal('upcoming'),
  Type.Literal('active'),
  Type.Literal('completed'),
]);
export type ChallengeStatus = Static<typeof ChallengeStatus>;

export const Challenge = Type.Object({
  id: Type.String(),
  title: Type.String(),
  description: Type.String(),
  season: Type.String(),
  startsAt: Type.String({ format: 'date-time' }),
  endsAt: Type.String({ format: 'date-time' }),
  status: ChallengeStatus,
  joined: Type.Boolean(),
  participants: Type.Number(),
  myRank: Type.Optional(Type.Number()),
  reward: Type.Number(),
  badgeReward: Type.Optional(Type.String()),
});
export type Challenge = Static<typeof Challenge>;

export const ChallengeIdParams = Type.Object({ id: Type.String() });
export type ChallengeIdParams = Static<typeof ChallengeIdParams>;

export const UpsertChallengeBody = Type.Object({
  title: Type.String(),
  description: Type.String(),
  season: Type.String(),
  startsAt: Type.String({ format: 'date-time' }),
  endsAt: Type.String({ format: 'date-time' }),
  reward: Type.Number(),
  badgeReward: Type.Optional(Type.String()),
});
export type UpsertChallengeBody = Static<typeof UpsertChallengeBody>;

export const ChallengeResult = Type.Object({
  challenge: Challenge,
  rank: Type.Number(),
  returnPercent: Type.Number(),
  rewardedPoints: Type.Number(),
  rewardedBadge: Type.Optional(Type.String()),
});
export type ChallengeResult = Static<typeof ChallengeResult>;

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
    keywords: Type.Array(Type.String()),
    body: Type.String(),
    published: Type.Boolean(),
    completed: Type.Boolean(),
    favorite: Type.Boolean(),
    completedAt: Type.Optional(Type.String({ format: 'date-time' })),
  },
);
export type LearnContent = Static<typeof LearnContent>;

export const LearnQuery = Type.Object({
  level: Type.Optional(LearnLevel),
  category: Type.Optional(Type.String()),
  q: Type.Optional(Type.String()),
  favorite: Type.Optional(Type.Boolean()),
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

export const LearnProgressSummary = Type.Object({
  total: Type.Number(),
  completed: Type.Number(),
  percent: Type.Number(),
  byCategory: Type.Array(Type.Object({
    category: Type.String(),
    total: Type.Number(),
    completed: Type.Number(),
    percent: Type.Number(),
  })),
});
export type LearnProgressSummary = Static<typeof LearnProgressSummary>;

export const LearnFavoriteResult = Type.Object({
  content: LearnContent,
  favorite: Type.Boolean(),
});
export type LearnFavoriteResult = Static<typeof LearnFavoriteResult>;

// ── Admin: Learn management (LEARN-014, LEARN-015) ─────────────────
export const AdminUpdateLearnVisibilityBody = Type.Object({
  published: Type.Boolean(),
});
export type AdminUpdateLearnVisibilityBody = Static<typeof AdminUpdateLearnVisibilityBody>;

export const AdminLearnStats = Type.Object({
  contentId: Type.String(),
  title: Type.String(),
  readCount: Type.Number(),
  completedCount: Type.Number(),
  completionRate: Type.Number(),
  favoriteCount: Type.Number(),
});
export type AdminLearnStats = Static<typeof AdminLearnStats>;

// ── Admin: Mission reward (MISSION-019) ───────────────────────────
export const AdminUpdateMissionRewardBody = Type.Object({
  reward: Type.Number({ minimum: 0 }),
  badgeReward: Type.Optional(Type.String()),
  achievementReward: Type.Optional(Type.String()),
});
export type AdminUpdateMissionRewardBody = Static<typeof AdminUpdateMissionRewardBody>;
