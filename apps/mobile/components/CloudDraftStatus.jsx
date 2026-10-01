import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { cloudDrafts } from '../lib/cloudDrafts';
const copy={unsaved:'Your draft has not been saved on this device yet.',local:'Saved on this device. Account sync is pending.',syncing:'Syncing draft and photos…',synced:'Synced to your account. Continue on your phone or computer within 30 days.',offline:'Saved on this device. Connect to sync your draft.',conflict:'This draft differs from your account draft. Choose which version to keep.',submitting:'Submission in progress. Retry to check the original submission.'};
export default function CloudDraftStatus({userId,draftKey,onRestored}) {
  const [status,setStatus]=useState(()=>cloudDrafts.status(userId,draftKey));const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  useEffect(()=>cloudDrafts.subscribe((owner,key,next)=>{if(owner===userId&&key===draftKey)setStatus(next);}),[userId,draftKey]);
  async function act(choice) {
    setBusy(true);setError('');
    try {if(choice){const value=await cloudDrafts.resolve(userId,draftKey,choice);if(choice==='account')onRestored?.(value);}else await cloudDrafts.save(userId,draftKey);}
    catch(error){setError(error.message||'Your draft could not sync.');}finally{setBusy(false);}
  }
  const button=(label,choice)=><TouchableOpacity key={label} accessibilityRole="button" disabled={busy} onPress={()=>act(choice)} style={{paddingVertical:10,paddingHorizontal:4}}><Text style={{color:'#2F7D32',fontWeight:'600'}}>{label}</Text></TouchableOpacity>;
  return <View style={{padding:12,backgroundColor:'#F5F7F5',borderRadius:12,marginVertical:8}}><Text accessibilityLiveRegion="polite">{copy[status]}</Text>{error?<Text style={{color:'#B42318'}}>{error}</Text>:null}{status==='conflict'?<>{button('Use account draft','account')}{button('Keep this device’s draft','device')}</>:['local','offline'].includes(status)?button('Sync now'):status==='submitting'?button('Restore submitted draft','account'):null}</View>;
}
