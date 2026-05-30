/* =====================================================================
   THE VEIL OF HISTORY — front-end logic
   Consumes window.VEIL_MODEL (model.js) and renders the page.
   ===================================================================== */
(function () {
  "use strict";
  const M = window.VEIL_MODEL;
  const $ = (s, r) => (r || document).querySelector(s);
  const fmt = n => Math.round(n).toLocaleString("en-US");
  const pct = (b) => (b / M.TOTAL_BIRTHS) * 100;

  // numeric year bounds per era (for the draw + sorting)
  const YEARS = {
    paleo:[-190000,-50000], mesolithic:[-50000,-8000], neolithic:[-8000,1],
    classical:[1,1200], latemed:[1200,1650], earlymod:[1650,1750], indust:[1750,1850],
    imperial:[1850,1900], modern1:[1900,1950], modern2:[1950,2000], contemp1:[2000,2010], contemp2:[2010,2022]
  };
  const RECENT = new Set(["imperial","modern1","modern2","contemp1","contemp2"]);

  // region → evocative life role (era-sensitive for foraging)
  function role(regionId, eraId){
    const forage = eraId === "paleo" || eraId === "mesolithic";
    const map = {
      south_asia: forage ? "南亚平原的采猎者"      : "印度河平原的农民",
      east_asia:  forage ? "东亚的采猎者"                   : "东亚河谷的农民",
      europe:     forage ? "冰河时代欧洲的采猎者"              : "耕种欧洲土地的农奴",
      ssa:        forage ? "撒哈拉以南非洲的采猎者"          : "撒哈拉以南非洲的农民或牧民",
      mena:       forage ? "近东的采猎者"               : "新月沃地与尼罗河流域的耕种者",
      sea:        forage ? "东南亚的采猎者"              : "东南亚的水稻种植者",
      americas:   forage ? "美洲的采猎者"                : "美洲的玉米或薯类种植者",
      central:    forage ? "欧亚内陆的采猎者"               : "欧亚大草原上的牧民",
      oceania:    forage ? "萨胡尔与太平洋的采猎者"         : "太平洋岛屿的耕种者",
    };
    return map[regionId];
  }
  function conditionClause(eraId){
    const c = M.CONDITION[eraId];
    const pv = Math.round(c.poverty*100), cd = Math.round(c.childDeath*100);
    if (eraId==="paleo"||eraId==="mesolithic")
      return `靠采猎维生——没有文字，没有余粮，成年前死亡的概率约为${cd}%。`;
    return `几乎普遍处于温饱贫困（~${pv}%），几乎可以肯定是文盲，15岁前死亡的概率约为${cd}%。`;
  }

  // Hand-written vignettes for the most probable place×era lives. Key: "regionId|eraId".
  const VIGNETTE = {
    "south_asia|neolithic": {t:"印度河与恒河之子", d:"你在一个泥砖村庄醒来，身处广阔的河流冲积平原上，是世界上最早期的农民之一。生活是大麦、扁豆、牛和季风——你用手磨谷物，祈求降雨。你很可能在兄弟姐妹学会走路之前就要埋葬他们。"},
    "east_asia|neolithic": {t:"黄河流域的第一代农民", d:"你出生在黄河或长江沿岸的一座夯土小村里，在村长或早期国王的治下种植粟和最早的水稻。陶器和祖先崇拜填满了你的日常；与你一起长大的孩子中，大约有一半活不到十五岁。"},
    "south_asia|classical": {t:"笈多时代的村民", d:"你属于笈多或朱罗时代一个村庄中的农耕种姓。你要向地主和寺庙交纳谷物，在少年时期便成婚，你祖父母耕种过的同一片田地将传给你的孩子——如果他们能活下来的话。"},
    "east_asia|classical": {t:"汉唐治下的农民", d:"你在历史上最伟大的官僚体系之一下种植水稻，以谷物和徭役纳税。你叫得出皇帝的名号，却永远不会亲眼看到城墙。洪涝、干旱或叛乱，只需一次歉收便可降临。"},
    "mena|neolithic": {t:"城市诞生之地的人", d:"你的村庄坐落于新月沃地或尼罗河畔——正是农业、王权和文字被发明的地方。你为神庙粮仓挑水割大麦。书吏记录收成，却永远不会记下你的名字。"},
    "europe|neolithic": {t:"北方森林的牧人", d:"你住在新石器时代或铁器时代欧洲森林边缘的一座木草圆形屋中。牛、谷物和漫长黑暗的冬季主宰着你的一年；青铜是珍贵的，铁是新兴之物，更广阔的世界止于下一个山谷。"},
    "ssa|neolithic": {t:"大草原的牧牛人", d:"随着农业和畜牧业在非洲各地传播，你在辽阔的天空下放牛或锄种粟和高粱。你的亲属群体就是你全部的世界和知识库；一切值得知晓的东西都承载在记忆中，口口相传。"},
    "europe|classical": {t:"晚期罗马世界的农奴", d:"你在罗马乡间或从废墟中崛起的诸王国里，替他人耕种土地以换取收成的一份。教会标记着你节日与斋日的日历，瘟疫和战乱如天气般来去。"},
    "south_asia|latemed": {t:"莫卧儿平原的耕种者", d:"你在德里苏丹国或莫卧儿帝国治下种植棉花和水稻——这是世界上最富裕的经济体之一，尽管几乎没有财富能到达你的茅舍。税收官对你的田地欠多少了如指掌。"},
    "east_asia|latemed": {t:"明朝中国的农民", d:"你在世界上人口最多的国度里灌水种植梯田水稻。你的村庄保留着自己的记录和祠堂，科举决定谁来统治，而那庞大而有序的国家感觉距离你的田地无比遥远。"},
    "sea|neolithic": {t:"热带的水稻种植者", d:"你在东南亚的河流三角洲和岛屿上开垦和引水种稻，周围是茂密的森林和温暖的海域。贸易货物和新的神灵乘船而至；日常生活就是稻田、季风和村庄。"},
    "ssa|paleo": {t:"人类摇篮中的采猎者", d:"你出生在非洲，我们物种起源的地方，比农业早了数万年。你生活在一个小规模的游牧群体中，对方圆数英里的每一种植物、动物和水源都了如指掌。没有文字，没有余粮，能否活到成年也毫无把握。"}
  };
  function lifeTitle(rid,eid){ const v=VIGNETTE[rid+"|"+eid]; return v? v.t : role(rid,eid); }
  function lifeText(rid,eid){ const v=VIGNETTE[rid+"|"+eid]; return v? v.d : conditionClause(eid); }

  /* ---------- HERO count-up ---------- */
  function countUp(){
    const el = $("#counter");
    const target = Math.round(M.TOTAL_BIRTHS * 1e9); // 117,020,000,000
    el.textContent = fmt(target);                    // guaranteed final value
    if (document.hidden) return;                     // skip anim on hidden tab
    const dur = 2100, t0 = performance.now();
    function tick(now){
      const p = Math.min(1,(now-t0)/dur);
      const e = 1 - Math.pow(2,-10*p); // easeOutExpo
      el.textContent = fmt(target * e);
      if (p<1) requestAnimationFrame(tick); else el.textContent = fmt(target);
    }
    el.textContent = "0";
    requestAnimationFrame(tick);
  }

  /* ---------- era strip ---------- */
  function renderEras(){
    const strip = $("#eraStrip");
    const max = Math.max(...M.ERAS.map(e=>e.births));
    strip.innerHTML = M.ERAS.map(e=>{
      const w = (e.births/max*100).toFixed(1);
      return `<div class="erarow ${RECENT.has(e.id)?'recent':''}">
        <div class="lab">${e.label}<small>${e.span}</small></div>
        <div class="erabar"><i data-w="${w}"></i></div>
        <div class="val">${e.births.toFixed(1)}B · ${pct(e.births).toFixed(0)}%</div>
      </div>`;
    }).join("");
  }

  /* ---------- interactive world map ---------- */
  // representative label points (lon,lat) per macro-region for the floating % labels
  const RLAB_LL = {
    americas:[-74,9], europe:[18,49], central:[68,47], mena:[34,26], ssa:[22,-3],
    south_asia:[79,23], east_asia:[107,37], sea:[114,2], oceania:[134,-25]
  };
  const SHORT = {}; M.REGIONS.forEach(r=>SHORT[r.id]=r.short);
  const SEL = {id:null, series:null, X:null, Y:null};   // locked-region trajectory state
  const SPK = {W:600, H:84, pad:9};                      // sparkline geometry

  // color ramp (0 → 0.37 share), warm ember→gold
  function hex2rgb(h){h=h.replace("#","");return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
  const RAMP=[[0,"#241b12"],[0.08,"#5c2e1c"],[0.16,"#8f3320"],[0.25,"#cf5b3c"],[0.37,"#ecb24c"]];
  function ramp(t){
    t=Math.max(0,Math.min(0.37,t));
    for(let i=1;i<RAMP.length;i++){ if(t<=RAMP[i][0]){
      const s0=RAMP[i-1][0],s1=RAMP[i][0],f=(t-s0)/(s1-s0||1),a=hex2rgb(RAMP[i-1][1]),b=hex2rgb(RAMP[i][1]);
      return `rgb(${a.map((v,k)=>Math.round(v+(b[k]-v)*f)).join(",")})`; } }
    return RAMP[RAMP.length-1][1];
  }
  function eraShares(idx, mode){
    const res={};
    if(mode==="cum"){
      const acc={}; let tot=0; M.REGIONS.forEach(r=>acc[r.id]=0);
      for(let e=0;e<=idx;e++){ const era=M.ERAS[e],row=M.SHARES[era.id],s=row.reduce((a,b)=>a+b,0);
        M.REGIONS.forEach((r,i)=>acc[r.id]+=era.births*(row[i]/s)); tot+=era.births; }
      M.REGIONS.forEach(r=>res[r.id]={share:acc[r.id]/tot, births:acc[r.id]});
    } else {
      const era=M.ERAS[idx],row=M.SHARES[era.id],s=row.reduce((a,b)=>a+b,0);
      M.REGIONS.forEach((r,i)=>res[r.id]={share:row[i]/s, births:era.births*(row[i]/s)});
    }
    return res;
  }
  let CUR={idx:0,mode:"era",sh:{}}, playTimer=null, MODE="era";

  async function initMap(){
    const svg=$("#worldmap");
    let world;
    try{ world=await fetch("vendor/countries-110m.json").then(r=>r.json()); }
    catch(e){ svg.innerHTML='<text x="500" y="250" fill="#7d735c" text-anchor="middle" font-family="IBM Plex Mono" font-size="16">世界地图加载失败</text>'; bindMap(); updateMapReadoutOnly(0,MODE); return; }
    const W=1000,H=500, proj=d3.geoNaturalEarth1(), pathGen=d3.geoPath(proj);
    const feats=topojson.feature(world,world.objects.countries).features.filter(f=>f.id!=="010"); // drop Antarctica
    proj.fitSize([W,H],{type:"FeatureCollection",features:feats});
    let g=`<path class="grat" d="${pathGen(d3.geoGraticule10())}"/>`;
    // disputed/partially-recognized territories that lack standard ISO codes in the geometry
    const NAME_OVERRIDE={"Taiwan":"east_asia","Kosovo":"europe","N. Cyprus":"europe","Somaliland":"ssa"};
    // map-only override: show Russia's vast steppe & Siberia with the Eurasian steppe zone
    // (purely cosmetic — no computed statistic uses this country→region lookup)
    const CODE_OVERRIDE={"643":"central"};
    // countries whose territory spans regions (e.g. France incl. French Guiana): split per polygon
    const SPLIT=new Set(["250"]);
    feats.forEach(f=>{
      const nm=((f.properties&&f.properties.name)||"").replace(/"/g,"&quot;");
      const base=CODE_OVERRIDE[String(+f.id)]||window.REGION_OF[String(+f.id)]||NAME_OVERRIDE[nm]||"";
      if(SPLIT.has(String(+f.id)) && f.geometry && f.geometry.type==="MultiPolygon"){
        f.geometry.coordinates.forEach(coords=>{
          const poly={type:"Feature",properties:f.properties,geometry:{type:"Polygon",coordinates:coords}};
          const d=pathGen(poly); if(!d) return;
          const cen=d3.geoCentroid(poly);            // [lon,lat]
          const reg=(cen[0]<-30)?"americas":base;    // Americas-side polygons (e.g. French Guiana) → Americas
          g+=`<path class="country${reg?'':' nodata'}" data-region="${reg}" data-name="${nm}" d="${d}"/>`;
        });
      } else {
        const d=pathGen(f); if(!d) return;
        g+=`<path class="country${base?'':' nodata'}" data-region="${base}" data-name="${nm}" d="${d}"/>`;
      }
    });
    M.REGIONS.forEach(r=>{ const ll=RLAB_LL[r.id]; if(!ll) return; const p=proj(ll); if(!p) return;
      g+=`<text class="rlab" x="${p[0].toFixed(0)}" y="${p[1].toFixed(0)}">${SHORT[r.id].toUpperCase()}</text>`;
      g+=`<text class="rpct" id="pct-${r.id}" x="${p[0].toFixed(0)}" y="${(p[1]+17).toFixed(0)}"></text>`; });
    svg.innerHTML=g;
    svg.querySelectorAll(".country").forEach(p=>{
      p.addEventListener("mousemove",e=>onHover(e,p));
      p.addEventListener("mouseleave",onLeave);
      p.addEventListener("click",()=>{ const r=p.dataset.region; if(r) setSelected(SEL.id===r?null:r); });
    });
    bindMap();
    updateMap(0,MODE);
  }

  function updateMapReadoutOnly(idx,mode){ const sh=eraShares(idx,mode); CUR={idx,mode,sh}; }

  function updateMap(idx,mode){
    const sh=eraShares(idx,mode); CUR={idx,mode,sh};
    document.querySelectorAll("#worldmap .country").forEach(c=>{ const reg=c.dataset.region; if(reg) c.style.fill=ramp(sh[reg].share); });
    M.REGIONS.forEach(r=>{ const pe=document.getElementById("pct-"+r.id); if(pe) pe.textContent=Math.round(sh[r.id].share*100)+"%"; });
    const era=M.ERAS[idx], tot=Object.values(sh).reduce((a,b)=>a+b.births,0);
    if(mode==="cum"){
      $("#trName").textContent="截至"+era.span.split(/[–-]/).pop().trim()+"的所有出生";
      $("#trSpan").textContent="";
      $("#trBirths").innerHTML=`<b>${tot.toFixed(1)}B</b> 人已出生 · 占所有曾经活过人类的${(tot/M.TOTAL_BIRTHS*100).toFixed(0)}%`;
    } else {
      $("#trName").textContent=era.label;
      $("#trSpan").textContent="· "+era.span;
      $("#trBirths").innerHTML=`<b>${era.births.toFixed(1)}B</b> 人本时代出生 · 占所有曾经活过人类的${pct(era.births).toFixed(0)}%`;
    }
    if(SEL.id) updateSparkCursor();
  }

  function onHover(e,p){
    const svg=$("#worldmap"), reg=p.dataset.region, rect=svg.getBoundingClientRect(), t=$("#maptip");
    if(reg){ svg.classList.add("hovering");
      svg.querySelectorAll(".country").forEach(c=>c.classList.toggle("hl",c.dataset.region===reg));
      const d=CUR.sh[reg], r=M.REGIONS.find(x=>x.id===reg);
      t.innerHTML=`<b>${p.dataset.name||r.label}</b><br><span style="color:var(--bone-dim)">${r.label}</span><br>${(d.share*100).toFixed(1)}% ${CUR.mode==="cum"?"占至今所有出生":"占本时代出生"}<br><span class="mono" style="color:var(--gold)">${d.births.toFixed(2)} 十亿人</span><br><span style="color:var(--bone-faint);font-size:11px">点击查看其历史 →</span>`;
    } else {
      t.innerHTML=`<b>${p.dataset.name||"—"}</b><br><span style="color:var(--bone-faint)">不在建模区域范围内</span>`;
    }
    t.hidden=false;
    let x=e.clientX-rect.left+15, y=e.clientY-rect.top+15;
    if(x>rect.width-180) x=e.clientX-rect.left-185;
    t.style.left=x+"px"; t.style.top=y+"px";
  }
  function onLeave(){ const svg=$("#worldmap"); svg.classList.remove("hovering");
    svg.querySelectorAll(".country.hl").forEach(c=>c.classList.remove("hl")); $("#maptip").hidden=true; }

  function setSelected(reg){
    SEL.id=reg;
    document.querySelectorAll("#worldmap .country").forEach(c=>c.classList.toggle("sel",!!reg&&c.dataset.region===reg));
    renderTrajectory(reg);
  }
  function renderTrajectory(reg){
    const el=$("#trajectory");
    if(!reg){ el.classList.remove("show"); el.innerHTML=""; SEL.series=null; return; }
    const ri=M.REGIONS.findIndex(x=>x.id===reg), r=M.REGIONS[ri];
    const series=M.ERAS.map(era=>{ const row=M.SHARES[era.id],s=row.reduce((a,b)=>a+b,0); return row[ri]/s; });
    const max=Math.max(0.05,...series);
    const {W,H,pad}=SPK, X=i=>pad+i*(W-2*pad)/11, Y=v=>H-pad-(v/max)*(H-2*pad);
    SEL.series=series; SEL.X=X; SEL.Y=Y;
    const line=series.map((v,i)=>`${i?'L':'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join("");
    const area=`M${X(0)},${H-pad}`+series.map((v,i)=>`L${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join("")+`L${X(11)},${H-pad}Z`;
    const peakEra=M.ERAS[series.indexOf(Math.max(...series))];
    el.innerHTML=`<div class="traj-head"><b>${r.label}</b> — 各时代出生占比 <span class="traj-close">✕ 关闭</span></div>
      <svg viewBox="0 0 ${W} ${H}" class="spark"><path class="spark-area" d="${area}"/><path class="spark-line" d="${line}"/>
      ${series.map((v,i)=>`<circle cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="2.6" class="spark-dot"/>`).join("")}
      <circle id="spark-cursor" r="5" class="spark-cursor"/></svg>
      <div class="traj-scale"><span>峰值 ${(max*100).toFixed(0)}% · ${peakEra.span}</span><span>公元前19万年&nbsp;&nbsp;→&nbsp;&nbsp;今天</span></div>`;
    el.classList.add("show");
    $(".traj-close",el).addEventListener("click",()=>setSelected(null));
    updateSparkCursor();
  }
  function updateSparkCursor(){ const cur=document.getElementById("spark-cursor"); if(!cur||!SEL.series) return;
    cur.setAttribute("cx",SEL.X(CUR.idx)); cur.setAttribute("cy",SEL.Y(SEL.series[CUR.idx])); }

  function bindMap(){
    const slider=$("#eraSlider");
    slider.addEventListener("input",()=>updateMap(+slider.value,MODE));
    $("#modeToggle").addEventListener("click",e=>{ const b=e.target.closest("button"); if(!b) return;
      $("#modeToggle").querySelectorAll("button").forEach(x=>x.classList.toggle("on",x===b));
      MODE=b.dataset.mode; updateMap(+slider.value,MODE); });
    $("#playBtn").addEventListener("click",()=>{
      if(playTimer){ clearInterval(playTimer); playTimer=null; $("#playBtn").innerHTML="▶ &nbsp;播放时间线"; return; }
      $("#playBtn").innerHTML="❚❚ &nbsp;暂停";
      playTimer=setInterval(()=>{ const v=(+$("#eraSlider").value+1)%12; $("#eraSlider").value=v; updateMap(v,MODE); },1150);
    });
  }

  /* ---------- region ranking (with Monte Carlo CI) ---------- */
  let RANKED = [];
  function renderRanking(){
    const central = M.centralEstimate();
    const mc = M.monteCarlo(4000);
    RANKED = M.REGIONS.map(r=>({
      id:r.id, label:r.label, short:r.short,
      bn: central[r.id], p05: mc[r.id].p05, p95: mc[r.id].p95
    })).sort((a,b)=>b.bn-a.bn);

    const maxPct = pct(RANKED[0].bn)*1.08;
    const cont = $("#ranking");
    cont.innerHTML = RANKED.map((r,i)=>{
      const cp = pct(r.bn), lo = pct(r.p05), hi = pct(r.p95);
      const wMain=(cp/maxPct*100), wLo=(lo/maxPct*100), wHi=(hi/maxPct*100);
      return `<div class="rank ${i<2?'top':''}">
        <div class="pos mono">${String(i+1).padStart(2,'0')}</div>
        <div class="body">
          <div class="head">
            <div class="name">${r.label}<small>${r.short}</small></div>
            <div class="pct"><span class="num" data-bn="${r.bn.toFixed(2)}B" data-pct="${cp.toFixed(1)}%">${cp.toFixed(1)}%</span>
              <span class="ci">&nbsp;[${lo.toFixed(1)}–${hi.toFixed(1)}%]</span></div>
          </div>
          <div class="track">
            <span class="ci-band" style="left:${wLo}%;width:${Math.max(0,wHi-wLo)}%"></span>
            <span class="fill" data-w="${wMain.toFixed(1)}"></span>
            <span class="whisk" style="left:${wLo}%"></span>
            <span class="whisk" style="left:${wHi}%"></span>
          </div>
        </div>
      </div>`;
    }).join("");
  }
  function bindToggle(){
    $("#unitToggle").addEventListener("click", e=>{
      const btn = e.target.closest("button"); if(!btn) return;
      $("#unitToggle").querySelectorAll("button").forEach(b=>b.classList.toggle("on",b===btn));
      const unit = btn.dataset.unit;
      document.querySelectorAll("#ranking .num").forEach(n=>{
        n.textContent = unit==="pct" ? n.dataset.pct : n.dataset.bn;
      });
    });
  }

  /* ---------- top-10 lives (era × region cells) ---------- */
  function renderLives(){
    const cells=[];
    M.ERAS.forEach(era=>{
      const row=M.SHARES[era.id]; const sum=row.reduce((a,b)=>a+b,0);
      M.REGIONS.forEach((r,i)=>cells.push({eid:era.id,rid:r.id,era,region:r,bn:era.births*(row[i]/sum)}));
    });
    cells.sort((a,b)=>b.bn-a.bn);
    $("#livesGrid").innerHTML = cells.slice(0,10).map((c,i)=>`
      <div class="life" data-n="${i+1}">
        <div class="pct">${pct(c.bn).toFixed(1)}% 占所有曾经活过人类的 &nbsp;·&nbsp; ${c.bn.toFixed(1)} 十亿条生命</div>
        <h3 class="display">${lifeTitle(c.rid,c.eid)}</h3>
        <div class="when">${c.region.short} &nbsp;·&nbsp; ${c.era.span}</div>
        <p>${lifeText(c.rid,c.eid)}</p>
      </div>`).join("");
  }

  /* ---------- "if all 117 billion were 100 people" ---------- */
  function genPalette(stops,n){
    const segs=stops.length-1,out=[];
    for(let i=0;i<n;i++){ const t=n===1?0:i/(n-1),x=t*segs,k=Math.min(segs-1,Math.floor(x)),f=x-k;
      const a=hex2rgb(stops[k]),b=hex2rgb(stops[k+1]);
      out.push("#"+a.map((v,j)=>Math.round(v+(b[j]-v)*f).toString(16).padStart(2,"0")).join("")); }
    return out;
  }
  const ERA_COLORS = genPalette(["#241510","#7a361b","#cf5b3c","#e6bd5e","#f1dda6"], 12);
  const REGION_COLORS = { south_asia:"#d2603a", east_asia:"#e6c25c", europe:"#c2c7ad", ssa:"#9a4e28",
                          mena:"#e09a4a", sea:"#8fa886", americas:"#cf9a78", central:"#8c91a0", oceania:"#6f93a0" };
  const PERSON='<svg viewBox="0 0 20 30"><circle cx="10" cy="6" r="5"/><path d="M2 30 C2 19 6 14 10 14 C14 14 18 19 18 30 Z"/></svg>';
  function allocate100(weights){
    const tot=weights.reduce((a,b)=>a+b,0), raw=weights.map(w=>w/tot*100), floor=raw.map(Math.floor);
    let rem=100-floor.reduce((a,b)=>a+b,0);
    const order=raw.map((x,i)=>[x-Math.floor(x),i]).sort((a,b)=>b[0]-a[0]);
    for(let k=0;k<rem;k++) floor[order[k%order.length][1]]++;
    return floor;
  }
  let HUNDRED_GROUPS=[];
  function renderHundred(by){
    let groups;
    if(by==="region"){
      const c=M.centralEstimate();
      const arr=M.REGIONS.map(r=>({key:r.id,label:r.label,short:r.short,color:REGION_COLORS[r.id],w:c[r.id]}));
      const counts=allocate100(arr.map(x=>x.w));
      groups=arr.map((x,i)=>({...x,count:counts[i]})).filter(g=>g.count>0).sort((a,b)=>b.count-a.count);
    } else {
      const arr=M.ERAS.map((e,i)=>({key:e.id,label:e.label+" · "+e.span,short:e.label,color:ERA_COLORS[i],w:e.births}));
      const counts=allocate100(arr.map(x=>x.w));
      groups=arr.map((x,i)=>({...x,count:counts[i]})).filter(g=>g.count>0);
    }
    HUNDRED_GROUPS=groups;
    $("#figures").innerHTML=groups.map((g,gi)=>Array(g.count).fill(0).map(()=>
      `<span class="figure" data-g="${gi}" style="color:${g.color}">${PERSON}</span>`).join("")).join("");
    $("#hundredLegend").innerHTML=groups.map((g,gi)=>
      `<span class="leg" data-g="${gi}"><i style="background:${g.color}"></i>${g.short} <b>${g.count}</b></span>`).join("");
    $("#hundredCap").innerHTML="每个小人 ≈ 11.7亿人。悬停探索。";
  }
  function focusGroup(gi){
    const fg=$("#figures"); if(gi==null){ fg.classList.remove("focusing");
      fg.querySelectorAll(".figure.on").forEach(x=>x.classList.remove("on"));
      $("#hundredCap").innerHTML="每个小人 ≈ 11.7亿人。悬停探索。"; return; }
    const g=HUNDRED_GROUPS[gi]; fg.classList.add("focusing");
    fg.querySelectorAll(".figure").forEach(x=>x.classList.toggle("on",+x.dataset.g===gi));
    $("#hundredCap").innerHTML=`<b style="color:${g.color}">${g.count} / 100</b> &nbsp;·&nbsp; 出生于${g.label}`;
  }
  function bindHundred(){
    $("#hundredToggle").addEventListener("click",e=>{ const b=e.target.closest("button"); if(!b) return;
      $("#hundredToggle").querySelectorAll("button").forEach(x=>x.classList.toggle("on",x===b));
      renderHundred(b.dataset.by); });
    $("#figures").addEventListener("mouseover",e=>{ const f=e.target.closest(".figure"); if(f) focusGroup(+f.dataset.g); });
    $("#figures").addEventListener("mouseleave",()=>focusGroup(null));
    $("#hundredLegend").addEventListener("mouseover",e=>{ const l=e.target.closest(".leg"); if(l) focusGroup(+l.dataset.g); });
    $("#hundredLegend").addEventListener("mouseleave",()=>focusGroup(null));
  }

  /* ---------- birth-weighted conditions ---------- */
  function renderConditions(){
    let pov=0, cd=0, lit=0, tot=0;
    M.ERAS.forEach(e=>{ const c=M.CONDITION[e.id];
      pov+=e.births*c.poverty; cd+=e.births*c.childDeath; lit+=e.births*c.literate; tot+=e.births; });
    $("#c-pov").innerHTML   = Math.round(pov/tot*100)+'<span class="pc">%</span>';
    $("#c-death").innerHTML = Math.round(cd/tot*100)+'<span class="pc">%</span>';
    $("#c-illit").innerHTML = Math.round((1-lit/tot)*100)+'<span class="pc">%</span>';
  }

  /* ---------- modern comforts ---------- */
  function renderComfort(){
    const m=M.modernLifeShare();
    $("#ch-modern").textContent=Math.round(m*100)+"%";
    $("#ch-rest").textContent=`大约${Math.round((1-m)*20)}/20 的人从未享受过。`;
    const amen=[
      {label:"从小有电", p:M.birthWeighted(M.AMENITY.electricity), note:"几乎在1880年代之前，没有人家里有电——甚至到了1950年，世界上大部分地方依然没有。"},
      {label:"拥有现代卫生设施",    p:M.birthWeighted(M.AMENITY.sanitation),  note:"下水道、冲水马桶和经过处理的自来水，几乎是20世纪的遗产。"},
      {label:"生活在城市",          p:M.birthWeighted(M.AMENITY.urban),       note:"1900年之前不到六分之一的人是城市居民；在历史的大部分时间里不到十分之一。其余的人在土地上劳作。"}
    ];
    $("#amenityGrid").innerHTML=amen.map(a=>{
      const pc=Math.round(a.p*100), oneIn=Math.round(1/a.p);
      return `<div class="cbox"><div class="num">${pc}<span class="pc">%</span></div><h3>${a.label}</h3><p><b>大约每${oneIn}人中有一人。</b> ${a.note}</p></div>`;
    }).join("");
  }
  /* ---------- remarkable roles ---------- */
  function renderRoles(){
    $("#rolesList").innerHTML=M.ROLES.map(r=>{
      const oneIn=Math.round(1/r.odds);
      const main = r.odds>0.5 ? Math.round(r.odds*100)+"%" : "每"+(oneIn>=1000?oneIn.toLocaleString():oneIn)+"人中1人";
      const sub  = r.odds>0.5 ? "普遍命运"
                 : (r.odds*100>=0.1 ? (r.odds*100>=1?Math.round(r.odds*100):(r.odds*100).toFixed(1))+"%" : "比万分之一还稀少");
      const barW = Math.min(100, Math.max(1.5, r.odds*100));
      return `<div class="role">
        <div class="role-main">
          <div class="role-name">${r.label}${r.approx?'<span class="approx">估计值</span>':''}</div>
          <div class="role-bar"><i style="width:${barW}%"></i></div>
        </div>
        <div class="role-odds"><span class="oin">${main}</span><span class="opc">${sub}</span></div>
        <div class="role-note">${r.note}</div>
      </div>`;
    }).join("");
  }

  /* ---------- methodology matrix ---------- */
  function renderMatrix(){
    const t=$("#matrix");
    const head = `<thead><tr><th>时代</th>${M.REGIONS.map(r=>`<th>${r.short}</th>`).join("")}</tr></thead>`;
    const body = `<tbody>${M.ERAS.map(e=>{
      const row=M.SHARES[e.id];
      return `<tr><td>${e.span}</td>${row.map(v=>`<td class="${v>=15?'heat':''}">${v}</td>`).join("")}</tr>`;
    }).join("")}</tbody>`;
    t.innerHTML = head+body;
  }

  /* ---------- the draw ---------- */
  function gauss(){let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();
    return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
  function weightedPick(items, weight){
    const tot=items.reduce((s,x)=>s+weight(x),0); let r=Math.random()*tot;
    for(const it of items){ r-=weight(it); if(r<=0) return it; } return items[items.length-1];
  }
  function yearLabel(eid){
    const [a,b]=YEARS[eid]; let y=Math.round(a+Math.random()*(b-a));
    if(y<0){ const v=Math.abs(y); const r=v>10000?Math.round(v/1000)*1000:Math.round(v/100)*100; return `约 ${fmt(r)} 公元前`; }
    return `约 ${y} 公元`;
  }
  // mutually-exclusive social station for the ticket (illustrative)
  function station(eraId){
    if(RECENT.has(eraId)){ const r=Math.random();
      return r<0.015?"士兵": r<0.05?"有产者": "工人或平民"; }
    const r=Math.random();
    if(r<0.012) return "贵族";
    if(r<0.037) return "神职人员/僧侣";
    if(r<0.050) return "全职战士";
    if(r<0.130) return "奴隶";
    if(r<0.210) return "城镇居民或工匠";
    return "农民";
  }
  let drawn=0, lucky=0;
  function draw(){
    drawn++;
    // 1) era weighted by births
    const era = weightedPick(M.ERAS, e=>e.births);
    // 2) region weighted by era share
    const row = M.SHARES[era.id];
    const reg = weightedPick(M.REGIONS.map((r,i)=>({r,w:row[i]})), x=>x.w).r;
    const c = M.CONDITION[era.id];
    const sex = Math.random()<0.5 ? "女孩" : "男孩";
    const poor = Math.random()<c.poverty;
    const diedYoung = Math.random()<c.childDeath;
    const literate = !diedYoung && Math.random()<c.literate;
    let age, fate;
    if(diedYoung){
      age = Math.max(0,Math.round(Math.random()*Math.random()*14));
      fate = age<1 ? "未能活过生命的第一年。" : `在童年夭折，年仅${age}岁。`;
    } else {
      const mean = Math.max(48, c.le+24);
      age = Math.min(98, Math.max(16, Math.round(mean + gauss()*13)));
      fate = `活到约${age}岁。`;
      if(era.id==="contemp2"||era.id==="contemp1") lucky += poor?0:1;
    }
    if(!diedYoung && !RECENT.has(era.id)) {} // no-op

    const stn = station(era.id);
    const elec = Math.random() < (M.AMENITY.electricity[era.id]||0);
    const san  = Math.random() < (M.AMENITY.sanitation[era.id]||0);
    const comforts = elec && san ? "电力与自来水" : elec ? "有电，无自来水"
                   : san ? "有自来水，无电" : "既无电也无自来水";

    const yr = yearLabel(era.id);
    const t = $("#ticket"); t.classList.remove("empty");
    const lot = String(Math.floor(Math.random()*900000+100000));
    t.innerHTML = `
      <div class="stub"><span>签号 ${lot}</span><span>${yr}</span></div>
      <div class="verdict">一个${sex}，<span class="em">${role(reg.id,era.id)}</span>。</div>
      <div class="meta">
        <div><span>时代</span><span>${era.label}</span></div>
        <div><span>地区</span><span>${reg.label}</span></div>
        <div><span>社会地位</span><span>${stn}</span></div>
        <div><span>生活水平</span><span>${poor?"极端贫困":"温饱以上"}</span></div>
        <div><span>识字</span><span>${literate?"识字":"文盲"}</span></div>
        <div><span>现代设施</span><span>${comforts}</span></div>
        <div><span>寿命</span><span>${diedYoung?("年仅"+age):("约"+age+"岁")}</span></div>
      </div>
      <div class="fate">${fate}</div>`;

    const luckyPct = drawn? (lucky/drawn*100):0;
    $("#tally").innerHTML = `<b>${drawn}</b> 次抽取 &nbsp;·&nbsp; 只有 <b>${lucky}</b> 次（${luckyPct.toFixed(0)}%）抽中了贫困线以上的现代生活。`;
  }

  /* ---------- reveal + bar animation ---------- */
  function observe(){
    const io = new IntersectionObserver((ents)=>{
      ents.forEach(en=>{
        if(!en.isIntersecting) return;
        en.target.classList.add("in");
        en.target.querySelectorAll("[data-w]").forEach(b=>{ b.style.width = b.dataset.w+"%"; });
        // lives stagger
        if(en.target.id==="livesGrid"){
          [...en.target.children].forEach((ch,i)=>ch.style.animationDelay=(i*0.06)+"s");
        }
        io.unobserve(en.target);
      });
    },{threshold:0.12});
    document.querySelectorAll(".reveal, #eraStrip, #ranking, #livesGrid").forEach(el=>io.observe(el));
    // lives cards get .in via container observe -> add class to children
    const livesIO = new IntersectionObserver((ents)=>{
      ents.forEach(en=>{ if(en.isIntersecting){ en.target.classList.add("in"); livesIO.unobserve(en.target);} });
    },{threshold:0.1});
    setTimeout(()=>document.querySelectorAll(".life").forEach((el,i)=>{el.style.animationDelay=(i%2*0.06+Math.floor(i/2)*0.05)+"s";livesIO.observe(el);}),0);
  }

  /* ---------- boot ---------- */
  document.addEventListener("DOMContentLoaded", ()=>{
    countUp();
    renderEras();
    renderHundred("era");
    bindHundred();
    initMap();
    renderRanking();
    bindToggle();
    renderLives();
    renderConditions();
    renderComfort();
    renderRoles();
    renderMatrix();
    $("#drawBtn").addEventListener("click", draw);
    observe();
  });
})();
