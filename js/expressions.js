/* Pose library paket 10. Murni: tanpa listener, timer, loop perjalanan, atau jaringan.
   Dibungkus sebagai ES module agar controller mengimpornya, bukan lewat variabel global.
   Isi fungsi pose disalin apa adanya dari paket; hanya pembungkusnya yang diubah. */
'use strict';
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const labels={idle:'Tenang',curious:'Penasaran',laugh:'Tertawa',shy:'Malu',surprised:'Kaget',thinking:'Berpikir',mischievous:'Usil',proud:'Bangga',focused:'Fokus',bored:'Bosan',puzzled:'Bingung',sad:'Sedih',love:'Sayang',wink:'Mengedip',yawn:'Menguap',sneeze:'Bersin',determined:'Bertekad',greet:'Menyapa',approve:'Setuju',cool:'Santai',flower:'Bunga',coffee:'Kopi',held:'Diangkat',wind:'Tertiup',dizzy:'Pusing','angry-build':'Menahan kesal','angry-burst':'Letupan kartun',angry:'Marah',sulk:'Merajuk',sleep:'Tidur'};
  const fresh=['curious','laugh','shy','surprised','thinking','mischievous','proud','focused','bored','puzzled','sad','love','wink','yawn','sneeze','determined'];
  function getPose(name,progress=0,options={}) {
    if(!labels[name])name='idle';
    const t=clamp(Number(progress)||0,0,1),e=Math.sin(Math.PI*t),wave=Math.sin(t*Math.PI*6),strength=clamp(options.intensity??1,.5,1.2);
    const p={name,head:0,armL:0,armR:0,legL:0,legR:0,sx:1,sy:1,lift:0,lean:0,shift:0,gaze:clamp(options.gaze||0,-2,2),rage:0,burst:0,raised:0};
    switch(name){
      case 'idle':p.head=Math.sin(t*Math.PI*2)*1.2;p.sy=1+e*.008;break;
      case 'curious':p.head=11*e;p.lean=-2*e;p.armR=-8*e;break;
      case 'laugh':p.head=wave*3*e;p.sx=1+e*.045;p.sy=1-e*.035;p.lift=-Math.abs(wave)*2*e;p.armL=20*e;p.armR=-20*e;break;
      case 'shy':p.head=12*e;p.sy=1-.025*e;p.armL=22*e;p.armR=-22*e;break;
      case 'surprised':p.sx=1-.045*e;p.sy=1+.06*e;p.lift=-4*e;p.armL=32*e;p.armR=-32*e;break;
      case 'thinking':p.head=-9*e;p.armR=-27*e;p.armL=5*e;break;
      case 'mischievous':p.head=-9*e;p.lean=4*e;p.armR=-18*e;p.sx=1+.02*e;break;
      case 'proud':p.sy=1+.025*e;p.head=-3*e;p.armL=-15*e;p.armR=15*e;p.lift=-2*e;break;
      case 'focused':p.head=-4*e;p.lean=-3*e;p.armL=10*e;p.armR=-10*e;break;
      case 'bored':p.head=8*e;p.sy=1-.025*e;p.armL=-7*e;p.armR=6*e;break;
      case 'puzzled':p.head=13*Math.sin(t*Math.PI*2)*e;p.armL=-15*e;p.armR=15*e;break;
      case 'sad':p.head=6*e;p.sy=1-.035*e;p.armL=-10*e;p.armR=10*e;break;
      case 'love':p.head=7*e;p.armL=21*e;p.armR=-21*e;p.sx=1+.025*e;p.sy=1-.015*e;break;
      case 'wink':p.head=-7*e;p.armR=-34*e;p.lift=-1*e;break;
      case 'yawn':p.head=-7*e;p.sy=1+.04*e;p.armL=28*e;p.armR=-28*e;break;
      case 'sneeze':{const recoil=Math.exp(-Math.pow((t-.52)/.16,2));p.head=14*recoil;p.sy=1-.065*recoil;p.sx=1+.055*recoil;p.lean=-6*recoil;break;}
      case 'determined':p.head=-4*e;p.sy=1+.02*e;p.armL=20*e;p.armR=-20*e;break;
      case 'greet':p.head=-5*e;p.armR=-32*e+wave*6*e;break;
      case 'approve':p.head=-4*e;p.armR=-18*e;break;
      case 'cool':p.head=-6*e;p.armL=-8*e;p.armR=8*e;break;
      case 'flower':p.head=-5*e;p.armR=-8*e;break;
      case 'coffee':p.head=5*e;p.armR=-5*e;break;
      case 'held':p.sy=1.035;p.sx=.98;p.armL=30;p.armR=-30;p.legL=8*wave;p.legR=-8*wave;p.raised=1;break;
      case 'wind':p.head=-8*e;p.lean=8*e;p.armL=17*e;p.armR=17*e;break;
      case 'dizzy':p.head=wave*8*e;p.lean=-wave*3*e;p.armL=12*e;p.armR=-12*e;break;
      case 'angry-build':p.rage=t;p.sx=1+.08*t;p.sy=1-.04*t;p.head=wave*1.7*t;p.armL=28*t;p.armR=-28*t;p.raised=1;break;
      case 'angry-burst':p.rage=1-t*.18;p.burst=t;p.sx=1+.1*e;p.sy=1-.07*e;p.lift=-3*e;p.armL=32;p.armR=-32;p.raised=1;break;
      case 'angry':p.rage=.85*(1-t*.3);p.head=wave*3*e;p.lift=-Math.abs(wave)*1.5*e;p.armL=27;p.armR=-27;p.raised=1;break;
      case 'sulk':p.head=9*e;p.sy=1-.025*e;p.armL=15*e;p.armR=-15*e;break;
      case 'sleep':p.head=8;p.sy=1+e*.013;p.armL=-7;p.armR=7;break;
    }
    if(options.motion===false)return {...p,head:0,armL:0,armR:0,legL:0,legR:0,sx:1,sy:1,lift:0,lean:0,shift:0,gaze:0,burst:0};
    for(const k of ['head','armL','armR','legL','legR','lift','lean','shift'])p[k]*=strength;
    p.sx=1+(p.sx-1)*strength;p.sy=1+(p.sy-1)*strength;
    return p;
  }
  const properties={head:['head','deg'],armL:['arm-l','deg'],armR:['arm-r','deg'],legL:['leg-l','deg'],legR:['leg-r','deg'],sx:['sx',''],sy:['sy',''],lift:['lift','px'],lean:['lean','deg'],shift:['shift','px'],gaze:['gaze','px'],rage:['rage',''],burst:['burst',''],raised:['raised','']};
  function apply(root,pose){
    root.dataset.expression=pose.name;
    for(const [key,[property,unit]]of Object.entries(properties)){const n=Number(pose[key]);root.style.setProperty('--cat10-'+property,(Number.isFinite(n)?n:0).toFixed(4)+unit);}
  }
export const CalvinCatExpressions = Object.freeze({ getPose, apply, labels: Object.freeze(labels), newExpressions: Object.freeze(fresh) });
