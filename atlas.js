(()=>{
'use strict';
const el=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
try{
const {buildings,infra,periods}=ATLAS_COMMON,{meta,shops}=PERIOD_DATA;
buildings.forEach(b=>{b.ledgerUnits=b.units;b.units=b.appliedUnits??b.units;});
const colors={'건축물':'#f97316','교육':'#2563eb','행정':'#059669','소상공인':'#a21caf'};
el('controls').innerHTML=`<label for="period" class="muted">소상공인 데이터 기준월</label><select id="period">${periods.map(p=>`<option value="${p.period}" ${p.period===meta.period?'selected':''}>${p.label} · 업소 ${p.shops}곳</option>`).join('')}</select><p>건축물 38건 · 교육 105곳 · 행정 25곳</p>${Object.entries(colors).map(([name,color])=>`<label class="layer"><input type="checkbox" data-layer="${name}" checked><span class="dot" style="background:${color}"></span>${name}</label>`).join('')}<input id="search" type="search" placeholder="건물·상호·주소 검색" aria-label="건물·상호·주소 검색"><select id="sector" aria-label="소상공인 업종"><option value="">소상공인 모든 업종</option>${[...new Set(shops.map(s=>s.sector))].sort().map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('')}</select><button id="fit">표시된 시설 전체 보기</button> <button id="building-list">건물 목록·호수</button><details><summary class="muted">자료 기준·좌표 안내</summary><p>건축물 호수는 제공된 2026년 발급 대장 기준이며, 보완표 대상 4곳은 분석 적용 호수를 우선합니다. 인프라도 제공된 공통 자료이며, 선택한 과거 월의 시설 현황을 뜻하지 않습니다.</p><p>${esc(meta.label)} 원자료 ${meta.sourceRows.toLocaleString()}행 중 대상 건물 주소에 해당하는 ${shops.length.toLocaleString()}곳을 표시합니다. 업소 수는 호실 수나 실제 입점률·공실률과 다릅니다.</p><p class="source">소상공인 출처: ${esc(meta.source)}</p></details>${meta.fallback?`<p class="warning">${meta.period==='202503'?'2025년 3월 원자료 좌표에 오류가 있어 ':''}${meta.fallback}곳은 건축물 주소의 대표좌표로 표시합니다.</p>`:''}`;
el('period').onchange=e=>location.href='map_'+e.target.value+'.html';
if(!window.kakao?.maps)throw Error('카카오 지도를 불러오지 못했습니다. 인터넷 연결과 카카오에 등록한 사이트 주소를 확인하세요.');
const map=new kakao.maps.Map(el('map'),{center:new kakao.maps.LatLng(36.50,127.27),level:7,mapTypeId:kakao.maps.MapTypeId.SKYVIEW});
const layers={},records=[];let overlay=null,selectedBuilding=null;
for(const [name,color] of Object.entries(colors)){
const size=name==='건축물'?30:22,svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2-3}" fill="${color}" stroke="white" stroke-width="3"/></svg>`;
layers[name]={image:new kakao.maps.MarkerImage('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg),new kakao.maps.Size(size,size),{offset:new kakao.maps.Point(size/2,size/2)}),cluster:new kakao.maps.MarkerClusterer({map,averageCenter:true,minLevel:name==='소상공인'?5:7,styles:[{width:'40px',height:'40px',background:color,color:'white',borderRadius:'50%',textAlign:'center',lineHeight:'40px',fontWeight:'bold'}]})};
}
function clearSelection(){if(overlay)overlay.setMap(null);overlay=null;selectedBuilding=null;}
function selectMarker(r){if(overlay)overlay.setMap(null);overlay=new kakao.maps.CustomOverlay({map,position:r.marker.getPosition(),yAnchor:1.5,zIndex:20,content:`<div class="popup-label">${esc(r.item.name)}${r.layer==='건축물'?' · 총 '+r.item.units+'호':''}</div>`});}
function button(text,click){const b=document.createElement('button');b.className='entry';b.textContent=text;b.onclick=click;return b;}
function showShop(s){el('details').innerHTML=`<h2>${esc(s.name)} ${esc(s.branch)}</h2><p>${esc(meta.label)} · ${esc(s.category)}</p><p>${esc(s.address)}<br>건물명: ${esc(s.buildingName||'미기재')}<br>층: ${esc(s.floor||'미기재')} / 호: ${esc(s.unit||'미기재')}</p><p>위치: ${esc(s.coordinateSource)}</p><p class="source">업소번호: ${esc(s.id)}<br>${esc(meta.source)}</p><h3>주소가 연결된 건축물대장</h3>`;s.buildings.forEach(id=>{const b=buildings.find(b=>b.id===id);el('details').append(button(b.name+' · '+b.units+'호',()=>showBuilding(b)))});}
function showBuilding(b){
selectedBuilding=b.id;
const peers=buildings.filter(x=>x.address===b.address),tenantShops=shops.filter(s=>s.buildings.includes(b.id));
el('details').innerHTML=`<h2>${esc(b.name)}</h2><p>${esc(b.address)}</p><span class="metric">${b.appliedUnits!==null?'보완표 적용':'대장 표기'} 총 ${b.units.toLocaleString()}호</span><p>가구수 ${b.households} · 세대수 ${b.dwellings}</p>${b.appliedUnits!==null?`<p class="warning">원래 대장 표기: ${b.ledgerUnits}호 → 분석 적용: <b>${b.appliedUnits}호</b><br>${esc(b.correctionReason)}<br>출처: 건축물대장_호실수_보완표.csv</p>`:''}<p class="source">${esc(b.unitSource)} · ${esc(b.document)}<br>대장 발급일: ${esc(b.ledgerDate)}</p><h3>${esc(meta.label)} 수록 업소 ${tenantShops.length}곳${peers.length>1?' (동일 주소 전체)':''}</h3>${peers.length>1?'<p class="warning">이 주소에 대장 '+peers.length+'건이 있습니다. 업소를 개별 동에 임의 배분하지 않았습니다.</p>':''}<div id="peer-buildings"></div><p class="muted">업소 수와 대장 호수의 차이는 실제 공실 수를 의미하지 않습니다.</p><div id="tenant-list" class="result-list"></div>`;
peers.filter(x=>x.id!==b.id).forEach(x=>el('peer-buildings').append(button(x.name+' · 총 '+x.units+'호',()=>showBuilding(x))));
tenantShops.forEach(s=>el('tenant-list').append(button(s.name+(s.branch?' '+s.branch:'')+' · '+(s.floor||'?')+'층',()=>showShop(s))));
const r=records.find(r=>r.layer==='건축물'&&r.item.id===b.id);selectMarker(r);
}
function show(r){selectMarker(r);if(r.layer==='건축물')showBuilding(r.item);else if(r.layer==='소상공인'){
const peers=shops.filter(s=>s.lat===r.lat&&s.lng===r.lng);showShop(r.item);
if(peers.length>1){const h=document.createElement('h3');h.textContent='같은 좌표의 업소 '+peers.length+'곳';el('details').append(h);const list=document.createElement('div');list.className='result-list';peers.forEach(s=>list.append(button(s.name+' '+s.branch,()=>showShop(s))));el('details').append(list);}
}else el('details').innerHTML=`<h2>${esc(r.item.name)}</h2><p>${esc(r.item.category)}<br>${esc(r.item.address)}</p><p class="source">출처: 세종시 주요 인프라 마스터테이블 좌표포함 CSV</p>`;}
function add(item,layer){const lat=Number(item.lat),lng=Number(item.lng);if(!Number.isFinite(lat)||!Number.isFinite(lng))throw Error('좌표 누락: '+item.name);const marker=new kakao.maps.Marker({position:new kakao.maps.LatLng(lat,lng),image:layers[layer].image,title:item.name,zIndex:layer==='건축물'?10:1});const r={item,layer,lat,lng,marker};records.push(r);kakao.maps.event.addListener(marker,'click',()=>show(r));}
buildings.forEach(b=>add(b,'건축물'));infra.forEach(i=>add(i,i.type));shops.forEach(s=>add(s,'소상공인'));
function visible(){const q=el('search').value.trim().toLowerCase(),sector=el('sector').value,enabled=new Set([...document.querySelectorAll('[data-layer]:checked')].map(x=>x.dataset.layer));return records.filter(r=>enabled.has(r.layer)&&(r.layer!=='소상공인'||!sector||r.item.sector===sector)&&(!q||[r.item.name,r.item.address,r.item.branch,r.item.buildingName].join(' ').toLowerCase().includes(q)));}
function render(){clearSelection();const rows=visible();for(const [name,l]of Object.entries(layers)){l.cluster.clear();l.cluster.addMarkers(rows.filter(r=>r.layer===name).map(r=>r.marker));}el('status').textContent=`${meta.label} · 건축물 ${rows.filter(r=>r.layer==='건축물').length}/38 · 인프라 ${rows.filter(r=>r.layer==='교육'||r.layer==='행정').length}/130 · 업소 ${rows.filter(r=>r.layer==='소상공인').length}/${shops.length}`;el('details').replaceChildren();if(el('search').value.trim()){const list=document.createElement('div');list.className='result-list';rows.slice(0,100).forEach(r=>list.append(button(r.item.name+' · '+r.layer,()=>{map.setLevel(3);map.panTo(r.marker.getPosition());show(r)})));el('details').append(list);if(rows.length>100){const note=document.createElement('p');note.textContent='목록은 검색 결과 중 100건까지 표시합니다.';el('details').append(note);}}}
el('search').oninput=render;el('sector').onchange=render;document.querySelectorAll('[data-layer]').forEach(x=>x.onchange=render);
el('fit').onclick=()=>{const rows=visible();if(!rows.length)return;const bounds=new kakao.maps.LatLngBounds();rows.forEach(r=>bounds.extend(r.marker.getPosition()));map.setBounds(bounds)};
el('building-list').onclick=()=>{el('details').innerHTML='<h2>건물 38건 · 보완표 반영 호수</h2>';buildings.forEach(b=>el('details').append(button(b.name+' · '+b.units+'호',()=>{map.setLevel(3);map.panTo(new kakao.maps.LatLng(b.lat,b.lng));showBuilding(b)})))};
render();
}catch(e){el('status').textContent=e.message;console.error(e);}
})();
