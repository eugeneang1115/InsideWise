'use strict';
const {copy,companies}=window.DESIGN_DATA;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let lang='en';try{lang=localStorage.getItem('ki-design-language')||'en';}catch{}
if(!['en','ms','zh'].includes(lang))lang='en';
let selected=null,query='',industry='',minimum=0,sort='name',bounds=null,screen='explore',own=[],editId=null;
let view={lat:3.139,lng:101.668,zoom:12},drag=null,toastTimer;
const metrics=['overall','pay','management','culture','growth','balance'];
const t=k=>(copy[k]||[k,k,k])[{en:0,ms:1,zh:2}[lang]];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sampleText=[
{title:'Supportive team, room to grow',pros:'The team shares knowledge openly and makes space for learning. Flexible hours make the working week easier to manage.',cons:'Career progression could be explained more clearly. Project priorities sometimes change at short notice.',employment:'current'},
{title:'A good place to learn',pros:'Colleagues are approachable and willing to help. New starters get useful feedback and practical experience.',cons:'Planning between teams could be better. More structured training would make a real difference.',employment:'former'},
{title:'团队友善，工作节奏合理',pros:'同事乐于分享经验，遇到问题时能获得支持。团队重视协作，也愿意听取新的想法。',cons:'希望晋升标准能够更透明，也希望跨部门沟通和长期培训计划得到进一步改善。',employment:'current'}
];
const samples=companies.flatMap((c,i)=>[0,1].map((j)=>({id:c.id+'-'+j,company:c.id,...sampleText[(i+j)%3],overall:i===1?4:i===3?3:5-j,pay:4,management:4,culture:5,growth:3,balance:4})));
const stats=id=>{const r=samples.filter(r=>r.company===id);return {count:r.length,rating:r.reduce((s,r)=>s+r.overall,0)/r.length};};
function translate(){
document.documentElement.lang=lang==='zh'?'zh-Hans':lang;$('#language').value=lang;
$$('[data-t]').forEach(el=>el.textContent=t(el.dataset.t));$$('[data-placeholder]').forEach(el=>{el.placeholder=t(el.dataset.placeholder);el.setAttribute('aria-label',t(el.dataset.placeholder));});
$('#industry').innerHTML='<option value="">'+t('all')+'</option>'+['Technology','Creative','Finance','Consumer'].map(k=>'<option value="'+k+'">'+t(k)+'</option>').join('');$('#industry').value=industry;
$('#minimum').innerHTML=[['0','any'],['4','four'],['3','three']].map(([v,k])=>'<option value="'+v+'">'+t(k)+'</option>').join('');$('#minimum').value=minimum;
$('#sort').innerHTML=['name','rating','newest'].map(k=>'<option value="'+k+'">'+t(k)+'</option>').join('');$('#sort').value=sort;
$('#industry').setAttribute('aria-label',t('all'));$('#minimum').setAttribute('aria-label',t('any'));$('#sort').setAttribute('aria-label',t('sort'));$('#map').setAttribute('aria-label',t('map'));$('#close-dialog').setAttribute('aria-label',t('close'));
$$('[data-zoom]').forEach(b=>b.setAttribute('aria-label',t(b.dataset.zoom==='1'?'zoomIn':'zoomOut')));
renderList();renderDetail();renderMine();renderMap();
}
function filtered(){return companies.filter(c=>(c.name+' '+c.city+' '+c.state+' '+c.industry+' '+t(c.industry)).toLowerCase().includes(query.toLowerCase())&&(!industry||c.industry===industry)&&stats(c.id).rating>=minimum);}
function visible(){return filtered().filter(c=>!bounds||(c.lat>=bounds.south&&c.lat<=bounds.north&&c.lng>=bounds.west&&c.lng<=bounds.east)).sort((a,b)=>sort==='rating'?stats(b.id).rating-stats(a.id).rating:sort==='newest'?stats(b.id).count-stats(a.id).count:a.name.localeCompare(b.name));}
function renderList(){
const cs=visible();$('#count').textContent=cs.length+' '+t('companies');
$('#company-list').innerHTML=cs.length?cs.map(c=>{const s=stats(c.id);return '<button class="company-card '+(selected===c.id?'selected':'')+'" data-company="'+c.id+'"><span class="logo" style="background:'+c.color+'">'+c.initials+'</span><div class="info"><h2>'+esc(c.name)+'<span>↗</span></h2><p>'+t(c.industry)+' · '+c.city+'</p><div class="card-rating"><span class="stars">★</span><strong>'+s.rating.toFixed(1)+'</strong><span class="muted">('+s.count+' '+t('reviews')+')</span><span class="sample">DEMO</span></div><span class="pill">'+c.size+' '+t('employees')+'</span></div></button>';}).join(''):'<p class="empty">'+t('empty')+'</p>';
}
function reviewHtml(r,mine=false){return '<article class="review"><div class="review-meta"><span class="stars">'+'★'.repeat(r.overall)+'☆'.repeat(5-r.overall)+'</span><span>'+t('anonymous')+'</span></div><h3>'+esc(r.title)+'</h3><p class="small muted">'+t(r.employment==='former'?'former':'current')+'</p><strong class="small">'+t('pros')+'</strong><p class="review-text">'+esc(r.pros)+'</p><strong class="small">'+t('cons')+'</strong><p class="review-text">'+esc(r.cons)+'</p>'+(mine?'<span class="status">'+t('pending')+'</span><div class="review-actions"><button data-edit="'+r.id+'">'+t('edit')+'</button><button data-delete="'+r.id+'">'+t('delete')+'</button></div>':'<p class="sample-note">'+t('sampleReview')+'</p><div class="review-actions"><button data-report="'+r.id+'">'+t('report')+'</button></div>')+'</article>';}
function renderDetail(){
const c=companies.find(c=>c.id===selected),el=$('#detail');el.hidden=!c;if(!c)return;
const s=stats(c.id);
el.innerHTML='<button class="icon-button detail-close" data-action="close-detail" aria-label="'+t('close')+'">×</button><span class="logo" style="background:'+c.color+'">'+c.initials+'</span><p class="eyebrow">'+t(c.industry)+'</p><h2>'+c.name+'</h2><p class="muted">'+c.city+', '+c.state+'</p><div class="detail-rating"><span class="stars">★</span>'+s.rating.toFixed(1)+'<span class="small muted">'+s.count+' '+t('reviews')+' · DEMO</span></div><button class="button primary full" data-action="write">✎ &nbsp; '+t('write')+'</button><h3>'+t('details')+'</h3><p class="muted">'+t('fictional')+'</p><div class="breakdown">'+metrics.slice(1).map(k=>'<div><span>'+t(k)+'</span><meter min="0" max="5" value="'+samples.find(r=>r.company===c.id)[k]+'"></meter><b>'+samples.find(r=>r.company===c.id)[k].toFixed(1)+'</b></div>').join('')+'</div><h3>'+t('reviews')+'</h3>'+samples.filter(r=>r.company===c.id).map(r=>reviewHtml(r)).join('');
}
function selectCompany(id){selected=id;const c=companies.find(c=>c.id===id);view={lat:c.lat,lng:c.lng,zoom:13};renderList();renderDetail();renderMap();}
function showScreen(name){screen=name;$('#explore-screen').hidden=name!=='explore';$('#mine-screen').hidden=name!=='mine';$$('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===name));selected=null;renderDetail();if(name==='explore')requestAnimationFrame(renderMap);else renderMine();}
function renderMine(){$('#my-reviews').innerHTML=own.length?own.map(r=>'<p class="eyebrow">'+esc(companies.find(c=>c.id===r.company).name)+'</p>'+reviewHtml(r,true)).join(''):'<p class="empty">'+t('noMine')+'</p>';}
function project(lat,lng,z){const scale=256*2**z,sin=Math.sin(Math.max(-85,Math.min(85,lat))*Math.PI/180);return {x:(lng+180)/360*scale,y:(.5-Math.log((1+sin)/(1-sin))/(4*Math.PI))*scale};}
function unproject(x,y,z){const scale=256*2**z;return {lng:x/scale*360-180,lat:Math.atan(Math.sinh(Math.PI*(1-2*y/scale)))*180/Math.PI};}
function mapFrame(){const rect=$('#map').getBoundingClientRect(),center=project(view.lat,view.lng,view.zoom);return {w:rect.width,h:rect.height,left:center.x-rect.width/2,top:center.y-rect.height/2};}
function renderMap(){
if(screen!=='explore')return;const {w,h,left,top}=mapFrame();if(!w||!h)return;
const needed=new Set(),tiles=$('#tiles');
for(let x=Math.floor(left/256);x<=Math.floor((left+w)/256);x++)for(let y=Math.floor(top/256);y<=Math.floor((top+h)/256);y++){
if(x<0||y<0||x>=2**view.zoom||y>=2**view.zoom)continue;const id='tile-'+view.zoom+'-'+x+'-'+y;needed.add(id);let img=document.getElementById(id);
if(!img){img=document.createElement('img');img.id=id;img.className='tile';img.alt='';img.draggable=false;img.width=img.height=256;img.src='https://tile.openstreetmap.org/'+view.zoom+'/'+x+'/'+y+'.png';img.onerror=()=>{img.style.visibility='hidden';$('#map-error').hidden=false;};tiles.appendChild(img);}
img.style.left=(x*256-left)+'px';img.style.top=(y*256-top)+'px';}
[...tiles.children].forEach(el=>{if(!needed.has(el.id))el.remove();});
$('#pins').innerHTML=filtered().map(c=>{const p=project(c.lat,c.lng,view.zoom),x=p.x-left,y=p.y-top;if(x<0||y<0||x>w||y>h)return '';return '<button data-company="'+c.id+'" class="pin '+(selected===c.id?'active':'')+'" style="left:'+x+'px;top:'+y+'px" aria-label="'+c.name+'"><span class="stars">★</span> '+stats(c.id).rating.toFixed(1)+'<span class="pin-name">'+c.name+'</span></button>';}).join('');
}
function modal(title,body){$('#dialog-title').textContent=title;$('#dialog-body').innerHTML=body;if(!$('#dialog').open)$('#dialog').showModal();}
function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').hidden=false;toastTimer=setTimeout(()=>$('#toast').hidden=true,5500);}
function reviewForm(existing){
editId=existing?.id||null;const company=existing?.company||selected||companies[0].id;
modal(t('write'),'<form class="review-form" id="review-form"><p class="privacy-note">'+t('prototypeSubmit')+'</p><label>'+t('companies')+'<select name="company" '+(existing?'disabled':'')+'>'+companies.map(c=>'<option value="'+c.id+'" '+(company===c.id?'selected':'')+'>'+c.name+'</option>').join('')+'</select></label><div class="form-row"><label>'+t('relationship')+'<select name="employment"><option value="current">'+t('current')+'</option><option value="former" '+(existing?.employment==='former'?'selected':'')+'>'+t('former')+'</option></select></label><label>'+t('language')+'<select name="language"><option value="en">English</option><option value="ms">Bahasa Malaysia</option><option value="zh">简体中文</option></select></label></div><div class="rating-inputs">'+metrics.map(k=>'<label>'+t(k)+'<select name="'+k+'" required><option value="" disabled '+(!existing?'selected':'')+'>—</option>'+[1,2,3,4,5].map(n=>'<option value="'+n+'" '+(existing?.[k]===n?'selected':'')+'>'+n+' '+'★'.repeat(n)+'</option>').join('')+'</select></label>').join('')+'</div><label>'+t('title')+'<input name="title" required minlength="5" maxlength="120" value="'+esc(existing?.title||'')+'"></label><label>'+t('pros')+'<textarea name="pros" required minlength="20" maxlength="2000" rows="3">'+esc(existing?.pros||'')+'</textarea><span class="form-hint">20–2,000</span></label><label>'+t('cons')+'<textarea name="cons" required minlength="20" maxlength="2000" rows="3">'+esc(existing?.cons||'')+'</textarea><span class="form-hint">20–2,000</span></label><label class="checkbox"><input type="checkbox" required>'+t('consent')+'</label><p id="form-error" class="error-text" role="alert" hidden></p><button class="button primary full">'+t('submit')+'</button></form>');
$('#review-form [name=language]').value=existing?.language||lang;
$('#review-form').onsubmit=e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.target));const text=data.title+' '+data.pros+' '+data.cons;
if(/[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b\d{6}[- ]?\d{2}[- ]?\d{4}\b/i.test(text)){$('#form-error').hidden=false;$('#form-error').textContent=t('personal');return;}
data.company=existing?.company||data.company;metrics.forEach(k=>data[k]=Number(data[k]));const previous=own.find(r=>r.company===data.company);data.id=editId||previous?.id||String(Date.now());own=own.filter(r=>r.id!==data.id&&r.company!==data.company);own.unshift(data);$('#dialog').close();renderMine();toast(t('demoSaved'));};
}
document.addEventListener('click',e=>{
const button=e.target.closest('button');if(!button)return;
if(button.dataset.company){selectCompany(button.dataset.company);return;}
if(button.dataset.nav){showScreen(button.dataset.nav);return;}
if(button.dataset.zoom){view.zoom=Math.max(5,Math.min(17,view.zoom+Number(button.dataset.zoom)));renderMap();return;}
if(button.dataset.edit){reviewForm(own.find(r=>r.id===button.dataset.edit));return;}
if(button.dataset.delete){const id=button.dataset.delete;modal(t('delete'),'<p>'+t('deleteConfirm')+'</p><button class="button primary" id="confirm-delete">'+t('confirm')+'</button>');$('#confirm-delete').onclick=()=>{own=own.filter(r=>r.id!==id);$('#dialog').close();renderMine();};return;}
if(button.dataset.report){modal(t('report'),'<form id="report-form" class="review-form"><p class="privacy-note">'+t('prototypeSubmit')+'</p><label>'+t('reason')+'<textarea required minlength="10" maxlength="1000" rows="4"></textarea></label><button class="button primary">'+t('confirm')+'</button></form>');$('#report-form').onsubmit=e=>{e.preventDefault();$('#dialog').close();toast(t('demoReport'));};return;}
switch(button.dataset.action){
case 'privacy':modal(t('privacy'),'<p class="privacy-text">'+t('privacyBody')+'</p>');break;
case 'write':reviewForm(own.find(r=>r.company===selected));break;
case 'close-detail':selected=null;renderDetail();renderList();renderMap();break;
case 'reset':bounds=null;view={lat:4.4,lng:108.8,zoom:5};renderList();renderMap();break;
case 'area':{const f=mapFrame(),nw=unproject(f.left,f.top,view.zoom),se=unproject(f.left+f.w,f.top+f.h,view.zoom);bounds={north:nw.lat,west:nw.lng,south:se.lat,east:se.lng};renderList();break;}
}
});
$('#language').onchange=e=>{lang=e.target.value;try{localStorage.setItem('ki-design-language',lang);}catch{}translate();};
$('#query').oninput=e=>{query=e.target.value;bounds=null;selected=null;renderDetail();renderList();const first=filtered()[0];if(first)view={lat:first.lat,lng:first.lng,zoom:query?11:12};renderMap();};
$('#clear').onclick=()=>{$('#query').value='';query='';bounds=null;renderList();renderMap();};
$('#industry').onchange=e=>{industry=e.target.value;renderList();renderMap();};
$('#minimum').onchange=e=>{minimum=Number(e.target.value);renderList();renderMap();};
$('#sort').onchange=e=>{sort=e.target.value;renderList();};
$('#close-dialog').onclick=()=>$('#dialog').close();
$('#dialog').onclick=e=>{if(e.target===$('#dialog'))$('#dialog').close();};
$('#expand').onclick=()=>$('#results').classList.toggle('expanded');
$('#brand').onclick=e=>{e.preventDefault();showScreen('explore');};
$('#map').onpointerdown=e=>{if(e.target.closest('button,a'))return;const center=project(view.lat,view.lng,view.zoom);drag={x:e.clientX,y:e.clientY,cx:center.x,cy:center.y};$('#map').setPointerCapture(e.pointerId);$('#map').classList.add('dragging');};
let frame=0;
$('#map').onpointermove=e=>{if(!drag)return;view={...unproject(drag.cx-e.clientX+drag.x,drag.cy-e.clientY+drag.y,view.zoom),zoom:view.zoom};cancelAnimationFrame(frame);frame=requestAnimationFrame(renderMap);};
const release=()=>{drag=null;$('#map').classList.remove('dragging');};$('#map').onpointerup=release;$('#map').onpointercancel=release;
$('#map').onkeydown=e=>{if(e.target!==$('#map'))return;const c=project(view.lat,view.lng,view.zoom);let x=0,y=0;if(e.key==='ArrowLeft')x=-100;if(e.key==='ArrowRight')x=100;if(e.key==='ArrowUp')y=-100;if(e.key==='ArrowDown')y=100;if(x||y){e.preventDefault();view={...unproject(c.x+x,c.y+y,view.zoom),zoom:view.zoom};renderMap();}if(e.key==='+'||e.key==='-'){view.zoom=Math.max(5,Math.min(17,view.zoom+(e.key==='+'?1:-1)));renderMap();}};
new ResizeObserver(()=>renderMap()).observe($('#map'));
translate();

