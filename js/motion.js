import { pointFree, segmentClear, nearestFree, planRoute } from './route.js';

const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
const approach = (a,b,d) => a<b ? Math.min(a+d,b) : Math.max(a-d,b);
const durations = {greet:1800,cool:4000,approve:2200,flower:2600,coffee:2200,curious:1400,stretch:1000,yawn:1600};

/** Reference controller for the isolated demo. Integrate with the site's ONE pause owner. */
export class CalvinCompanion {
  constructor({root,obstacles='[data-cat-obstacle]',perches='[data-cat-perch]',onStatus=()=>{}}) {
    this.root=root; this.actor=root.querySelector('.cat-actor');
    this.obstacleSelector=obstacles;this.perchSelector=perches;this.onStatus=onStatus;
    this.p={x:0,y:0};this.v={x:0,y:0};this.route=[];this.goal=null;this.pendingGoal=null;
    this.speed=0;this.facing=1;this.face=1;this.phase=0;this.gait=0;this.lean=0;
    this.expression='curious';this.expressionUntil=1400;this.locomotion='idle';
    this.paused=false;this.focused=false;this.held=false;this.near=false;this.reduced=false;
    this.logical=0;this.anchor=null;this.previous=0;this.listeners=[];
    this.frame=0;this.timer=0;this.measureFrame=0;this.started=false;this.destroyed=false;
    this.scrollY=scrollY;this.lastScroll=-Infinity;this.lastScrollReaction=-Infinity;this.settleAt=Infinity;
    this.lastActivity=0;this.nextRoam=7000;this.nextBlink=4600;this.blinkUntil=0;
    this.hopAt=null;this.turn=null;this.reaction=null;this.followingCool=false;this.exploreAfterGreeting=false;this.exploreAt=Infinity;
    this.dirty=true;this.safetyHidden=false;this.parked=true;this.recoveries=0;
    this.greets=0;this.cooldowns={};this.rests=0;this.status='';
    try {const saved=JSON.parse(localStorage.getItem('calvin-cat'));if(saved?.v===2&&Number.isSafeInteger(saved.greets)&&saved.greets>=0)this.greets=saved.greets;}catch{}
    this.media=matchMedia('(prefers-reduced-motion: reduce)');this.reduced=this.media.matches;
  }
  now(){return this.logical+(this.anchor===null?0:performance.now()-this.anchor);}
  canRun(){return !this.paused&&!this.reduced&&!document.hidden&&!this.destroyed;}
  listen(target,type,fn,options){target.addEventListener(type,fn,options);this.listeners.push(()=>target.removeEventListener(type,fn,options));}
  start(){
    if(this.started)return this;this.started=true;
    this.measure();this.p=this.safeEdge(this.preferredPerch())||{x:this.bounds.right,y:this.bounds.top};
    this.safetyHidden=!pointFree(this.p,this.bounds,this.obstacles);
    this.expression=this.reduced?'idle':'curious';
    this.listen(window,'scroll',()=>this.onScroll(),{passive:true});
    this.listen(window,'resize',()=>this.invalidate(),{passive:true});
    this.listen(window,'orientationchange',()=>this.invalidate(),{passive:true});
    this.listen(window,'load',()=>this.invalidate());
    this.listen(document,'visibilitychange',()=>this.sync());
    this.listen(this.media,'change',()=>{this.reduced=this.media.matches;this.route=[];this.goal=this.pendingGoal=null;this.speed=0;this.v={x:0,y:0};this.turn=null;this.hopAt=null;this.reaction=null;this.followingCool=false;this.phase=this.gait=this.lean=0;this.face=this.facing;this.root.style.setProperty('--cat-gaze','0px');this.exploreAt=Infinity;this.exploreAfterGreeting=false;this.expression='idle';this.dirty=true;this.sync();});
    this.listen(this.actor,'click',()=>this.greet());
    this.listen(this.actor,'focus',()=>{this.focused=true;this.stop();this.activity();});
    this.listen(this.actor,'blur',()=>{this.focused=false;this.activity();this.settleAt=this.now()+300;this.request();});
    this.listen(this.actor,'pointerdown',()=>{this.held=true;this.stop();});
    this.listen(window,'pointerup',()=>{if(this.held){this.held=false;this.activity();}});
    this.listen(window,'pointercancel',()=>{this.held=false;this.activity();});
    this.listen(document,'pointermove',e=>this.pointer(e),{passive:true});
    this.listen(window,'calvin:companion',e=>this.action(e.detail?.action));
    this.listen(document,'toggle',()=>this.invalidate(),true);
    if('ResizeObserver'in window){this.resizeObserver=new ResizeObserver(()=>this.invalidate());this.obstacleNodes.forEach(node=>this.resizeObserver.observe(node));}
    if('MutationObserver'in window){this.mutationObserver=new MutationObserver(records=>{
      if(records.some(record=>!this.root.contains(record.target)&&!record.target.closest?.('.motion-route,#motion-status,#cat-live'))){this.dirty=true;this.invalidate();}
    });this.mutationObserver.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open','hidden','aria-expanded']});}
    document.fonts?.ready.then(()=>{if(!this.destroyed)this.invalidate();});
    this.paint(this.now());this.sync();return this;
  }
  measure(){
    this.size=this.root.offsetWidth||72;this.mobile=innerWidth<=720;
    // Conservative square includes flower/thumb, focus outline and small step/bob.
    this.radius=this.mobile?46:62;
    const edge=this.mobile?40:54;
    // Batas atas mengikuti tinggi header sticky yang sebenarnya, bukan angka tetap,
    // supaya kucing tidak pernah menyentuh navigasi di layar sempit.
    const bar=document.querySelector('.topbar');
    const barBottom=bar?bar.getBoundingClientRect().bottom:0;
    const top=Math.min(Math.max(barBottom+this.size/2+8,64),innerHeight/2);
    this.bounds={left:edge,right:Math.max(edge,innerWidth-edge),top:top,bottom:Math.max(top,innerHeight-edge)};
    this.obstacleNodes=[...document.querySelectorAll(this.obstacleSelector)];
    this.obstacles=this.obstacleNodes.flatMap(node=>{
      if(this.root.contains(node)||node.closest('[hidden]')||!node.getClientRects().length)return[];
      const r=node.getBoundingClientRect();
      if(r.width<1||r.height<1||r.bottom< -this.radius||r.top>innerHeight+this.radius)return[];
      return[{left:r.left-this.radius,right:r.right+this.radius,top:r.top-this.radius,bottom:r.bottom+this.radius}];
    });
    this.perches=[...document.querySelectorAll(this.perchSelector)];this.dirty=false;
  }
  preferredPerch(){
    let best=null,score=-Infinity;
    for(const node of this.perches){
      const r=(node.closest('section')||node.parentElement).getBoundingClientRect();
      const visible=Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(r.top,0));
      if(!visible)continue;
      const merit=visible/Math.min(innerHeight,Math.max(1,r.height));
      if(merit>score){score=merit;const p=node.getBoundingClientRect();best={x:p.left+p.width/2,y:clamp(p.top,this.bounds.top+12,this.bounds.bottom-12)};}
    }
    return best||{x:this.bounds.right,y:innerHeight*.68};
  }
  safeEdge(preferred){
    const right={x:this.bounds.right,y:clamp(preferred.y,this.bounds.top,this.bounds.bottom)};
    const left={x:this.bounds.left,y:right.y};
    const choices=this.mobile?[right]:preferred.x<innerWidth/2?[left,right]:[right,left];
    for(const p of choices){const found=nearestFree(p,this.bounds,this.obstacles,true);if(found&&(!this.mobile||found.x>=innerWidth*.6))return found;}
    return nearestFree(right,this.bounds,this.obstacles,true);
  }
  invalidate(){
    this.dirty=true;if(this.measureFrame||this.destroyed)return;
    this.measureFrame=requestAnimationFrame(()=>{this.measureFrame=0;if(this.destroyed)return;this.measure();this.validate();this.paint(this.now());this.request();});
  }
  validate(){
    if(!pointFree(this.p,this.bounds,this.obstacles)){
      // An anchor jump/resize can put new content directly underneath a fixed actor.
      // Hiding is a safety fallback, never a normal section transition.
      if(!this.safetyHidden)this.recoveries++;
      this.safetyHidden=true;this.stop();this.route=[];this.pendingGoal=this.goal=null;
    }else if(this.route.length&&!segmentClear(this.p,this.route[0],this.bounds,this.obstacles)){
      const old=this.goal;this.stop();this.route=[];this.goal=null;
      if(old)this.pendingGoal=old;
    }
    if(this.safetyHidden&&(this.reduced||this.now()-this.lastScroll>260)&&!this.focused&&!this.held&&!this.paused){
      const safe=this.safeEdge(this.preferredPerch());
      if(safe){this.p=safe;this.safetyHidden=false;this.parked=true;this.expression='curious';this.expressionUntil=this.now()+1000;}
    }
  }
  onScroll(){
    const at=this.now(),delta=scrollY-this.scrollY;this.scrollY=scrollY;
    this.lastScroll=at;this.settleAt=at+260;this.lastActivity=at;this.nextRoam=at+7000;
    if(this.expression==='sleep'||this.expression==='yawn'){this.expression='curious';this.expressionUntil=at+1000;}
    if(this.canRun()&&Math.abs(delta)>2&&at-this.lastScrollReaction>1800&&!this.focused&&!this.held){
      this.lastScrollReaction=at;
      this.pendingGoal={x:this.p.x,y:clamp(this.p.y+Math.sign(delta)*(this.mobile?24:44),this.bounds.top+4,this.bounds.bottom-4)};
    }
    this.invalidate();this.request();
  }
  activity(){
    const at=this.now();this.lastActivity=at;this.nextRoam=at+7000;
    if(this.expression==='sleep'||this.expression==='yawn'){this.expression=this.reduced?'idle':'stretch';this.expressionUntil=at+1000;}
    this.request();
  }
  pointer(e){
    if(e.pointerType==='touch')return;
    const near=distance(this.p,{x:e.clientX,y:e.clientY})<(this.near?100:82);
    const changed=near!==this.near;this.near=near;
    if(near){if(this.canRun())this.root.style.setProperty('--cat-gaze',`${clamp((e.clientX-this.p.x)/65,-2,2)*this.facing}px`);if(changed){this.activity();this.request();}}
    else if(changed){if(this.canRun())this.root.style.setProperty('--cat-gaze','0px');this.settleAt=this.now()+500;this.request();}
  }
  setPaused(value){this.paused=Boolean(value);this.sync();}
  sync(){
    const run=this.canRun();
    if(!run&&this.anchor!==null){this.logical=this.now();this.anchor=null;}
    if(run&&this.anchor===null){this.anchor=performance.now();this.previous=this.now();this.dirty=true;}
    cancelAnimationFrame(this.frame);this.frame=0;clearTimeout(this.timer);this.timer=0;
    this.root.classList.toggle('is-paused',!run);
    if(run)this.request();else{if(this.dirty){this.measure();this.validate();}this.paint(this.now());this.report('paused');}
  }
  request(){
    if(!this.canRun()||this.frame)return;
    clearTimeout(this.timer);this.timer=0;
    this.frame=requestAnimationFrame(()=>{this.frame=0;this.tick();});
  }
  stop(){this.speed=0;this.v={x:0,y:0};this.facing=Math.sign(this.face)||this.facing;this.face=this.facing;this.turn=null;this.gait=0;this.hopAt=null;}
  navigateTo(goal){
    if(!goal||!Number.isFinite(goal.x)||!Number.isFinite(goal.y))return false;
    this.activity();if(this.mobile||!this.canRun()||this.focused||this.held)return false;
    this.pendingGoal={...goal};this.settleAt=Infinity;this.request();return true;
  }
  action(kind){
    const map={sketch:'greet',project:'approve',cv:'approve',contact:'flower',peek:'curious'};
    kind=map[kind]||kind;
    if(!durations[kind])return;
    const at=this.now();const quiet=kind==='flower'?20000:kind==='curious'?9000:kind==='greet'?600:800;
    if(at-(this.cooldowns[kind]??-Infinity)<quiet)return;
    this.cooldowns[kind]=at;this.activity();
    if(!this.canRun()){this.expression=kind;this.expressionUntil=at+durations[kind];this.paint(at);return;}
    this.reaction=kind;this.pendingGoal=this.goal=null;this.route=[];this.settleAt=Infinity;this.request();
  }
  greet(){
    this.greets=this.greets>=Number.MAX_SAFE_INTEGER?1:this.greets+1;
    try{localStorage.setItem('calvin-cat',JSON.stringify({v:2,greets:this.greets}));}catch{}
    this.followingCool=this.greets%3===0;this.exploreAfterGreeting=!this.mobile&&this.canRun();this.action('greet');
    const live=document.getElementById('cat-live');if(live)live.textContent=this.followingCool?'Halo! Kucingmu sedang bergaya.':'Halo! Kucing menyapamu.';
  }
  routeTo(requested){
    this.route=[];this.goal=null;
    const goal=nearestFree(requested,this.bounds,this.obstacles,true);
    if(!goal)return false;
    // On phones the cat has one reserved side. No cross-page trips through copy.
    if(this.mobile&&goal.x<innerWidth*.6)return false;
    const route=planRoute(this.p,goal,this.bounds,this.obstacles,{preferEdges:true});
    if(!route){this.locomotion='blocked';this.parked=true;return false;}
    this.route=route;this.goal=goal;this.parked=!route.length;
    return true;
  }
  tick(){
    if(!this.canRun())return;
    const at=this.now(),dt=clamp((at-this.previous)/1000,0,.034);this.previous=at;
    if(this.dirty){this.measure();this.validate();}
    if(this.safetyHidden){this.validate();this.paint(at);this.wait(120);return;}
    if(at>=this.settleAt){this.settleAt=Infinity;if(!this.focused&&!this.held&&!this.near){const perch=this.preferredPerch();if(!this.goal||distance(perch,this.goal)>24)this.pendingGoal=perch;}}
    const held=this.focused||this.held||this.near;
    if(this.expressionUntil<=at){
      if(this.expression==='greet'&&this.followingCool){this.expression='cool';this.expressionUntil=at+durations.cool;this.followingCool=false;}
      else{if(this.exploreAfterGreeting&&['greet','cool'].includes(this.expression)){this.exploreAt=at+650;this.exploreAfterGreeting=false;}this.expression='idle';this.expressionUntil=Infinity;}
    }
    if(at>=this.exploreAt&&!held){this.exploreAt=Infinity;this.pendingGoal={x:this.p.x>innerWidth/2?this.bounds.left:this.bounds.right,y:clamp(this.p.y+24,this.bounds.top+8,this.bounds.bottom-8)};}
    if(!held&&at-this.lastActivity>14000&&!this.route.length&&!this.pendingGoal&&!this.reaction){this.expression='sleep';}
    else if(!held&&at-this.lastActivity>12400&&this.expression==='idle'&&!this.route.length){this.expression='yawn';this.expressionUntil=at+1600;}
    if(!held&&at>=this.nextRoam&&at-this.lastActivity<12000&&!this.route.length&&!this.pendingGoal&&!this.reaction){
      this.nextRoam=at+7000;
      // Only a short, infrequent edge stroll while somebody is reading.
      this.rests++;
      if(this.rests%3===0){this.expression='coffee';this.expressionUntil=at+durations.coffee;}
      else this.pendingGoal={x:this.p.x,y:clamp(this.p.y+(this.rests%2?-1:1)*(this.mobile?20:34),this.bounds.top+5,this.bounds.bottom-5)};
    }
    const reacting=this.reaction||(!['idle','curious','sleep','yawn','stretch'].includes(this.expression));
    const braking=held||Boolean(this.pendingGoal)||Boolean(reacting)||Boolean(this.turn);
    if(braking&&this.speed>0){
      this.speed=approach(this.speed,0,280*dt);
      const magnitude=Math.hypot(this.v.x,this.v.y)||1;
      const proposed={x:this.p.x+this.v.x/magnitude*this.speed*dt,y:this.p.y+this.v.y/magnitude*this.speed*dt};
      if(segmentClear(this.p,proposed,this.bounds,this.obstacles))this.travel(proposed,dt);else this.stop();
      this.locomotion='brake';
    }
    if(this.speed<.7&&braking){
      this.speed=0;this.v={x:0,y:0};
      if(this.reaction){
        this.expression=this.reaction;this.expressionUntil=at+durations[this.reaction];
        this.hopAt=this.reaction==='greet'?at:null;this.reaction=null;
      }
      if(this.pendingGoal&&!held&&!reacting){const goal=this.pendingGoal;this.pendingGoal=null;this.routeTo(goal);}
    }
    if(this.turn){
      const f=clamp((at-this.turn.at)/300,0,1);
      this.face=this.turn.from*Math.cos(Math.PI*f);this.locomotion='turn';
      if(f>=1){this.facing=this.turn.to;this.face=this.facing;this.turn=null;}
    }else if(!held&&!this.pendingGoal&&!reacting&&this.route.length){
      const target=this.route[0],d=distance(this.p,target);
      const desiredFace=Math.abs(target.x-this.p.x)>8?Math.sign(target.x-this.p.x):this.facing;
      if(desiredFace!==this.facing&&this.speed<3){this.turn={at,from:this.facing,to:desiredFace};}
      else{
        const desired=Math.min(this.mobile?58:90,Math.sqrt(2*190*Math.max(0,d-1)));
        this.speed=approach(this.speed,desired,(desired>this.speed?210:280)*dt);
        const step=Math.min(d,this.speed*dt);
        const proposed={x:this.p.x+(target.x-this.p.x)/Math.max(d,.001)*step,y:this.p.y+(target.y-this.p.y)/Math.max(d,.001)*step};
        if(segmentClear(this.p,proposed,this.bounds,this.obstacles)){this.travel(proposed,dt);this.locomotion='walk';}
        else{this.pendingGoal=this.goal;this.stop();this.route=[];this.goal=null;this.locomotion='blocked';}
        if(d<2.2&&this.speed<26){this.route.shift();this.speed=0;this.v={x:0,y:0};if(!this.route.length){this.goal=null;this.parked=true;this.nextRoam=at+7000;this.locomotion='idle';}}
      }
    }else if(this.speed===0&&!this.turn){this.locomotion='idle';}
    if(!this.route.length&&this.speed===0)this.gait=approach(this.gait,0,dt*8);
    this.lean=approach(this.lean,clamp(this.v.x/45,-2,2),dt*14);
    if(at>=this.nextBlink&&!this.route.length&&this.expression==='idle'){this.blinkUntil=at+120;this.nextBlink=at+5600;}
    this.paint(at);
    const moving=this.route.length||this.pendingGoal||this.reaction||this.turn||this.speed>.1||this.gait>.001||Math.abs(this.lean)>.01||this.hopAt!==null;
    if(moving&&(!held||this.speed>.1||this.gait>.001||Math.abs(this.lean)>.01||this.hopAt!==null))this.request();else{
      const deadlines=[this.exploreAt,this.settleAt,this.expressionUntil,this.nextRoam,this.nextBlink,this.blinkUntil>at?this.blinkUntil:Infinity,this.lastActivity+12410,this.lastActivity+14010].filter(v=>Number.isFinite(v)&&v>at+1);
      this.wait(deadlines.length?Math.min(...deadlines)-at:3000);
    }
  }
  travel(next,dt){
    const dx=next.x-this.p.x,dy=next.y-this.p.y,d=Math.hypot(dx,dy);
    this.v={x:dt?dx/dt:0,y:dt?dy/dt:0};this.p=next;this.phase+=d/29*Math.PI*2;
    this.gait=approach(this.gait,clamp(this.speed/55,0,1),dt*6);this.parked=false;
  }
  wait(ms){clearTimeout(this.timer);if(this.canRun())this.timer=setTimeout(()=>{this.timer=0;this.request();},clamp(ms,16,3000));}
  paint(at){
    const style=this.root.style;
    style.setProperty('--cat-x',`${(this.p.x-this.size/2).toFixed(2)}px`);
    style.setProperty('--cat-y',`${(this.p.y-this.size/2).toFixed(2)}px`);
    style.setProperty('--cat-face',this.face.toFixed(4));
    style.setProperty('--cat-lean',`${this.lean.toFixed(2)}deg`);
    const stride=Math.sin(this.phase)*this.gait;
    style.setProperty('--step-left',`${(stride*8).toFixed(2)}deg`);style.setProperty('--step-right',`${(-stride*8).toFixed(2)}deg`);
    style.setProperty('--lift-left',`${(-Math.max(0,stride)*1.8).toFixed(2)}px`);style.setProperty('--lift-right',`${(-Math.max(0,-stride)*1.8).toFixed(2)}px`);
    style.setProperty('--cat-bob',`${(-(.5-.5*Math.cos(this.phase*2))*this.gait).toFixed(2)}px`);
    let hop=0;
    if(this.hopAt!==null){const f=(at-this.hopAt)/460;if(f<1)hop=-5*Math.sin(Math.PI*f);else this.hopAt=null;}
    this.root.querySelector('.cat-hop').style.transform=`translateY(${hop.toFixed(2)}px)`;
    this.root.dataset.catState=this.expression;this.root.dataset.locomotion=this.locomotion;
    this.root.classList.toggle('is-walking',this.speed>2);
    this.root.classList.toggle('is-winking',at<this.blinkUntil);
    this.root.classList.toggle('is-safety-hidden',this.safetyHidden);
    this.report(this.expression==='sleep'?'sleep':this.locomotion);
  }
  report(status){if(status===this.status)return;this.status=status;this.onStatus(status);}
  inspect(){return {p:{...this.p},v:{...this.v},speed:this.speed,route:this.route.map(p=>({...p})),goal:this.goal&&{...this.goal},pendingGoal:this.pendingGoal&&{...this.pendingGoal},bounds:{...this.bounds},obstacles:this.obstacles.map(r=>({...r})),locomotion:this.locomotion,expression:this.expression,paused:this.paused,reduced:this.reduced,focused:this.focused,parked:this.parked,safetyHidden:this.safetyHidden,recoveries:this.recoveries,clock:this.now()};}
  destroy(){
    if(this.destroyed)return;this.logical=this.now();this.anchor=null;this.destroyed=true;
    cancelAnimationFrame(this.frame);cancelAnimationFrame(this.measureFrame);clearTimeout(this.timer);
    this.listeners.forEach(remove=>remove());this.listeners=[];this.resizeObserver?.disconnect();this.mutationObserver?.disconnect();this.root.classList.add('is-paused');
  }
}
