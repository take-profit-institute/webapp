/**
 * LearnService gRPC client stub.
 * Owns: learning content catalog, user progress, favorites, quizzes.
 */
import type { GrpcChannel } from '../channel';
import type { GrpcCallOptions } from '../types';
import { notImplemented } from '../types';

export type ContentCategory = 'stock_basics' | 'technical' | 'fundamental' | 'strategy' | 'risk';
export type ContentLevel = 'beginner' | 'intermediate' | 'advanced';

export interface ContentSummary {
  id: string;
  title: string;
  category: ContentCategory;
  level: ContentLevel;
  durationMin: number;
  xpReward: number;
  progressPercent: number;
  isFavorite: boolean;
  completedAt?: string;
}

export interface ContentDetail extends ContentSummary {
  body: string;
  hasQuiz: boolean;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
}

export interface QuizResult {
  score: number;
  total: number;
  xpEarned: number;
  passed: boolean;
}

export interface ContentFilter {
  category?: ContentCategory;
  level?: ContentLevel;
  limit?: number;
  offset?: number;
}

export interface LearnServiceClient {
  listContents(req: ContentFilter, opts?: GrpcCallOptions): Promise<ContentSummary[]>;
  getContent(req: { contentId: string; userId: string }, opts?: GrpcCallOptions): Promise<ContentDetail>;
  markProgress(req: { userId: string; contentId: string; percent: number }, opts?: GrpcCallOptions): Promise<void>;
  toggleFavorite(req: { userId: string; contentId: string }, opts?: GrpcCallOptions): Promise<{ isFavorite: boolean }>;
  getQuiz(req: { contentId: string }, opts?: GrpcCallOptions): Promise<QuizQuestion[]>;
  submitQuiz(req: { userId: string; contentId: string; answers: Record<string, number> }, opts?: GrpcCallOptions): Promise<QuizResult>;
}

class StubLearnServiceClient implements LearnServiceClient {
  listContents(): Promise<ContentSummary[]> { return notImplemented('LearnService', 'listContents'); }
  getContent(): Promise<ContentDetail> { return notImplemented('LearnService', 'getContent'); }
  markProgress(): Promise<void> { return notImplemented('LearnService', 'markProgress'); }
  toggleFavorite(): Promise<{ isFavorite: boolean }> { return notImplemented('LearnService', 'toggleFavorite'); }
  getQuiz(): Promise<QuizQuestion[]> { return notImplemented('LearnService', 'getQuiz'); }
  submitQuiz(): Promise<QuizResult> { return notImplemented('LearnService', 'submitQuiz'); }
}

export function createLearnServiceClient(_channel: GrpcChannel): LearnServiceClient {
  return new StubLearnServiceClient();
}
