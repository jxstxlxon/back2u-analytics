/**
 * Bound the official TikTok Display video.list scan per invocation.
 * Each page is max_count=20; a fixed 25-page budget (500 videos)
 * cannot finish a catalog above 500 in a single sync, repeatedly writing
 * a "video-list" warning even when the stored catalog is healthy.
 *
 * Keep a strict maximum so an unexpectedly large history is continued from
 * the saved cursor by the next scheduled/owner sync rather than making an
 * unbounded API request. Snapshot values are never guessed or discarded.
 */
export const TIKTOK_VIDEOS_PER_PAGE=20;
export const TIKTOK_MIN_PAGES=30;
export const TIKTOK_MAX_PAGES=40;
export function tiktokScanPageBudget(previouslyStored){
 const saved=Number(previouslyStored);
 const count=Number.isSafeInteger(saved)&&saved>=0?saved:0;
 const desired=Math.ceil((Math.min(count,Number.MAX_SAFE_INTEGER-60)+60)/TIKTOK_VIDEOS_PER_PAGE);
 return Math.min(TIKTOK_MAX_PAGES,Math.max(TIKTOK_MIN_PAGES,desired));
}
