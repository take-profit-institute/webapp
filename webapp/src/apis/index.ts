/**
 * Candle BFF client — single entry point for all backend requests.
 *
 *   import { getStocks, getAccount, useApi } from '@/apis';
 *
 * Modules are namespaced to avoid name clashes (both market and account expose
 * symbol-ish helpers), and the most-used functions are also re-exported flat.
 */
export * as marketApi from './market';
export * as notificationApi from './notifications';
export * as accountApi from './account';
export * as authApi from './auth';
export * as socialApi from './social';
export * as usersApi from './users';

export { API_BASE_URL, ApiError, apiClient, setAuthTokenGetter, setTokenRefresher } from './client';
export { useApi } from './useApi';
export type { UseApiResult } from './useApi';

// Flat re-exports for the common calls.
export {
  MARKET_SYMBOLS,
  getStocks,
  getMovers,
  getStock,
  getCandles,
  getStockNews,
  getMarketStatus,
  getIntradayHistory,
  getSparklines,
} from './market';
export {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from './notifications';
export {
  getAccount,
  getAccountBalance,
  getLockedOrders,
  getReservations,
  getReservation,
  createReservation,
  cancelReservation,
  amendReservation,
  getHoldings,
  getHolding,
  getTransactions,
  getPortfolioHistory,
  getAllocation,
  placeOrder,
  getOrders,
  getOrder,
  cancelOrder,
  amendOrder,
  resetAccount,
  deactivateAccount,
  getWatchlist,
  addWatchlist,
  removeWatchlist,
} from './account';
export {
  getProviders,
  oauthLogin,
  refreshToken,
  validateToken,
  logout,
  getMe,
  updateProfile,
  deleteAccount,
  login,
  signup,
} from './auth';
export {
  getMyProfile,
  updateMyProfile,
  checkNickname,
  withdraw,
  getMyPageSummary,
} from './users';
export {
  LEARN_CONTENT_IDS,
  CHALLENGE_IDS,
  getRankings,
  getMyRanking,
  getMissions,
  getMission,
  getMissionProgressStatus,
  joinMission,
  cancelMissionParticipation,
  getChallenges,
  getChallenge,
  joinChallenge,
  getChallengeResult,
  getLearnContents,
  getLearnProgress,
  getFavoriteLearnContents,
  getRecommendedLearnContents,
  getLearnContent,
  claimMission,
  progressMission,
  completeLearn,
  toggleLearnFavorite,
} from './social';
