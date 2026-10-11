// Aura engine v5 — 13 key images of Aura (left profile -> front -> right profile) stitched live with two-way optical flow; — one photo, one GPU pass. Head/breath idle motion, eye darts + blinks,
// and a six-muscle mouth (jaw, spread, pucker, press, tuck) driven by text timing or by live audio formants (LPC).
function AuraEngine(cv,FS,opts){
  opts=opts||{};
  const gl=cv.getContext('webgl2',{premultipliedAlpha:false,preserveDrawingBuffer:true}); if(!gl)throw new Error('This browser has no WebGL2.');
  const W=opts.meta.W||1408,H=opts.meta.H||768;
  const DEF={A:{neck:[790,545],face:[800,330],mouth:[799,390],mw:36,er:[740,263,34,12],el:[850,267,27,11],chin:458,sh:580},
    tune:{mouthDx:0,mouthDy:0,mwScale:1,lid:2.15,low:.25,lash:.8,glow:.18,gaze:1.6,jaw:15,wid:.12,rnd:.22,dark:.4,teeth:.75,ulip:.15,stiff:32,damp:1,lead:70}};
  const cfg=JSON.parse(JSON.stringify(DEF));if(opts.meta&&opts.meta.calib&&opts.meta.calib.tune)Object.assign(cfg.tune,opts.meta.calib.tune);   // mouth range measured from the uploaded pictures
  function mirrorLM(L){const f=x=>W-1-x;return{neck:[f(L.neck[0]),L.neck[1]],face:[f(L.face[0]),L.face[1]],mouth:[f(L.mouth[0]),L.mouth[1]],mw:L.mw,
    er:[f(L.el[0]),L.el[1],L.el[2],L.el[3]],el:[f(L.er[0]),L.er[1],L.er[2],L.er[3]],chin:L.chin,sh:L.sh};}
  // ---------- GL ----------
  const VS=`#version 300 es
in vec2 p; out vec2 uv; void main(){uv=vec2(p.x*.5+.5,.5-p.y*.5); gl_Position=vec4(p,0,1);}`;
  const sh=(t,s)=>{const x=gl.createShader(t);gl.shaderSource(x,s);gl.compileShader(x);if(!gl.getShaderParameter(x,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(x));return x;};
  const P=gl.createProgram();gl.attachShader(P,sh(gl.VERTEX_SHADER,VS));gl.attachShader(P,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(P);
  if(!gl.getProgramParameter(P,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(P));
  gl.useProgram(P);const vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  const lp=gl.getAttribLocation(P,'p');gl.enableVertexAttribArray(lp);gl.vertexAttribPointer(lp,2,gl.FLOAT,false,0,0);
  const UL={};const U=n=>UL[n]!==undefined?UL[n]:(UL[n]=gl.getUniformLocation(P,n));
  const META=opts.meta.frames,NF=META.length;const tex=new Array(NF);let loaded=0;
  function loadTex(i){const im=new Image();im.onload=()=>{const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
    [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER].forEach(p=>gl.texParameteri(gl.TEXTURE_2D,p,gl.LINEAR));
    [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T].forEach(p=>gl.texParameteri(gl.TEXTURE_2D,p,gl.CLAMP_TO_EDGE));
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,im);tex[i]=t;loaded++;opts.onLoad&&opts.onLoad(loaded,NF);};
    im.onerror=()=>opts.onError&&opts.onError('Could not load frame '+i);im.src=(opts.assets&&opts.assets['aura_k'+i+'.webp'])||(opts.base||'')+'aura_k'+i+'.webp';}
  // load the starting frame first, then outward
  const flo=new Array(NF-1);
  function loadFlow(i){const im=new Image();im.onload=()=>{const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
    [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER].forEach(p=>gl.texParameteri(gl.TEXTURE_2D,p,gl.LINEAR));
    [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T].forEach(p=>gl.texParameteri(gl.TEXTURE_2D,p,gl.CLAMP_TO_EDGE));
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,im);flo[i]=t;};im.src=(opts.assets&&opts.assets['aura_kf'+i+'.png'])||(opts.base||'')+'aura_kf'+i+'.png';}
  for(let i=0;i<NF-1;i++)loadFlow(i);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);const ZERO=(()=>{const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,1,1,0,gl.RGB,gl.UNSIGNED_BYTE,new Uint8Array([128,128,0]));return t;})();
  const start=opts.startFrame!=null?opts.startFrame:0;const order=[...Array(NF).keys()].sort((a,b)=>Math.abs(a-start)-Math.abs(b-start));order.forEach(loadTex);
  const lerp=(a,b,f)=>a+(b-a)*f,lerp2=(a,b,f)=>a.map((v,i)=>lerp(v,b[i],f));
  function lmAt(y){const i=Math.max(0,Math.min(NF-2,Math.floor(y))),f=Math.max(0,Math.min(1,y-i)),A=META[i],B=META[i+1];
    const eye=(a,b)=>a[0]<-500?b:b[0]<-500?a:lerp2(a,b,f);
    return{i,f,talk:(f<.5?A:B).talk,neck:lerp2(A.neck,B.neck,f),face:lerp2(A.face,B.face,f),mouth:lerp2(A.mouth,B.mouth,f),mw:lerp(A.mw,B.mw,f),mcl:lerp2(A.mcl,B.mcl,f),mcr:lerp2(A.mcr,B.mcr,f),mpx:lerp(A.mpx,B.mpx,f),er:eye(A.er,B.er),el:eye(A.el,B.el),
      chin:lerp(A.chin,B.chin,f),sh:lerp(A.sh,B.sh,f),shR:lerp2(A.shR,B.shR,f),shL:lerp2(A.shL,B.shL,f)};}
  const S={yaw:start,yawTarget:start,sway:true,bg:0,view:[0,0,W,H],inset:null,speaking:false,mode:'idle',hold:null,blinkHold:null,gazeHold:null,idle:true};
  // ---------- articulators ----------
  const KEYS=['jaw','wid','rnd','prs','tuck'];
  const art={},tgt={};KEYS.forEach(k=>{art[k]=[0,0];tgt[k]=0;});
  const TARGET={rest:[0,0,0,0,0],MBP:[0,0,0,1,0],AA:[.85,.3,0,0,0],EH:[.6,.55,0,0,0],EE:[.32,1,0,0,0],IH:[.45,.65,0,0,0],
    OH:[.7,0,.7,0,0],OO:[.22,0,1,0,0],UH:[.5,.15,.15,0,0],ER:[.3,.05,.5,0,0],FV:[.12,.15,0,0,1],LTH:[.38,.35,0,0,0],
    SZ:[.14,.6,0,0,0],CH:[.22,0,.65,0,0],KG:[.4,.3,0,0,0],HH:[.35,.25,0,0,0]};
  let cur='rest';
  function setTarget(v){const t=TARGET[v]||TARGET.rest;KEYS.forEach((k,i)=>tgt[k]=t[i]);cur=v;}
  function setRaw(o){KEYS.forEach(k=>{if(o[k]!=null)tgt[k]=o[k];});}
  // ---------- text -> visemes (rules, no dictionary) ----------
  const VOW='aeiouy';
  function g2v(w){w=w.toLowerCase().replace(/[^a-z']/g,'');const out=[];const V=(v,d)=>out.push([v,d]);let i=0;
    const magicE=w.length>3&&w.endsWith('e')&&!VOW.includes(w[w.length-2])&&VOW.includes(w[w.length-3]);
    const end=magicE?w.length-1:w.length;
    while(i<end){const c=w[i],n=w[i+1]||'',n2=w[i+2]||'',t=w.slice(i,i+3),d=w.slice(i,i+2);
      if(t==='tch'){V('CH',1.1);i+=3;continue;} if(t==='igh'){V('AA',1.4);V('IH',1);i+=3;continue;}
      if(d==='ch'||d==='sh'){V('CH',1.1);i+=2;continue;} if(d==='th'){V('LTH',1);i+=2;continue;} if(d==='ph'){V('FV',1.1);i+=2;continue;}
      if(d==='wh'){V('OO',.9);i+=2;continue;} if(d==='ng'||d==='ck'){V('KG',1);i+=2;continue;} if(d==='qu'){V('KG',.8);V('OO',.8);i+=2;continue;}
      if(d==='oo'){V('OO',2);i+=2;continue;} if(d==='ou'||d==='ow'){V('AA',1.3);V('OO',1);i+=2;continue;} if(d==='oi'||d==='oy'){V('OH',1.3);V('IH',1);i+=2;continue;}
      if(d==='ai'||d==='ay'||d==='ei'||d==='ey'){V('EH',1.3);V('IH',1);i+=2;continue;} if(d==='ee'||d==='ea'||d==='ie'){V('EE',2);i+=2;continue;}
      if(d==='au'||d==='aw'){V('OH',2);i+=2;continue;} if((d==='er'||d==='ir'||d==='ur')&&!VOW.includes(n2)){V('ER',1.8);i+=2;continue;}
      if(d==='ar'&&!VOW.includes(n2)){V('AA',1.8);i+=2;continue;} if(d==='or'&&!VOW.includes(n2)){V('OH',1.8);i+=2;continue;}
      const long=magicE&&i===end-2;
      if(c==='a'){if(long){V('EH',1.3);V('IH',1);}else V('AA',2);}
      else if(c==='e'){V('EH',1.8);} else if(c==='i'){if(long){V('AA',1.3);V('IH',1);}else V('IH',1.8);}
      else if(c==='o'){if(long){V('OH',1.4);V('OO',.9);}else V('OH',2);} else if(c==='u'){if(long)V('OO',2);else V('UH',1.7);}
      else if(c==='y'){if(i===0)V('EE',.8);else V('EE',1.6);}
      else if('mbp'.includes(c)){if(n!==c)V('MBP',1.1);} else if('fv'.includes(c)){if(n!==c)V('FV',1.1);}
      else if(c==='w')V('OO',.9); else if(c==='r')V('ER',.9); else if('ltdn'.includes(c)){if(n!==c)V('LTH',.9);}
      else if(c==='s'||c==='z'){if(n!==c)V('SZ',1);} else if(c==='c'){V('ieyr'.includes(n)&&n!=='r'?'SZ':'KG',1);}
      else if('kgq'.includes(c)){if(n!==c)V('KG',.9);} else if(c==='x'){V('KG',.7);V('SZ',.8);} else if(c==='j'){V('CH',1);} else if(c==='h'){V('HH',.6);}
      i++;}
    return out.length?out:[['UH',1]];}
  let Q=[],nodKick=0,nk=0,pauseBlink=0;
  function queueWord(word,t0,ms,punct){const seq=g2v(word);const tot=seq.reduce((s,x)=>s+x[1],0);let t=t0;
    for(const [v,d] of seq){Q.push({t,v});t+=ms*d/tot;}Q.push({t,v:'rest',soft:1});if(punct){Q.push({t:t+20,v:'rest',pause:1});}}
  const MSCHAR=72;
  function fallback(text){S.speaking=true;Q=[];let t=performance.now()+30;
    for(const m of text.matchAll(/([A-Za-z']+)([^A-Za-z']*)/g)){const w=m[1],p=/[.,!?;:]/.test(m[2]);const ms=Math.max(140,w.length*MSCHAR);
      queueWord(w,t,ms,p);Q.push({t:t+ms*.1,v:null,kick:1});t+=ms+(p?260:70);}
    Q.push({t:t+40,v:'rest',end:1});Q.sort((a,b)=>a.t-b.t);}
  let aEl=null,actx=null,an=null,srcNode=null;
  function stop(){if('speechSynthesis' in window)speechSynthesis.cancel();if(aEl){try{aEl.pause();}catch(e){}aEl=null;}streamCut();
    if(tabStream){tabStream.getTracks().forEach(t=>t.stop());tabStream=null;}
    if(srcNode){try{srcNode.disconnect();}catch(e){}srcNode=null;}an=null;Q=[];S.speaking=false;S.mode='idle';setTarget('rest');}
  // Aura is female: pick the best female English voice on this device (Edge/Windows natural voices first), never a male one.
  const FEM=/\b(ava|emma|jenny|aria|michelle|libby|sonia|maisie|natasha|clara|zira|hazel|susan|samantha|allison|victoria|karen|moira|tessa|fiona|serena|female|woman|heera|catherine|linda|eva)\b|google us english/i,
        MALE=/\b(guy|david|mark|george|ryan|daniel|alex|fred|tom|rishi|christopher|eric|roger|steffan|andrew|brian|male|man|thomas|oliver|arthur|aaron|ravi|james|william|liam|connor)\b/i;
  let fvC=null;function femaleVoice(){if(!('speechSynthesis' in window))return null;if(fvC)return fvC;const vs=speechSynthesis.getVoices().filter(v=>/^en/i.test(v.lang)&&!MALE.test(v.name));if(!vs.length)return null;
    const sc=v=>(FEM.test(v.name)?10:0)+(/natural|neural|online/i.test(v.name)?4:0)+(/en[-_]us/i.test(v.lang)?2:0)+(v.localService?0:1);fvC=vs.sort((a,b)=>sc(b)-sc(a))[0];return FEM.test(fvC.name)?fvC:(fvC=null,vs.find(v=>FEM.test(v.name))||null);}
  if('speechSynthesis' in window){speechSynthesis.getVoices();speechSynthesis.addEventListener&&speechSynthesis.addEventListener('voiceschanged',()=>{fvC=null;});}
  function speak(text,onStatus,voiceOpts){text=(text||'').trim();if(!text)return;stop();S.mode='voice';
    if(!('speechSynthesis' in window)){fallback(text);onStatus&&onStatus('No browser voice here, so the mouth runs on estimated timing without sound.');return;}
    const u=new SpeechSynthesisUtterance(text);const fv=femaleVoice();if(fv)u.voice=fv;u.pitch=fv&&!/google/i.test(fv.name)?1.05:1.12;if(voiceOpts){if(voiceOpts.voice)u.voice=voiceOpts.voice;if(voiceOpts.rate)u.rate=voiceOpts.rate;if(voiceOpts.pitch)u.pitch=voiceOpts.pitch;}
    let got=false;
    u.onboundary=e=>{if(e.name&&e.name!=='word')return;got=true;if(voiceOpts&&voiceOpts.onWord)try{voiceOpts.onWord(e.charIndex);}catch(_){}const rest=text.slice(e.charIndex);const m=rest.match(/^\s*([A-Za-z']+)([^A-Za-z']*)/);if(!m)return;
      const now=performance.now();Q=Q.filter(q=>q.t<now+10);queueWord(m[1],now,Math.max(130,m[1].length*MSCHAR/(u.rate||1)),/[.,!?;:]/.test(m[2]));nodKick=Math.max(nodKick,.6);};
    u.onstart=()=>{S.speaking=true;setTimeout(()=>{if(!got)fallback(text);},400);};
    u.onend=()=>{if(voiceOpts&&voiceOpts.onEnd)try{voiceOpts.onEnd();}catch(_){}S.speaking=false;Q.push({t:performance.now(),v:'rest'});S.mode='idle';pauseBlink=1;};
    let started=false;const os=u.onstart;u.onstart=()=>{started=true;os();};u.onerror=()=>{if(!got)fallback(text);};speechSynthesis.speak(u);setTimeout(()=>{if(!started&&!got&&S.mode==='voice')fallback(text);},800);onStatus&&onStatus('Speaking.');}
  // ---------- live audio -> formants (LPC) -> muscles ----------
  let td=null,fd=null,F1=500,F2=1500,f1h=[500,500,500],f2h=[1500,1500,1500],floor=-60,peakDb=-20,quiet=1,voicedAgo=9,prevE=0;const lev={L:0,F1:0,F2:0,fric:0,voiced:false};
  function ensureCtx(){actx=actx||new(window.AudioContext||window.webkitAudioContext)();actx.resume();return actx;}
  function makeAnalyser(){an=actx.createAnalyser();an.fftSize=2048;an.smoothingTimeConstant=0;td=new Float32Array(an.fftSize);fd=new Float32Array(an.frequencyBinCount);return an;}
  function listen(stream){stop();ensureCtx();srcNode=actx.createMediaStreamSource(stream);srcNode.connect(makeAnalyser());S.mode='live';}
  // ---------- streamed agent voice: raw PCM chunks (Gemini Live, OpenAI Realtime, any TTS socket) ----------
  let sBus=null,sNext=0,sSrcs=[],sEndAt=0,tabStream=null;
  function toFloat(chunk){
    if(typeof chunk==='string'){const b=atob(chunk),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);chunk=u.buffer;}
    if(chunk instanceof Float32Array)return chunk;
    if(chunk instanceof ArrayBuffer)chunk=new Int16Array(chunk.byteLength>>1?chunk.slice(0,chunk.byteLength&~1):chunk);
    else if(chunk&&chunk.buffer&&!(chunk instanceof Int16Array))chunk=new Int16Array(chunk.buffer,chunk.byteOffset,chunk.byteLength>>1);
    const f=new Float32Array(chunk.length);for(let i=0;i<chunk.length;i++)f[i]=chunk[i]/32768;return f;}
  function streamBus(){ensureCtx();if(sBus&&an&&S.mode==='stream')return sBus;
    if(S.mode!=='stream'){if(aEl){try{aEl.pause();}catch(e){}aEl=null;}if(srcNode){try{srcNode.disconnect();}catch(e){}srcNode=null;}}
    sBus=actx.createGain();const a=makeAnalyser();sBus.connect(a);sBus.connect(actx.destination);vaReset();
    S.mode='stream';return sBus;}
  function pushAudio(chunk,sampleRate){const f=toFloat(chunk);if(!f.length)return;const bus=streamBus();const sr=sampleRate||24000;
    const buf=actx.createBuffer(1,f.length,sr);buf.copyToChannel(f,0);const s=actx.createBufferSource();s.buffer=buf;s.connect(bus);
    const t0=Math.max(sNext,actx.currentTime+.08);s.start(t0);sNext=t0+buf.duration;sEndAt=sNext;sSrcs.push(s);s.onended=()=>{sSrcs=sSrcs.filter(x=>x!==s);};
    vaFeed(f,sr,t0);}
  function streamCut(){sSrcs.forEach(s=>{try{s.stop();}catch(e){}});sSrcs=[];sNext=0;VA.tl=[];if(sBus){try{sBus.disconnect();}catch(e){}sBus=null;}}
  function interrupt(){streamCut();an=null;S.mode='idle';setTarget('rest');}
  async function listenTab(){                     // lip-sync to whatever voice plays in another browser tab or app window
    const st=await navigator.mediaDevices.getDisplayMedia({video:true,audio:{echoCancellation:false,noiseSuppression:false}});
    st.getVideoTracks().forEach(t=>t.stop());if(!st.getAudioTracks().length)throw new Error('no-audio');
    stop();ensureCtx();tabStream=st;srcNode=actx.createMediaStreamSource(st);srcNode.connect(makeAnalyser());S.mode='tab';
    st.getAudioTracks()[0].addEventListener('ended',()=>{an=null;S.mode='idle';});return st;}
  function attachStream(stream,play){stop();ensureCtx();srcNode=actx.createMediaStreamSource(stream);srcNode.connect(makeAnalyser());
    if(play!==false){const dl=actx.createDelay(1);dl.delayTime.value=(cfg.tune.lead||0)/1000;srcNode.connect(dl);dl.connect(actx.destination);}S.mode='stream-media';}
  function attachElement(el){stop();ensureCtx();aEl=el;srcNode=actx.createMediaElementSource(el);const a=makeAnalyser();srcNode.connect(a);
    const dl=actx.createDelay(1);dl.delayTime.value=(cfg.tune.lead||0)/1000;srcNode.connect(dl);dl.connect(actx.destination);S.mode='recording';
    el.addEventListener('ended',()=>{an=null;S.mode='idle';setTarget('rest');pauseBlink=1;},{once:true});}
  async function playFile(f,onStatus){stop();ensureCtx();
    try{const buf=await actx.decodeAudioData(await f.arrayBuffer());const ch=buf.getChannelData(0);pushAudio(ch,buf.sampleRate);onStatus&&onStatus('Lip-syncing to your recording.');}
    catch(e){const el=new Audio(URL.createObjectURL(f));attachElement(el);el.play().catch(()=>{});onStatus&&onStatus('Lip-syncing to your recording.');}}
  // ---------- voice -> mouth timeline (streams and recordings): analysed ahead of playback, so the mouth is never late ----------
  const VA={tl:[],carry:null,carryT:0,peak:-30,floor:-70,f1:[500,500,500],f2:[1500,1500,1500],sil:0,dbh:[-90,-90,-90,-90]};
  function vaReset(){VA.tl=[];VA.carry=null;VA.sil=0;}
  function formants(x,fs){                     // LPC envelope peaks of one decimated, pre-emphasised, windowed frame
    const N=x.length;for(let i=N-1;i>0;i--)x[i]-=.94*x[i-1];for(let i=0;i<N;i++)x[i]*=.54-.46*Math.cos(2*Math.PI*i/(N-1));
    for(let k=0;k<=P_ORD;k++){let s=0;for(let i=k;i<N;i++)s+=x[i]*x[i-k];ac[k]=s;}ac[0]*=1.0001;if(!levinson())return null;
    let prev=0,prev2=0,mx=0;const K=160,FM=Math.min(3600,fs/2),pk=[];
    for(let k=0;k<=K;k++){const w=2*Math.PI*(k/K*FM)/fs;let re=0,im=0;for(let j=0;j<=P_ORD;j++){re+=lpc[j]*Math.cos(w*j);im-=lpc[j]*Math.sin(w*j);}
      const env=1/(re*re+im*im);if(k>1&&prev>prev2&&prev>env)pk.push([(k-1)/K*FM,prev]);mx=Math.max(mx,env);prev2=prev;prev=env;}
    const p1=pk.find(p=>p[0]>=230&&p[0]<=1050&&p[1]>.08*mx);if(!p1)return null;let best=null;
    for(const p of pk)if(p[0]>=Math.max(p1[0]+250,700)&&p[0]<=2900&&(!best||p[1]>best[1]))best=p;return[p1[0],best?best[0]:null];}
  function vaFeed(f,sr,t0){
    let x=f,start=t0;if(VA.carry&&Math.abs(VA.carryT-t0)<.002){x=new Float32Array(VA.carry.length+f.length);x.set(VA.carry);x.set(f,VA.carry.length);start=t0-VA.carry.length/sr;}
    const hop=Math.round(sr*.01),win=Math.round(sr*.025),dec=Math.max(1,Math.round(sr/8000)),fs=sr/dec;let i=0;
    for(;i+win<=x.length;i+=hop){
      const n=Math.floor(win/dec),d=new Float64Array(n);let e=0,zc=0,de=0;
      for(let k=0;k<n;k++){let s=0;for(let j=0;j<dec;j++)s+=x[i+k*dec+j];d[k]=s/dec;e+=d[k]*d[k];}
      for(let k=1;k<win;k++){const a=x[i+k],b=x[i+k-1];de+=(a-b)*(a-b);if((a>0)!==(b>0))zc++;}
      const raw=e/n,db=10*Math.log10(raw+1e-12),hf=de/(4*raw*win+1e-12);
      VA.peak=Math.max(db,VA.peak-.02);VA.floor=Math.min(db,VA.floor+.004);if(VA.peak-VA.floor<25)VA.peak=VA.floor+25;
      const L=Math.min(1,Math.max(0,(db-VA.floor-6)/(VA.peak-VA.floor-6))),t=start+(i+win/2)/sr;
      const rise=db-VA.dbh[0];VA.dbh.shift();VA.dbh.push(db);let m;
      if(L<.08){m={t,jaw:0,wid:0,rnd:0,prs:0,tuck:0,L};VA.sil++;}
      else{
        if(VA.sil>=3&&VA.sil<=30){for(let k=VA.tl.length-1,c=0;k>=0&&c<VA.sil;k--,c++)VA.tl[k].prs=.75;}   // short pause between words: lips meet
        if(VA.sil>=2&&rise>14){for(let k=VA.tl.length-1,c=0;k>=0&&c<5;k--,c++){VA.tl[k].prs=1;VA.tl[k].jaw=0;}}  // burst after silence (p, b, m): close first
        const fresh=VA.sil>=3;VA.sil=0;const zcr=zc/win;
        if(hf>.55&&zcr>.25){m=hf>.8?{t,jaw:.08+.1*L,wid:.5,rnd:0,prs:0,tuck:0,L}:{t,jaw:.08,wid:.15,rnd:0,prs:0,tuck:.6,L};}  // s/z vs f/v
        else{const F=formants(d,fs);if(F){if(fresh){VA.f1.fill(F[0]);if(F[1])VA.f2.fill(F[1]);}VA.f1.push(F[0]);VA.f1.shift();if(F[1]){VA.f2.push(F[1]);VA.f2.shift();}}
          const F1=VA.f1.slice().sort((a,b)=>a-b)[1],F2=VA.f2.slice().sort((a,b)=>a-b)[1],g=Math.min(1,L*1.4);
          const o1=Math.min(1,Math.max(0,(F1-280)/520)),fr=Math.min(1,Math.max(0,(F2-900)/1400));
          m={t,jaw:(.2+.8*o1)*g,wid:fr*(1-.4*o1)*g,rnd:Math.min(1,Math.max(0,(1350-F2)/450))*(1-.5*o1)*g,prs:0,tuck:0,L,F1,F2};}}
      VA.tl.push(m);}
    VA.carry=x.slice(i);VA.carryT=start+x.length/sr;
    const cut=actx?actx.currentTime-1:0;if(VA.tl.length>4000)VA.tl=VA.tl.filter(e=>e.t>cut);}
  function benchAnalysis(f,sr){const keep={tl:VA.tl,carry:VA.carry,carryT:VA.carryT,sil:VA.sil};VA.tl=[];VA.carry=null;const t=performance.now();vaFeed(f,sr,0);const ms=performance.now()-t;Object.assign(VA,keep);return ms;}
  function vaApply(t){const T=VA.tl;if(!T.length){setTarget('rest');return;}
    let lo=0,hi=T.length-1;if(t<=T[0].t||t>=T[hi].t){const e=t<=T[0].t?null:T[hi];if(!e||t-e.t>.05){setTarget('rest');return;}setRaw(e);return;}
    while(hi-lo>1){const mid=(lo+hi)>>1;if(T[mid].t<=t)lo=mid;else hi=mid;}
    const a=T[lo],b=T[hi],u=(t-a.t)/(b.t-a.t+1e-9),o={};for(const k of KEYS)o[k]=a[k]+(b[k]-a[k])*u;setRaw(o);cur='stream';
    lev.L=a.L;lev.voiced=a.F1!=null;if(a.F1){lev.F1=a.F1;lev.F2=a.F2;}if(a.L>.08)voiceAt=performance.now();}
  const P_ORD=10,ac=new Float64Array(P_ORD+1),lpc=new Float64Array(P_ORD+1),tmp=new Float64Array(P_ORD+1);let xs=null;
  function levinson(){lpc.fill(0);lpc[0]=1;let err=ac[0];if(err<=0)return false;
    for(let i=1;i<=P_ORD;i++){let acc=ac[i];for(let j=1;j<i;j++)acc+=lpc[j]*ac[i-j];const k=-acc/err;tmp.set(lpc);
      for(let j=1;j<i;j++)lpc[j]=tmp[j]+k*tmp[i-j];lpc[i]=k;err*=(1-k*k);if(err<=0)return false;}return true;}
  const med=a=>a.slice().sort((x,y)=>x-y)[1];
  function audioTargets(dt){an.getFloatTimeDomainData(td);an.getFloatFrequencyData(fd);
    const sr=actx.sampleRate,dec=Math.max(1,Math.round(sr/8000)),fs=sr/dec,N=Math.floor(td.length/dec);if(!xs||xs.length!==N)xs=new Float64Array(N);
    let e=0,zc=0;for(let i=0;i<N;i++){let s=0;for(let j=0;j<dec;j++)s+=td[i*dec+j];xs[i]=s/dec;e+=xs[i]*xs[i];if(i&&(xs[i]>0)!==(xs[i-1]>0))zc++;}
    const db=10*Math.log10(e/N+1e-12);floor=Math.min(db,floor+dt*3);floor=Math.max(floor,-90);peakDb=Math.max(db,peakDb-dt*4,floor+25);
    const L=Math.min(1,Math.max(0,(db-floor-6)/(peakDb-floor-6+1e-6)));
    let lo=0,hi=0;const bin=sr/an.fftSize;for(let i=1;i<fd.length;i++){const f=i*bin;if(f<250)continue;const p=Math.pow(10,fd[i]/10);if(f<3500)lo+=p;else if(f<8000)hi+=p;}
    const fric=hi/(lo+hi+1e-12),zcr=zc/N;
    lev.L=L;lev.fric=fric;
    if(L<.06){quiet+=dt;voicedAgo+=dt;lev.voiced=false;
      if(quiet>.03&&quiet<.16&&voicedAgo<.35){setRaw({jaw:0,wid:0,rnd:0,prs:.55,tuck:0});cur='closure';}else{setTarget('rest');}return;}
    quiet=0;
    if(fric>.5&&zcr>.18){setRaw({jaw:.12*L+.05,wid:.5,rnd:0,prs:0,tuck:0});cur='fricative';lev.voiced=false;return;}
    // LPC formant envelope
    for(let i=N-1;i>0;i--)xs[i]-=.94*xs[i-1];for(let i=0;i<N;i++)xs[i]*=.54-.46*Math.cos(2*Math.PI*i/(N-1));
    for(let k=0;k<=P_ORD;k++){let s=0;for(let i=k;i<N;i++)s+=xs[i]*xs[i-k];ac[k]=s;}ac[0]*=1.0001;
    if(levinson()){let prev=0,prev2=0,mx=0;const K=200,FM=Math.min(3600,fs/2),pk=[];
      for(let k=0;k<=K;k++){const w=2*Math.PI*(k/K*FM)/fs;let re=0,im=0;for(let j=0;j<=P_ORD;j++){re+=lpc[j]*Math.cos(w*j);im-=lpc[j]*Math.sin(w*j);}
        const env=1/(re*re+im*im);if(k>1&&prev>prev2&&prev>env)pk.push([(k-1)/K*FM,prev]);mx=Math.max(mx,env);prev2=prev;prev=env;}
      const p1=pk.find(p=>p[0]>=230&&p[0]<=1050&&p[1]>.08*mx);
      if(p1){let best=null;for(const p of pk)if(p[0]>=Math.max(p1[0]+250,700)&&p[0]<=2900&&(!best||p[1]>best[1]))best=p;
        f1h.push(p1[0]);f1h.shift();if(best){f2h.push(best[0]);f2h.shift();}}}
    F1=med(f1h);F2=med(f2h);lev.F1=F1;lev.F2=F2;lev.voiced=true;voicedAgo=0;
    const o1=Math.min(1,Math.max(0,(F1-280)/520)),fr=Math.min(1,Math.max(0,(F2-900)/1400)),g=Math.min(1,L*1.5);
    setRaw({jaw:(.22+.78*o1)*g,wid:fr*(1-.4*o1)*g,rnd:Math.min(1,Math.max(0,(1350-F2)/450))*(1-.5*o1)*g,prs:0,tuck:0});cur='audio';
    if(db>prevE+9&&L>.45)nodKick=Math.max(nodKick,L);prevE=db*.3+prevE*.7;}
  // ---------- eyes ----------
  let gz=[0,0],gzT=[0,0],nextSac=0;
  function saccade(now,dt,t){if(S.gazeHold){gzT=S.gazeHold;}else if(now>nextSac){const r=Math.random();
      gzT=r<.55?[0,0]:[(Math.random()*2-1)*.9,(Math.random()*2-1)*.45];if(S.speaking||an)gzT=[gzT[0]*.6,gzT[1]*.6];
      nextSac=now+(r<.55?900:350)+Math.random()*2200;if(Math.abs(gzT[0]-gz[0])>.9&&Math.random()<.35)pauseBlink=1;}
    const k=Math.min(1,dt*30);gz[0]+=(gzT[0]-gz[0])*k;gz[1]+=(gzT[1]-gz[1])*k;
    return[gz[0]+.06*Math.sin(t*7.3)+.04*Math.sin(t*11.1),gz[1]+.05*Math.sin(t*6.1+1)];}   // fixational drift
  let nextBlink=performance.now()+2000,bt=-1,dbl=false,lid=0;
  function blink(now,dt){if(S.blinkHold!=null){lid=S.blinkHold;bt=-1;return;}
    if(bt<0&&(now>nextBlink||pauseBlink>0)){bt=0;dbl=Math.random()<.12;pauseBlink=0;}
    if(bt>=0){bt+=dt;const c=.07,o=.16;let v=bt<c?bt/c:bt<c+.03?1:bt<c+.03+o?1-(bt-c-.03)/o:0;lid=v*v*(3-2*v);
      if(bt>c+.03+o){if(dbl){dbl=false;bt=0;}else{bt=-1;nextBlink=now+(S.speaking?2600:3200)+Math.random()*3500;}}}else lid=0;}
  // ---------- frame ----------
  const noise=(t,s)=>Math.sin(t*1.1+s)*.5+Math.sin(t*1.9+s*1.7)*.3+Math.sin(t*3.3+s*2.9)*.2;
  let last=performance.now(),nextYaw=performance.now()+4000,faceHold=0,snapped=false,voiceAt=-1e9,smileGoal=0,smileKick=0,smileNext=performance.now()+8000;const tw={from:start,to:start,t:1,d:1};const live={};
  function nearestTalk(y){let b=Math.round(y),bd=1e9;META.forEach((m,i)=>{if(m.talk&&Math.abs(i-y)<bd){bd=Math.abs(i-y);b=i;}});return b;}
  function draw(view,vp,L,g){gl.viewport(vp[0],vp[1],vp[2],vp[3]);gl.uniform4fv(U('VIEW'),view);gl.drawArrays(gl.TRIANGLES,0,3);}
  function frame(now){if(S.paused){last=now;requestAnimationFrame(frame);return;}const dt=Math.min(.05,Math.max(.001,(now-last)/1000));last=now;const t=now/1000;
    while(Q.length&&Q[0].t<=now){const q=Q.shift();if(q.v)setTarget(q.v);if(q.kick)nodKick=Math.max(nodKick,.5);if(q.pause)pauseBlink=1;if(q.end){S.speaking=false;S.mode='idle';}}
    if(S.hold)setTarget(S.hold);else if(S.mode==='stream'&&actx)vaApply(actx.currentTime+.045);else if(an)audioTargets(dt);
    const w=cfg.tune.stiff,z=cfg.tune.damp,n=Math.ceil(dt/.006),h=dt/n;
    for(const k of KEYS){const s=art[k],wk=k==='prs'||k==='tuck'?w*1.25:w;for(let i=0;i<n;i++){s[1]+=(wk*wk*(tgt[k]-s[0])-2*z*wk*s[1])*h;s[0]+=s[1]*h;}
      if(!isFinite(s[0])||!isFinite(s[1])){s[0]=tgt[k];s[1]=0;}}
    blink(now,dt);const gzz=saccade(now,dt,t);
    if(now>smileNext){smileGoal=smileGoal>0?0:(.45+Math.random()*.45);smileNext=now+(smileGoal>0?2500+Math.random()*2000:12000+Math.random()*14000);}
    const sg=S.smileHold!=null?S.smileHold:Math.max(smileGoal,smileKick);smileKick*=Math.exp(-dt*.6);live.smile=(live.smile||0)+(sg-(live.smile||0))*Math.min(1,dt*3);nodKick*=Math.exp(-dt*4);nk+=(nodKick-nk)*Math.min(1,dt*10);
    if(an&&lev.L>.06)voiceAt=now;if(S.mode==='stream'&&actx&&actx.currentTime>sEndAt+.6&&!sSrcs.length){streamCut();an=null;S.mode='idle';setTarget('rest');}
    const talk=(S.speaking||(an&&now-voiceAt<1500))?1:0,idle=S.idle?1:0;
    // body yaw: wander across the whole range when idle; snap to the nearest stored frame and hold while talking
    // body turn: she rests on real images and moves between them with an ease-in-out tween (crisp at rest, brief in motion)
    if(talk||S.freeze){if(!snapped){S.yawTarget=nearestTalk(S.yaw);snapped=true;}}else{snapped=false;if(S.sway&&idle&&now>nextYaw){const F0=opts.meta.front||0;
      const cur=Math.round(S.yaw),step=Math.random()<.5?-1:1,span=S.span!=null?S.span:2;let to=cur+step;if(Math.abs(to-F0)>span||to<0||to>NF-1)to=cur-step;S.yawTarget=Math.max(0,Math.min(NF-1,to));const dw=S.dwell||[6000,13000];nextYaw=now+dw[0]+Math.random()*(dw[1]-dw[0]);}}   // one neighbouring image at a time, staying near the front
    if(S.yawTarget!==tw.to){tw.from=S.yaw;tw.to=S.yawTarget;tw.t=0;tw.d=(talk?.45:(S.glide||2.4))*Math.pow(Math.abs(tw.to-tw.from)+.001,.7);}
    if(tw.t<tw.d){tw.t=Math.min(tw.d,tw.t+dt);const x=tw.t/tw.d,e=x*x*x*(x*(6*x-15)+10);S.yaw=tw.from+(tw.to-tw.from)*e;}else S.yaw=tw.to;
    faceHold+=((talk?1:0)-faceHold)*Math.min(1,dt*4);const fz=1-faceHold*.6;   // while talking the head keeps 40% of its natural drift; the mouth follows any tilt   // freeze the face (head drift) while speaking
    live.tilt=fz*idle*.7*noise(t*.21,1)+(S.tiltBias||0);live.nod=fz*idle*.22*noise(t*.27,2)+nk*.2*idle;live.turn=fz*idle*.2*noise(t*.17,3);live.yaw=S.yaw;
    live.armR=idle*(.6*noise(t*.23,7)+.3*Math.sin(t*2*Math.PI/4.5));live.armL=-idle*(.6*noise(t*.21,9)+.3*Math.sin(t*2*Math.PI/4.5));
    live.breath=idle*(.5+.5*Math.sin(t*2*Math.PI/4.5));
    for(const k of KEYS)live[k]=Math.max(0,Math.min(1.2,art[k][0]));live.lid=lid;live.gaze=gzz;live.viseme=cur;live.audio=lev;
    const Lm=lmAt(S.yaw);const T0=tex[Lm.i],T1=tex[Lm.i+1]||T0;
    if(T0&&(T1||Lm.f<.01)){const L=Lm,k=cfg.tune;const ox=k.mouthDx||0,oy=k.mouthDy||0;L.mouth=[L.mouth[0]+ox,L.mouth[1]+oy];L.mcl=[L.mcl[0]+ox,L.mcl[1]+oy];L.mcr=[L.mcr[0]+ox,L.mcr[1]+oy];L.mpx+=ox;L.mw*=k.mwScale||1;live.lm=L;
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,T0);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,T1||T0);gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,(T1&&flo[Lm.i])||ZERO);gl.activeTexture(gl.TEXTURE0);
      gl.uniform1i(U('T'),0);gl.uniform1i(U('T2'),1);gl.uniform1i(U('FL'),2);gl.uniform1f(U('FB'),T1?Lm.f:0);gl.uniform2f(U('S'),W,H);
      gl.uniform1f(U('tilt'),live.tilt);gl.uniform1f(U('nod'),live.nod);gl.uniform1f(U('turn'),live.turn);gl.uniform1f(U('breath'),live.breath);
      gl.uniform2fv(U('SHR'),L.shR);gl.uniform2fv(U('SHL'),L.shL);gl.uniform1f(U('ARMR'),live.armR);gl.uniform1f(U('ARML'),live.armL);gl.uniform1f(U('SHRUG'),idle*live.breath*2.2);
      for(const kk of KEYS)gl.uniform1f(U(kk),live[kk]);gl.uniform1f(U('lid'),Math.min(1,lid+.12*live.smile));gl.uniform1f(U('smile'),live.smile);gl.uniform1f(U('K_SMILE'),(cfg.tune.smile||4)*1.6);gl.uniform1f(U('time'),t);gl.uniform1i(U('BG'),S.bg);
      gl.uniform2fv(U('NECK'),L.neck);gl.uniform2fv(U('FACE'),L.face);gl.uniform2fv(U('MOUTH'),L.mouth);gl.uniform2fv(U('MCL'),L.mcl);gl.uniform2fv(U('MCR'),L.mcr);gl.uniform1f(U('MPX'),L.mpx);gl.uniform1f(U('MW'),L.mw);gl.uniform4fv(U('ER'),L.er);gl.uniform4fv(U('EL'),L.el);gl.uniform1f(U('CHIN'),L.chin);gl.uniform1f(U('SH'),L.sh);
      gl.uniform2f(U('GAZE'),gzz[0]-live.turn*.25,gzz[1]);
      const kv={K_GAZE:k.gaze,K_LID:k.lid,K_LOW:k.low,K_LASH:k.lash,K_GLOW:k.glow,K_JAW:k.jaw,K_WID:k.wid,K_RND:k.rnd,K_DARK:k.dark,K_TEETH:k.teeth,K_ULIP:k.ulip};
      for(const n2 in kv)gl.uniform1f(U(n2),kv[n2]||0);
      gl.disable(gl.SCISSOR_TEST);draw(S.view,[0,0,cv.width,cv.height]);
      if(S.inset){const r=S.inset.rect.map((v,i)=>Math.round(v*(i%2?cv.height:cv.width)));const vp=[r[0],cv.height-r[1]-r[3],r[2],r[3]];
        const c=L.mouth,vw=S.inset.width||110,vh=vw*r[3]/r[2];
        gl.enable(gl.SCISSOR_TEST);gl.scissor(vp[0]-3,vp[1]-3,vp[2]+6,vp[3]+6);gl.clearColor(.9,.92,.95,1);gl.clear(gl.COLOR_BUFFER_BIT);
        gl.scissor(vp[0],vp[1],vp[2],vp[3]);draw([c[0]-vw/2,c[1]-vh/2,vw,vh],vp);gl.disable(gl.SCISSOR_TEST);}}
    opts.onFrame&&opts.onFrame(live,now);
    requestAnimationFrame(frame);}
  requestAnimationFrame(frame);
  return {benchAnalysis,smile(v){smileKick=Math.max(smileKick,v==null?.8:v);},_va:VA,S,cfg,DEF,live,speak,stop,listen,listenTab,attachStream,pushAudio,interrupt,endAudio(){},playFile,attachElement,setTarget,setRaw,g2v,W,H,NF,setYaw(v){S.yawTarget=Math.max(0,Math.min(NF-1,v));},jumpYaw(v){S.yaw=S.yawTarget=tw.from=tw.to=Math.max(0,Math.min(NF-1,v));tw.t=tw.d;},
    configure(c){if(typeof c==='string')c=JSON.parse(c);if(c.A)for(const k in c.A)cfg.A[k]=c.A[k];if(c.tune)Object.assign(cfg.tune,c.tune);},
    triggerBlink(){pauseBlink=1;}};
}
