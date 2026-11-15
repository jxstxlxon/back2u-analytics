/** Cloudflare scheduled imports, split into small non-overlapping phases. */
export function syncPhaseForUtcMinute(minute){
 const n=Number(minute);
 if(!Number.isInteger(n)||n<0||n>59)return 'none';
 if(n<15)return 'tiktok-daily';
 if(n<30)return 'instagram-youtube-extras';
 if(n<45)return 'tiktok-profile-instagram-followers';
 return 'instagram-media-audience';
}

/** A pre-existing 30-minute Cloudflare trigger may survive a source deploy.
 * Its tick at :00/:30 must still run the extras normally assigned to :15/:45.
 * Ignore unknown expressions rather than assuming a schedule we cannot prove. */
export function isLegacyThirtyMinuteCron(cron){
 return ['*/30 * * * *','0,30 * * * *'].includes(String(cron||'').trim());
}
