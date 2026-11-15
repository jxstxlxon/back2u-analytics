/** Cloudflare scheduled imports, split into small non-overlapping phases. */
export function syncPhaseForUtcMinute(minute){
 const n=Number(minute);
 if(!Number.isInteger(n)||n<0||n>59)return 'none';
 if(n<15)return 'tiktok-daily';
 if(n<30)return 'instagram-youtube-extras';
 if(n<45)return 'tiktok-profile-instagram-followers';
 return 'instagram-media-audience';
}
