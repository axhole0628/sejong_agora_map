(()=>{
'use strict';
const el=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
try{
const {buildings,extendedInfra,periods}=ATLAS_COMMON,{meta,shops}=PERIOD_DATA;
const {schools,agencies,stops}=extendedInfra;
buildings.forEach(b=>{b.ledgerUnits=b.units;b.units=b.appliedUnits??b.units;});
const colors={'건축물':'#f97316','학교':'#2563eb','공공기관':'#059669','정류장':'#0891b2','소상공인':'#a21caf'};
el('controls').innerHTML=`<label for="period" class="muted">소상공인 데이터 기준월</label><select id="period">${periods.map(p=>`<option value="${p.period}" ${p.period===meta.period?'selected':''}>${p.label} · 업소 ${p.shops}곳</option>`).join('')}</select><p>건축물 38건 · 학교 172곳 · 공공기관 25곳 · 정류장 1,518행</p>${Object.entries(colors).map(([name,color])=>`<label class="layer"><input type="checkbox" data-layer="${name}" ${name==='정류장'?'':'checked'}><span class="dot" style="background:${color}"></span>${name}${name==='정류장'?' (처음에는 숨김)':''}</label>`).join('')}<input id="search" type="search" placeholder="건물·시설·정류장·상호·주소 검색" aria-label="건물·시설·정류장·상호·주소 검색"><select id="sector" aria-label="소상공인 업종"><option value="">소상공인 모든 업종</option>${[...new Set(shops.map(s=>s.sector))].sort().map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('')}</select><button id="fit">표시된 시설 전체 보기</button> <button id="building-list">건물 목록·호수</button><details><summary class="muted">자료 기준·좌표 안내</summary><p>건축물 호수는 제공된 2026년 발급 대장 기준이며, 보완표 대상 4곳은 분석 적용 호수를 우선합니다.</p><p>학교 ${schools.length.toLocaleString()}곳은 ${esc(extendedInfra.sources.schools)}, 공공기관 ${agencies.length.toLocaleString()}곳은 ${esc(extendedInfra.sources.agencies)}, 정류장 ${stops.length.toLocaleString()}행은 ${esc(extendedInfra.sources.stops)} 기준입니다. 소상공인 기준월과 같은 시점의 시설 현황으로 해석하지 마세요.</p><p>정류장은 원자료 좌표, 학교·공공기관은 주소 검색 좌표입니다. 정류장 레이어는 화면 혼잡을 줄이기 위해 처음에는 숨깁니다. 정류장 원자료 1,518행에는 고유번호가 중복된 ${extendedInfra.stopDuplicateRows}행이 있어, 행을 삭제하지 않고 모두 표시했습니다(서로 다른 고유번호 ${extendedInfra.stopUniqueIds.toLocaleString()}개).</p><p>${esc(meta.label)} 원자료 ${meta.sourceRows.toLocaleString()}행 중 대상 건물 주소에 해당하는 ${shops.length.toLocaleString()}곳을 표시합니다. 업소 수는 호실 수나 실제 입점률·공실률과 다릅니다.</p><p class="source">소상공인 출처: ${esc(meta.source)}</p></details>${meta.fallback?`<p class="warning">${meta.period==='202503'?'2025년 3월 원자료 좌표에 오류가 있어 ':''}${meta.fallback}곳은 건축물 주소의 대표좌표로 표시합니다.</p>`:''}`;
const schoolLevel=document.createElement('select');schoolLevel.id='school-level';schoolLevel.setAttribute('aria-label','학교급 선택');schoolLevel.innerHTML='<option value="">모든 학교급</option>'+[...new Set(schools.map(s=>s.category))].map(level=>`<option value="${esc(level)}">${esc(level)}</option>`).join('');el('sector').after(schoolLevel);
el('period').onchange=e=>location.href='map_'+e.target.value+'.html';
if(!window.kakao?.maps)throw Error('카카오 지도를 불러오지 못했습니다. 인터넷 연결과 카카오에 등록한 사이트 주소를 확인하세요.');
const map=new kakao.maps.Map(el('map'),{center:new kakao.maps.LatLng(36.50,127.27),level:7,mapTypeId:kakao.maps.MapTypeId.SKYVIEW});
const boundaries=ATLAS_COMMON.boundaries;
if(boundaries){
const controls=document.createElement('section');controls.className='district-controls';
controls.innerHTML=`<label class="layer"><input id="district-toggle" type="checkbox" checked><span class="boundary-swatch"></span>읍·면·동 경계와 이름</label><select id="district-select" aria-label="읍면동으로 이동"><option value="">읍·면·동으로 이동</option>${boundaries.districts.map((d,i)=>`<option value="${i}">${esc(d.name)}</option>`).join('')}</select><p class="muted">행정경계 ${esc(boundaries.date)} 기준 · 모든 기준월 공통</p><details class="boundary-source"><summary>경계 자료 출처</summary><p>${esc(boundaries.attribution)}</p><p>${esc(boundaries.modification)}</p><a href="${esc(boundaries.sourceUrl)}" target="_blank" rel="noopener noreferrer">경계 원자료</a> · <a href="${esc(boundaries.licenseUrl)}" target="_blank" rel="noopener noreferrer">CC BY 4.0</a></details>`;
el('period').after(controls);
const districtLayers=boundaries.districts.map(d=>{
const polygons=[];
for(const rings of d.polygons){
const path=rings.map(ring=>ring.map(([lng,lat])=>new kakao.maps.LatLng(lat,lng)));
polygons.push(new kakao.maps.Polygon({map,path,strokeWeight:5,strokeColor:'#0f172a',strokeOpacity:0.5,strokeStyle:'solid',fillOpacity:0,zIndex:-2}));
polygons.push(new kakao.maps.Polygon({map,path,strokeWeight:2,strokeColor:'#fef08a',strokeOpacity:0.95,strokeStyle:'solid',fillColor:'#fef08a',fillOpacity:0.025,zIndex:-1}));
}
const content=document.createElement('div');content.className='district-label';content.textContent=d.name;
const label=new kakao.maps.CustomOverlay({map,position:new kakao.maps.LatLng(d.label[1],d.label[0]),content,zIndex:0,xAnchor:0.5,yAnchor:0.5});
return {district:d,polygons,label};
});
el('district-toggle').onchange=e=>{const target=e.target.checked?map:null;districtLayers.forEach(l=>{l.polygons.forEach(p=>p.setMap(target));l.label.setMap(target)});};
const population=ATLAS_COMMON.population;
let showPopulation=null;
if(population){
const box=document.createElement('section');box.className='population-controls';
box.innerHTML=`<label class="layer"><input id="population-toggle" type="checkbox" checked>읍·면·동 인구 색상</label><label for="population-year" class="muted">인구 기준연도 (소상공인 기준월과 별도)</label><select id="population-year">${[...population.years].reverse().map(y=>`<option value="${y}">${y}년 말</option>`).join('')}</select><div id="population-legend"></div><p id="population-summary"></p><p>제공된 7개 동만 표시 · 총인구 기준이며 인구밀도가 아닙니다. 지역을 클릭하거나 위 목록에서 선택하세요.</p><p>현재 경계에 연도별 통계를 연결한 참고 지도입니다. 경계 변경 지역의 연도 간 증감은 직접 비교하지 마세요.</p><p class="source">출처: ${esc(population.source)}</p><div id="population-detail" aria-live="polite"></div>`;
controls.append(box);
const bins=[{max:10000,color:'#ffffb2',label:'1만 미만'},{max:20000,color:'#fecc5c',label:'1만~2만 미만'},{max:30000,color:'#fd8d3c',label:'2만~3만 미만'},{max:Infinity,color:'#bd0026',label:'3만 이상'}];
const valueFor=d=>population.districts[d.name]?.years[el('population-year').value];
const shade=d=>{const v=valueFor(d);return !v?'#94a3b8':v.status==='boundary'?'#a78bfa':bins.find(b=>v.total<b.max).color;};
let selectedDistrict=null;
showPopulation=d=>{
selectedDistrict=d;
const v=valueFor(d),year=el('population-year').value;
el('population-detail').innerHTML=`<h3>${esc(d.name)} · ${year}년 말</h3>${!v?'<p>자료 미제공: 이 지역은 연간 엑셀에 없습니다. 인구 0명을 뜻하지 않습니다.</p>':`${v.status==='boundary'?'<p class="warning">경계 변경 주의: 원자료의 0은 무거주로 해석하지 않습니다. 분동 전 집계일 수 있으므로 현재 경계에 인구 색상을 적용하지 않았습니다.</p>':''}<p><strong>${v.status==='boundary'?'원자료 총 거주자수':'총인구'} ${v.total.toLocaleString()}명</strong><br>세대수 ${v.households.toLocaleString()}세대<br>남 ${v.male.toLocaleString()}명 · 여 ${v.female.toLocaleString()}명<br>세대당 인구 ${v.perHousehold.toFixed(2)}명</p>`}`;
};
function paintPopulation(){
const enabled=el('population-toggle').checked;
districtLayers.forEach(l=>l.polygons.forEach((p,i)=>{if(i%2===1)p.setOptions({fillColor:enabled?shade(l.district):'#fef08a',fillOpacity:enabled?0.48:0.025});}));
el('population-legend').innerHTML=enabled?[...bins,{color:'#94a3b8',label:'자료 미제공'},{color:'#a78bfa',label:'경계 변경 주의'}].map(b=>`<span><i style="background:${b.color}"></i>${b.label}</span>`).join(''):'';
const city=population.city[el('population-year').value];
el('population-summary').textContent=`${el('population-year').value}년 말 세종시 전체 ${city.total.toLocaleString()}명 · ${city.households.toLocaleString()}세대 (표시 7개 동의 합계 아님)`;
if(selectedDistrict)showPopulation(selectedDistrict);
}
el('population-year').onchange=paintPopulation;
el('population-toggle').onchange=()=>{if(el('population-toggle').checked){el('district-toggle').checked=true;el('district-toggle').dispatchEvent(new Event('change'));}paintPopulation();};
const boundaryVisibility=el('district-toggle').onchange;
el('district-toggle').onchange=e=>{boundaryVisibility(e);if(!e.target.checked){el('population-toggle').checked=false;paintPopulation();}};
districtLayers.forEach(l=>l.polygons.forEach(p=>kakao.maps.event.addListener(p,'click',()=>showPopulation(l.district))));
paintPopulation();
}
el('district-select').onchange=e=>{
if(e.target.value==='')return;
const layer=districtLayers[Number(e.target.value)];
if(showPopulation)showPopulation(layer.district);
el('district-toggle').checked=true;el('district-toggle').dispatchEvent(new Event('change'));
const bounds=new kakao.maps.LatLngBounds();
layer.district.polygons.forEach(rings=>rings[0].forEach(([lng,lat])=>bounds.extend(new kakao.maps.LatLng(lat,lng))));
map.relayout();
const mobile=window.innerWidth<=600,panel=el('panel').getBoundingClientRect();
map.setBounds(bounds,mobile?Math.min(panel.height+24,window.innerHeight*.5):40,40,40,mobile?24:panel.width+40);
};
}else{
const message=document.createElement('p');message.className='muted';message.textContent='읍면동 경계를 보려면 최신 common.js도 함께 업로드하세요.';el('period').after(message);
}
const layers={},records=[];let overlay=null,selectedBuilding=null;
// These are educational, unitless indices, not station measurements or AQI.
const air=ATLAS_COMMON.airQuality;
let airForBuilding=()=>'';
if(air){
const correspondingQuarter=Object.entries(air.matchedPeriods).find(([,period])=>period===meta.period)?.[0]||'';
const quarterLabel=q=>q?q.slice(0,4)+'년 '+q.slice(-1)+'분기':'대응 자료 없음';
const section=document.createElement('section');section.className='air-controls';
section.innerHTML=`<h2>미세먼지·대기질 분기지수</h2><p class="air-notice">교육용 상대지수 · 단위 없음<br>실시간 농도·공식 통계·건강등급이 아닙니다.</p><label class="layer"><input id="air-toggle" type="checkbox" checked>상권별 지수 표시</label><label for="air-quarter" class="muted">대기질 기준분기 (별도 선택)</label><select id="air-quarter">${!correspondingQuarter?`<option value="">${esc(meta.label)} 대응 자료 없음</option>`:''}${air.quarters.map(q=>`<option value="${esc(q)}" ${q===correspondingQuarter?'selected':''}>${quarterLabel(q)}</option>`).join('')}</select><select id="air-metric" aria-label="지도에 표시할 대기질 지표">${air.metrics.map(m=>`<option value="${esc(m.key)}" ${m.key==='discomfort'?'selected':''}>${esc(m.label)}</option>`).join('')}</select><p id="air-timing" role="status"></p><div id="air-legend"></div><select id="air-region" aria-label="대기질 권역 선택"><option value="">상권 선택·상세 보기</option>${air.regions.map(r=>`<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('')}</select><button id="air-fit">대기질 권역 전체 보기</button><div id="air-detail" aria-live="polite"></div><details class="air-source"><summary>자료 범위·출처·해석 주의</summary><p>${esc(air.note)}</p><p>${esc(air.coordinateNote)}</p><p>6개 권역에 연결된 건축물대장 15건에만 적용합니다. 나머지 23건은 자료 미제공이며 0을 뜻하지 않습니다. 행정동 전체의 대기질로 확장하지 않았습니다.</p><p>${esc(air.formulaNote||'종합지수는 재계산하지 않고 CSV 값을 그대로 표시합니다.')}</p><p class="source">출처: ${esc(air.source)}<br>해석 기준: README_참가자용_자료안내.pdf 2쪽</p></details>`;
el('period').after(section);
const metric=()=>air.metrics.find(m=>m.key===el('air-metric').value);
const valueText=v=>Number.isFinite(v)?v.toLocaleString('ko-KR',{maximumFractionDigits:1}):'자료 없음';
const metricTable=v=>`<table class="air-table"><caption>단위 없는 교육용 상대지수</caption><tbody>${air.metrics.map(m=>`<tr><th scope="row">${esc(m.label)}</th><td>${valueText(v[m.key])}</td></tr>`).join('')}</tbody></table>`;
const sourceQuarterNote=()=>el('air-quarter').value===correspondingQuarter&&correspondingQuarter?'소상공인 자료와 대응하는 기준분기입니다.':'소상공인 기준월과 대응하지 않는 별도 분기입니다. 같은 시점으로 비교하지 마세요.';
airForBuilding=b=>{
const region=air.regions.find(r=>r.buildingIds.includes(b.id)),q=el('air-quarter').value;
return `<h3>상권 미세먼지·대기질</h3>${!region?'<p>이 건물에 대응하는 권역 자료는 제공되지 않았습니다.</p>':`<p>${esc(region.name)} · ${quarterLabel(q)}</p>${q&&region.values[q]?metricTable(region.values[q]):'<p>해당 기준월의 대응 자료가 없습니다. 대기질 기준분기를 별도로 선택해 볼 수 있습니다.</p>'}`}<p class="muted">권역 단위 교육용 지수이며, 건물에서 실측한 농도가 아닙니다.${q?' '+sourceQuarterNote():''}</p>`;
};
function showAirRegion(region){
const q=el('air-quarter').value,v=region.values[q],m=metric();
el('air-detail').innerHTML=`<h3>${esc(region.name)} · ${quarterLabel(q)}</h3><p>대상: ${esc(region.dong)} ${esc(region.parcelText)}<br>연결 건물 ${region.buildingIds.length}건 · 측정소 위치 아님</p>${v?metricTable(v):'<p>선택 시점 자료 없음 (0이 아님)</p>'}<details><summary>제공된 4개 분기 비교</summary><table class="air-table"><caption>${esc(m.label)} · 누락 분기 보간 없음</caption><tbody>${air.quarters.map(quarter=>`<tr ${q===quarter?'class="air-current"':''}><th scope="row">${quarterLabel(quarter)}</th><td>${valueText(region.values[quarter]?.[m.key])}</td></tr>`).join('')}</tbody></table></details>`;
}
const airMarkers=air.regions.map(region=>{
const badge=document.createElement('button');badge.type='button';badge.className='air-badge';badge.dataset.airRegion=region.id;
badge.onclick=()=>{el('air-region').value=region.id;showAirRegion(region);el('air-detail').scrollIntoView({block:'nearest'});};
const marker=new kakao.maps.CustomOverlay({position:new kakao.maps.LatLng(region.lat,region.lng),content:badge,clickable:true,xAnchor:0.5,yAnchor:1.6,zIndex:12});
return {region,badge,marker};
});
function renderAir(){
const q=el('air-quarter').value,m=metric(),enabled=el('air-toggle').checked;
const values=air.regions.flatMap(r=>Object.values(r.values).map(v=>v[m.key])).filter(Number.isFinite),lo=Math.min(...values),hi=Math.max(...values);
const fraction=v=>hi===lo?0.5:(v-lo)/(hi-lo);
const color=v=>{const t=fraction(v);return `rgb(${[213,243,238].map((x,i)=>Math.round(x+([19,105,95][i]-x)*t)).join(',')})`;};
airMarkers.forEach(({region,badge,marker})=>{
const v=region.values[q]?.[m.key];
badge.textContent=region.name+' · '+valueText(v);badge.style.background=Number.isFinite(v)?color(v):'#e2e8f0';badge.style.color=Number.isFinite(v)&&fraction(v)>.55?'white':'#123c36';
badge.title=`${region.name} · ${quarterLabel(q)} · ${m.label} ${valueText(v)} / 교육용·단위 없음·대표위치`;
badge.setAttribute('aria-label',badge.title+' 상세 보기');
marker.setMap(enabled&&Number.isFinite(v)?map:null);
});
el('air-timing').textContent=q?quarterLabel(q)+' · '+sourceQuarterNote():'해당 소상공인 기준월의 대응 대기질 자료가 없습니다. 다른 분기는 위에서 별도로 선택하세요. 임의 보간은 하지 않습니다.';
el('air-timing').className=q===correspondingQuarter&&q?'muted':'air-notice';
el('air-legend').innerHTML=q&&enabled?`<div class="air-ramp"></div><div class="air-scale"><span>${valueText(lo)}</span><span>${valueText(hi)}</span></div><p>${esc(m.label)} · 진할수록 불편 지수 큼<br>4개 분기 전체에 같은 색상 범위 적용</p>`:'';
const selected=air.regions.find(r=>r.id===el('air-region').value);if(selected)showAirRegion(selected);
const summary=document.querySelector('[data-air-building]');if(summary){const b=buildings.find(b=>b.id===summary.dataset.airBuilding);if(b)summary.innerHTML=airForBuilding(b);}
el('air-fit').disabled=!q||!enabled;
}
function fitAir(regions){
if(!regions.length)return;
const bounds=new kakao.maps.LatLngBounds();regions.forEach(r=>bounds.extend(new kakao.maps.LatLng(r.lat,r.lng)));
if(regions.length===1){const r=regions[0];bounds.extend(new kakao.maps.LatLng(r.lat-.002,r.lng-.002));bounds.extend(new kakao.maps.LatLng(r.lat+.002,r.lng+.002));}
map.relayout();
const mobile=window.innerWidth<=600,panel=el('panel').getBoundingClientRect();
map.setBounds(bounds,mobile?Math.min(panel.height+24,window.innerHeight*.5):40,100,100,mobile?50:panel.width+80);
}
el('air-quarter').onchange=renderAir;el('air-metric').onchange=renderAir;el('air-toggle').onchange=renderAir;
el('air-region').onchange=()=>{const r=air.regions.find(r=>r.id===el('air-region').value);if(!r){el('air-detail').replaceChildren();return;}showAirRegion(r);fitAir([r]);};
el('air-fit').onclick=()=>fitAir(air.regions.filter(r=>r.values[el('air-quarter').value]));
renderAir();
}
// This atlas covers Sejong: reject missing and out-of-area coordinates before
// passing them to Kakao's local map projection (0,0 corrupts its bounds).
const unlocated=[];
function validCoordinates(lat,lng){return Number.isFinite(lat)&&Number.isFinite(lng)&&lat>36.35&&lat<36.8&&lng>127.1&&lng<127.5;}
for(const [name,color] of Object.entries(colors)){
const size=name==='건축물'?30:name==='정류장'?16:22,svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2-3}" fill="${color}" stroke="white" stroke-width="3"/></svg>`;
layers[name]={image:new kakao.maps.MarkerImage('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg),new kakao.maps.Size(size,size),{offset:new kakao.maps.Point(size/2,size/2)}),cluster:new kakao.maps.MarkerClusterer({map,averageCenter:true,minLevel:name==='소상공인'||name==='정류장'?5:7,styles:[{width:'40px',height:'40px',background:color,color:'white',borderRadius:'50%',textAlign:'center',lineHeight:'40px',fontWeight:'bold'}]})};
}
function clearSelection(){if(overlay)overlay.setMap(null);overlay=null;selectedBuilding=null;}
function selectMarker(r){if(overlay)overlay.setMap(null);overlay=null;if(!r)return;overlay=new kakao.maps.CustomOverlay({map,position:r.marker.getPosition(),yAnchor:1.5,zIndex:20,content:`<div class="popup-label">${esc(r.item.name)}${r.layer==='건축물'?' · 총 '+r.item.units+'호':''}</div>`});}
function button(text,click){const b=document.createElement('button');b.className='entry';b.textContent=text;b.onclick=click;return b;}
function showShop(s){el('details').innerHTML=`<h2>${esc(s.name)} ${esc(s.branch)}</h2><p>${esc(meta.label)} · ${esc(s.category)}</p><p>${esc(s.address)}<br>건물명: ${esc(s.buildingName||'미기재')}<br>층: ${esc(s.floor||'미기재')} / 호: ${esc(s.unit||'미기재')}</p><p>위치: ${esc(s.coordinateSource)}</p><p class="source">업소번호: ${esc(s.id)}<br>${esc(meta.source)}</p><h3>주소가 연결된 건축물대장</h3>`;s.buildings.forEach(id=>{const b=buildings.find(b=>b.id===id);el('details').append(button(b.name+' · '+b.units+'호',()=>showBuilding(b)))});}
function showBuilding(b){
selectedBuilding=b.id;
const peers=buildings.filter(x=>x.address===b.address),tenantShops=shops.filter(s=>s.buildings.includes(b.id));
el('details').innerHTML=`<h2>${esc(b.name)}</h2><p>${esc(b.address)}</p><span class="metric">${b.appliedUnits!==null?'보완표 적용':'대장 표기'} 총 ${b.units.toLocaleString()}호</span><p>가구수 ${b.households} · 세대수 ${b.dwellings}</p>${b.appliedUnits!==null?`<p class="warning">원래 대장 표기: ${b.ledgerUnits}호 → 분석 적용: <b>${b.appliedUnits}호</b><br>${esc(b.correctionReason)}<br>출처: 건축물대장_호실수_보완표.csv</p>`:''}<p class="source">${esc(b.unitSource)} · ${esc(b.document)}<br>대장 발급일: ${esc(b.ledgerDate)}</p><h3>${esc(meta.label)} 수록 업소 ${tenantShops.length}곳${peers.length>1?' (동일 주소 전체)':''}</h3>${peers.length>1?'<p class="warning">이 주소에 대장 '+peers.length+'건이 있습니다. 업소를 개별 동에 임의 배분하지 않았습니다.</p>':''}<div id="peer-buildings"></div><p class="muted">업소 수와 대장 호수의 차이는 실제 공실 수를 의미하지 않습니다.</p><div id="tenant-list" class="result-list"></div>`;
if(air){const summary=document.createElement('section');summary.className='air-building';summary.dataset.airBuilding=b.id;summary.innerHTML=airForBuilding(b);el('details').insertBefore(summary,el('details').querySelector('h3'));}
peers.filter(x=>x.id!==b.id).forEach(x=>el('peer-buildings').append(button(x.name+' · 총 '+x.units+'호',()=>showBuilding(x))));
tenantShops.forEach(s=>el('tenant-list').append(button(s.name+(s.branch?' '+s.branch:'')+' · '+(s.floor||'?')+'층',()=>showShop(s))));
const r=records.find(r=>r.layer==='건축물'&&r.item.id===b.id);selectMarker(r);
}
function show(r){selectMarker(r);if(r.layer==='건축물')showBuilding(r.item);else if(r.layer==='소상공인'){
const peers=shops.filter(s=>s.lat===r.lat&&s.lng===r.lng);showShop(r.item);
if(peers.length>1){const h=document.createElement('h3');h.textContent='같은 좌표의 업소 '+peers.length+'곳';el('details').append(h);const list=document.createElement('div');list.className='result-list';peers.forEach(s=>list.append(button(s.name+' '+s.branch,()=>showShop(s))));el('details').append(list);}
}else if(r.layer==='학교')el('details').innerHTML=`<h2>${esc(r.item.name)}</h2><p>${esc(r.item.establishment)} ${esc(r.item.category)} · ${esc(r.item.region)}</p><span class="metric">학생 ${r.item.students.toLocaleString()}명</span><p>학급 ${r.item.classes.toLocaleString()}개<br>${esc(r.item.address)}<br>전화 ${esc(r.item.phone||'미기재')}</p><p class="source">좌표: ${esc(r.item.coordinateSource)}<br>출처: ${esc(extendedInfra.sources.schools)}</p>`;
else if(r.layer==='공공기관')el('details').innerHTML=`<h2>${esc(r.item.name)}</h2><p>주무부처: ${esc(r.item.ministry||'미기재')}<br>${esc(r.item.address)}<br>${esc(r.item.parcelAddress)}</p><p class="source">좌표: ${esc(r.item.coordinateSource)}<br>출처: ${esc(extendedInfra.sources.agencies)}</p>`;
else el('details').innerHTML=`<h2>${esc(r.item.name)}</h2><p>정류장 고유번호 ${esc(r.item.stopId)}</p><p class="source">원자료 좌표 ${r.lat.toFixed(7)}, ${r.lng.toFixed(7)}<br>출처: ${esc(extendedInfra.sources.stops)}</p>`;}
function add(item,layer){const lat=Number(item.lat),lng=Number(item.lng);if(!validCoordinates(lat,lng)){unlocated.push(item.name);return;}const marker=new kakao.maps.Marker({position:new kakao.maps.LatLng(lat,lng),image:layers[layer].image,title:item.name,zIndex:layer==='건축물'?10:1});const r={item,layer,lat,lng,marker};records.push(r);kakao.maps.event.addListener(marker,'click',()=>show(r));}
buildings.forEach(b=>add(b,'건축물'));schools.forEach(i=>add(i,'학교'));agencies.forEach(i=>add(i,'공공기관'));stops.forEach(i=>add(i,'정류장'));shops.forEach(s=>add(s,'소상공인'));
function visible(){const q=el('search').value.trim().toLowerCase(),sector=el('sector').value,level=el('school-level').value,enabled=new Set([...document.querySelectorAll('[data-layer]:checked')].map(x=>x.dataset.layer));return records.filter(r=>enabled.has(r.layer)&&(r.layer!=='소상공인'||!sector||r.item.sector===sector)&&(r.layer!=='학교'||!level||r.item.category===level)&&(!q||[r.item.name,r.item.address,r.item.branch,r.item.buildingName,r.item.stopId,r.item.ministry,r.item.category].join(' ').toLowerCase().includes(q)));}
function render(){clearSelection();const rows=visible();for(const [name,l]of Object.entries(layers)){l.cluster.clear();l.cluster.addMarkers(rows.filter(r=>r.layer===name).map(r=>r.marker));}el('status').textContent=`${meta.label} · 건축물 ${rows.filter(r=>r.layer==='건축물').length}/38 · 학교 ${rows.filter(r=>r.layer==='학교').length}/172 · 공공기관 ${rows.filter(r=>r.layer==='공공기관').length}/25 · 정류장 ${rows.filter(r=>r.layer==='정류장').length}/1518 · 업소 ${rows.filter(r=>r.layer==='소상공인').length}/${shops.length}`;el('details').replaceChildren();if(unlocated.length){const note=document.createElement('p');note.className='warning';note.textContent='좌표 확인 필요 (지도에서 제외): '+unlocated.join(', ');el('details').append(note);}if(el('search').value.trim()){const list=document.createElement('div');list.className='result-list';rows.slice(0,100).forEach(r=>list.append(button(r.item.name+' · '+r.layer,()=>{map.setLevel(3);map.panTo(r.marker.getPosition());show(r)})));el('details').append(list);if(rows.length>100){const note=document.createElement('p');note.textContent='목록은 검색 결과 중 100건까지 표시합니다.';el('details').append(note);}}}
el('search').oninput=render;el('sector').onchange=render;el('school-level').onchange=render;document.querySelectorAll('[data-layer]').forEach(x=>x.onchange=render);
el('fit').onclick=()=>{
const rows=visible().filter(r=>validCoordinates(r.lat,r.lng));
if(!rows.length)return;
clearSelection();map.relayout();
const first=rows[0];
if(rows.every(r=>r.lat===first.lat&&r.lng===first.lng)){
map.setLevel(4);map.setCenter(new kakao.maps.LatLng(first.lat,first.lng));return;
}
const bounds=new kakao.maps.LatLngBounds();
rows.forEach(r=>bounds.extend(new kakao.maps.LatLng(r.lat,r.lng)));
map.setBounds(bounds);
};
el('building-list').onclick=()=>{el('details').innerHTML='<h2>건물 38건 · 보완표 반영 호수</h2>';buildings.forEach(b=>el('details').append(button(b.name+' · '+b.units+'호',()=>{if(validCoordinates(Number(b.lat),Number(b.lng))){map.setLevel(3);map.panTo(new kakao.maps.LatLng(b.lat,b.lng));}showBuilding(b)})))};
render();
}catch(e){el('status').textContent=e.message;console.error(e);}
})();
