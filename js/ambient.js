// Visual density changes without scroll handlers or a permanent animation loop.
export function initAmbient(){
 if(!('IntersectionObserver' in window)) return;
 const sections=[...document.querySelectorAll('main > section')];
 const ratios=new Map();
 const observer=new IntersectionObserver(entries=>{
  entries.forEach(e=>ratios.set(e.target,e.intersectionRatio));
  const visible=sections.reduce((best,s)=>(ratios.get(s)||0)>(ratios.get(best)||0)?s:best,sections[0]);
  document.documentElement.dataset.scene=visible?.matches('.case,.px-explorer')?'quiet':'lively';
 },{rootMargin:'-12% 0px -12% 0px',threshold:[0,.1,.3,.5,.7,1]});
 sections.forEach(s=>observer.observe(s));
 return ()=>observer.disconnect();
}
