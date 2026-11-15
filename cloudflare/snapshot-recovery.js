/**
 * Preserve authenticated main dashboard access when an optional D1 media,
 * audience or extra-analytics overlay temporarily fails.
 * Called only inside the existing session-protected /api/snapshot route.
 */
export async function snapshotWithRawFallback({hydrate,raw,report=()=>{}}){
 try {
  const result=await hydrate();
  if(result?.platforms?.yt&&result?.platforms?.ig&&result?.platforms?.tt&&result?.generatedAt)
   return {snapshot:result,recovered:false};
  report('Hydrated snapshot unavailable');
 } catch(error) {
  // Never expose private underlying database error messages to the browser.
  report('Hydrated snapshot overlay failed');
 }
 try{
  const original=await raw();
  if(!original?.generatedAt||!original?.platforms?.yt||
    !original?.platforms?.ig||!original?.platforms?.tt)return {snapshot:null,recovered:false};
  return {snapshot:{
   ...original,
   errors:[...(Array.isArray(original.errors)?original.errors:[]),
    'Zusatzdaten vorübergehend nicht verfügbar; gespeicherte Basisdaten angezeigt.'],
   snapshotFallback:'original-d1'
  },recovered:true};
 }catch(error){
  report('Base D1 snapshot not readable');
  return {snapshot:null,recovered:false};
 }
}
