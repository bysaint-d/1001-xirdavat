const $=s=>document.querySelector(s),money=n=>Number(n).toLocaleString('az-AZ',{minimumFractionDigits:2,maximumFractionDigits:2})+' ₼';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cats=[['Ev və dekor','◒'],['Alətlər','⚒'],['Elektronika','▣'],['Aksesuarlar','◇'],['Mətbəx','♧'],['Hobbi və bağ','✿']];
let stores=[],products=[],cart={},likes=[],own=null,active=new URLSearchParams(location.search).get('category')||'Hamısı',onlyLikes=new URLSearchParams(location.search).has('favorites');
function storeOf(id){return stores.find(s=>s.id===id)||{name:'Mağaza'}}
function save(){updateCount()}
function updateCount(){}
function card(){return ''}
function showProduct(){}
function showStore(){}
function showCart(){}
function dashboard(){}
function createStore(){}
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3200)}
function open(html){$('#modalBody').innerHTML=html;if(!$('#modal').open)$('#modal').showModal()}
function close(){$('#modal').close()}
$('.close').onclick=close;$('#modal').addEventListener('click',e=>{if(e.target===$('#modal')){const r=$('#modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close()}});
function render(){if(!$('#productGrid'))return;let list=products.filter(p=>(active==='Hamısı'||p.category===active)&&(!onlyLikes||likes.includes(p.id))&&(p.name+' '+(p.sku||'')+' '+storeOf(p.store).name).toLocaleLowerCase('az').includes($('#search').value.toLocaleLowerCase('az')));const sort=$('#sort').value;if(sort==='low')list.sort((a,b)=>a.price-b.price);if(sort==='high')list.sort((a,b)=>b.price-a.price);if(sort==='new')list.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));$('#productGrid').innerHTML=list.map(card).join('');$('#empty').hidden=!!list.length;$('#productsTitle').textContent=onlyLikes?'Seçilmiş məhsullar':active==='Hamısı'?'Vitrində bu gün':active;$('#filters').innerHTML=['Hamısı',...cats.map(c=>c[0])].map(c=>`<button class="${active===c?'active':''}" data-filter="${c}">${c}</button>`).join('');$('#storeGrid').innerHTML=stores.map(s=>`<a class="store-card" href="/shop/${encodeURIComponent(s.slug)}"><span class="store-logo">✳</span><div><strong>${esc(s.name)}</strong><small>${products.filter(p=>p.store===s.id).length} məhsul · ${esc(s.category)}</small></div><span>↗</span></a>`).join('');updateCount()}
function filter(name){if(location.pathname!=='/'){location.assign('/?category='+encodeURIComponent(name));return}active=name;onlyLikes=false;render();$('#products').scrollIntoView({behavior:'smooth'})}
$('#categoryGrid').innerHTML=cats.map(([name,icon])=>`<button class="category" data-filter="${name}"><span>${icon}</span><b>${name}<i>↗</i></b></button>`).join('');
$('#search').value=new URLSearchParams(location.search).get('q')||'';
$('#searchForm').onsubmit=e=>{e.preventDefault();if(location.pathname!=='/'){location.assign('/?q='+encodeURIComponent($('#search').value));return}render();$('#products').scrollIntoView()};$('#search').oninput=()=>{if(location.pathname==='/')render()};$('#sort').onchange=()=>render();$('#reset').onclick=()=>{$('#search').value='';filter('Hamısı')};$('#favorites').onclick=()=>{if(location.pathname!=='/'){location.assign('/?favorites=1');return}onlyLikes=!onlyLikes;active='Hamısı';render();$('#products').scrollIntoView()};$('#allCategories').onclick=()=>{if(location.pathname!=='/')location.assign('/#products');else $('.categories').scrollIntoView()};
