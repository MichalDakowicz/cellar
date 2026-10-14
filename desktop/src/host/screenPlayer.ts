/** Runs only inside the ticketed, unprivileged /screen page. */
export const screenPlayer = `
const video=document.querySelector('video'), status=document.querySelector('[role=status]');
let peer=new RTCPeerConnection({iceServers:[],bundlePolicy:'max-bundle'});
const report=(state,error)=>window.ReactNativeWebView?.postMessage(JSON.stringify({type:'screen-video',state,error}));
video.onplaying=()=>report('live');
const lowDelay=receiver=>{try{if('jitterBufferTarget' in receiver)receiver.jitterBufferTarget=0;if('playoutDelayHint' in receiver)receiver.playoutDelayHint=0;}catch{}};
peer.ontrack=e=>{lowDelay(e.receiver);video.srcObject=e.streams[0];video.play().catch(()=>{});};
peer.onconnectionstatechange=()=>{status.textContent=peer.connectionState==='connected'?'':peer.connectionState;if(['failed','disconnected','closed'].includes(peer.connectionState))report('gone','Video disconnected. Reopen the screen.');};
window.addEventListener('pagehide',()=>{peer.close();video.srcObject=null;});
(async()=>{const transceiver=peer.addTransceiver('video',{direction:'recvonly'});lowDelay(transceiver.receiver);await peer.setLocalDescription(await peer.createOffer());
if(peer.iceGatheringState!=='complete')await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Video network setup timed out.')),5000);peer.addEventListener('icegatheringstatechange',()=>{if(peer.iceGatheringState==='complete'){clearTimeout(timer);resolve();}});});
const response=await fetch('/screen/offer',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(peer.localDescription)});
const answer=await response.json();if(!response.ok)throw Error(answer.error||'PC video unavailable.');await peer.setRemoteDescription(answer);
})().catch(error=>{status.textContent=error.message;report('gone',error.message);peer.close();});
`;
