/* =============================================================================
   THE VEIL OF HISTORY — a rigorous birth-lottery model
   -----------------------------------------------------------------------------
   Core idea: a random draw across *every human ever born* is a draw weighted by
   the NUMBER OF BIRTHS in each era, then split across regions by that era's
   share of the living population (a stated proxy for its share of births).

   births_in(region) = Σ_era [ births_in_era × region_share_in_era ]

   Sources:
   - Births per era: Population Reference Bureau, "How Many People Have Ever
     Lived on Earth?" (2022), Table 1. Total ≈ 117.0 billion.
   - Regional population shares per era: synthesized from Maddison Project,
     McEvedy & Jones "Atlas of World Population History", HYDE 3.x, and UN WPP.
     Ancient shares carry wide uncertainty, encoded as per-era sigma below.
  This file is shared verbatim by the website and the Node sanity-check.
============================================================================= */
(function (root) {
  "use strict";

  // ---- ERAS: births in billions (PRB Table 1, "births between benchmarks") ----
  const ERAS = [
    { id: "paleo",     label: "旧石器时代采猎者",        span: "190,000–50,000 BCE", births: 7.86, sigma: 0.45 },
    { id: "mesolithic",label: "新石器时代晚期采猎者",     span: "50,000–8,000 BCE",   births: 1.14, sigma: 0.40 },
    { id: "neolithic", label: "新石器与古代农耕文明",span: "8,000 BCE – 1 CE",   births: 46.03, sigma: 0.22 },
    { id: "classical", label: "古典时代与中世纪早期",  span: "1 – 1200 CE",        births: 26.59, sigma: 0.15 },
    { id: "latemed",   label: "中世纪晚期与近代早期",span: "1200 – 1650",        births: 12.78, sigma: 0.12 },
    { id: "earlymod",  label: "近代",                span: "1650 – 1750",        births: 3.17, sigma: 0.10 },
    { id: "indust",    label: "工业化世界",       span: "1750 – 1850",        births: 4.05, sigma: 0.09 },
    { id: "imperial",  label: "帝国主义时代",                span: "1850 – 1900",        births: 2.90, sigma: 0.07 },
    { id: "modern1",   label: "20世纪早期",          span: "1900 – 1950",        births: 3.39, sigma: 0.05 },
    { id: "modern2",   label: "战后婴儿潮",               span: "1950 – 2000",        births: 6.06, sigma: 0.04 },
    { id: "contemp1",  label: "千禧年之交",          span: "2000 – 2010",        births: 1.36, sigma: 0.03 },
    { id: "contemp2",  label: "当代",                       span: "2010 – 2022",        births: 1.69, sigma: 0.03 },
  ];

  // ---- REGIONS ----
  const REGIONS = [
    { id: "south_asia", label: "印度次大陆",        short: "南亚" },
    { id: "east_asia",  label: "中国与东亚",          short: "东亚" },
    { id: "europe",     label: "欧洲与俄罗斯欧洲部分",   short: "欧洲" },
    { id: "ssa",        label: "撒哈拉以南非洲",         short: "撒哈拉以南非洲" },
    { id: "mena",       label: "中东与北非", short: "中东北非" },
    { id: "sea",        label: "东南亚",             short: "东南亚" },
    { id: "americas",   label: "美洲",               short: "美洲" },
    { id: "central",    label: "中亚与欧亚大草原", short: "中亚" },
    { id: "oceania",    label: "大洋洲与太平洋",      short: "大洋洲" },
  ];

  // ---- SHARE MATRIX: era × region (central estimates, %). Each row sums ~100 ----
  // Columns order matches REGIONS above.
  // [south_asia, east_asia, europe, ssa, mena, sea, americas, central, oceania]
  const SHARES = {
    paleo:      [12, 12, 10, 35, 12, 10, 3, 4, 2],
    mesolithic: [13, 13, 10, 30, 13, 11, 4, 4, 2],
    neolithic:  [28, 26, 12, 9, 14, 6, 2, 2.5, 0.5],
    classical:  [28, 27, 14, 9, 10, 6, 3, 2.5, 0.5],
    latemed:    [26, 26, 16, 10, 8, 7, 4.5, 2, 0.5],
    earlymod:   [25, 28, 17, 10, 7, 7, 3.5, 2, 0.5],
    indust:     [22, 35, 18, 8, 5, 6, 4, 1.5, 0.5],
    imperial:   [20, 28, 22, 8, 4.5, 6, 9, 1.5, 1],
    modern1:    [20, 25, 22, 8, 4, 7, 13, 0.5, 0.5],
    modern2:    [21, 24, 12, 13, 6, 9, 13, 1.5, 0.5],
    contemp1:   [23, 15, 9, 19, 9, 9, 13, 2.5, 0.5],
    contemp2:   [23, 13, 8, 21, 9, 9, 14, 1.5, 0.5],
  };

  // ---- SOCIOECONOMIC CONDITION by era (for the "draw a life" generator) ----
  // p_extreme_poverty, p_child_death_before_15, p_literate (adult), life expectancy at birth
  const CONDITION = {
    paleo:      { poverty: 0.99, childDeath: 0.49, literate: 0.00, le: 30 },
    mesolithic: { poverty: 0.99, childDeath: 0.49, literate: 0.00, le: 30 },
    neolithic:  { poverty: 0.97, childDeath: 0.50, literate: 0.02, le: 27 },
    classical:  { poverty: 0.95, childDeath: 0.49, literate: 0.05, le: 28 },
    latemed:    { poverty: 0.92, childDeath: 0.48, literate: 0.08, le: 29 },
    earlymod:   { poverty: 0.88, childDeath: 0.47, literate: 0.12, le: 31 },
    indust:     { poverty: 0.82, childDeath: 0.43, literate: 0.17, le: 32 },
    imperial:   { poverty: 0.74, childDeath: 0.38, literate: 0.24, le: 33 },
    modern1:    { poverty: 0.62, childDeath: 0.28, literate: 0.40, le: 45 },
    modern2:    { poverty: 0.38, childDeath: 0.13, literate: 0.62, le: 58 },
    contemp1:   { poverty: 0.16, childDeath: 0.06, literate: 0.82, le: 67 },
    contemp2:   { poverty: 0.09, childDeath: 0.04, literate: 0.87, le: 71 },
  };

  // ---- AMENITIES: P(grew up with X) by era. Modern comforts barely existed pre-1900 ----
  // electricity ≈ 0 before ~1880 (World Bank/OWID); improved sanitation likewise modern;
  // urban share from OWID urbanization (<5% before 1000, ~8% in 1800, ~16% in 1900).
  const AMENITY = {
    electricity: { paleo:0, mesolithic:0, neolithic:0, classical:0, latemed:0, earlymod:0, indust:0,    imperial:0.01, modern1:0.15, modern2:0.50, contemp1:0.78, contemp2:0.88 },
    sanitation:  { paleo:0, mesolithic:0, neolithic:0, classical:0, latemed:0, earlymod:0, indust:0.01, imperial:0.05, modern1:0.15, modern2:0.42, contemp1:0.62, contemp2:0.75 },
    urban:       { paleo:0, mesolithic:0, neolithic:0.03, classical:0.07, latemed:0.09, earlymod:0.09, indust:0.10, imperial:0.15, modern1:0.25, modern2:0.40, contemp1:0.50, contemp2:0.55 }
  };

  // ---- ROLES: rough order-of-magnitude odds for a random human life (NOT from the core model) ----
  const ROLES = [
    { label:"农民、牧民或劳工",      odds:0.85,      note:"默认的人类生活——绝大多数人在土地上劳作，或为土地所有者服务。" },
    { label:"城市居民",                    odds:0.089,     note:"1900年之前只有约12%的人住在城市。城市生活在很大程度上是现代产物。" },
    { label:"奴隶",                odds:0.10,      note:"奴隶制曾广泛存在；某些社会（古罗马、古典世界、早期美洲）中10-30%的人是奴隶。", approx:true },
    { label:"神职人员、僧侣或祭司",       odds:0.03,      note:"在拥有有组织神职系统的社会中，大约占3-6%。", approx:true },
    { label:"贵族",             odds:0.015,     note:"通常占人口的1-3%——在波兰或卡斯蒂利亚可高达10%，在许多其他社会中接近零。", approx:true },
    { label:"全职战士或士兵",    odds:0.015,     note:"常备军事力量通常约占人口的1-2%。", approx:true },
    { label:"在位国王、女王或皇帝",odds:0.0000005, note:"整个有文字记载的历史中只有几千位君主，而总出生人数高达1170亿。", approx:true }
  ];

  const TOTAL_BIRTHS = ERAS.reduce((s, e) => s + e.births, 0); // ≈ 117.0 B

  // Birth-weighted average of a per-era probability map (e.g. AMENITY.electricity).
  function birthWeighted(map) {
    let num = 0, den = 0;
    ERAS.forEach(e => { num += e.births * (map[e.id] || 0); den += e.births; });
    return num / den;
  }
  // Share of all births that were BOTH post-1950 AND above extreme poverty — a "modern life".
  function modernLifeShare() {
    let num = 0;
    ["modern2","contemp1","contemp2"].forEach(id => {
      const e = ERAS.find(x => x.id === id);
      num += e.births * (1 - CONDITION[id].poverty);
    });
    return num / TOTAL_BIRTHS;
  }

  // ---------------------------------------------------------------------------
  // Central, deterministic estimate of cumulative births by region.
  // ---------------------------------------------------------------------------
  function centralEstimate() {
    const out = {};
    REGIONS.forEach(r => (out[r.id] = 0));
    ERAS.forEach(era => {
      const row = SHARES[era.id];
      const rowSum = row.reduce((a, b) => a + b, 0);
      REGIONS.forEach((r, i) => {
        out[r.id] += era.births * (row[i] / rowSum);
      });
    });
    return out; // billions per region
  }

  // ---------------------------------------------------------------------------
  // Monte Carlo: perturb each era's shares with multiplicative log-normal noise
  // (sigma grows for older, less certain eras), renormalize, accumulate.
  // Returns per-region {median, p05, p95, mean} in billions.
  // ---------------------------------------------------------------------------
  function gaussian() {
    // Box–Muller
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function monteCarlo(iters) {
    iters = iters || 4000;
    const samples = {};
    REGIONS.forEach(r => (samples[r.id] = new Float64Array(iters)));

    for (let k = 0; k < iters; k++) {
      const acc = {};
      REGIONS.forEach(r => (acc[r.id] = 0));
      ERAS.forEach(era => {
        const row = SHARES[era.id];
        // perturb
        const pert = row.map(s => s * Math.exp(era.sigma * gaussian()));
        const sum = pert.reduce((a, b) => a + b, 0);
        // also perturb the era birth total modestly (PRB methodological uncertainty)
        const birthNoise = era.births * Math.exp((era.sigma * 0.5) * gaussian());
        REGIONS.forEach((r, i) => {
          acc[r.id] += birthNoise * (pert[i] / sum);
        });
      });
      REGIONS.forEach(r => (samples[r.id][k] = acc[r.id]));
    }

    const stats = {};
    REGIONS.forEach(r => {
      const arr = Array.from(samples[r.id]).sort((a, b) => a - b);
      const q = p => arr[Math.min(arr.length - 1, Math.floor(p * arr.length))];
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
      stats[r.id] = { median: q(0.5), p05: q(0.05), p95: q(0.95), mean };
    });
    return stats;
  }

  const MODEL = { ERAS, REGIONS, SHARES, CONDITION, AMENITY, ROLES, TOTAL_BIRTHS,
                  centralEstimate, monteCarlo, birthWeighted, modernLifeShare };

  if (typeof module !== "undefined" && module.exports) module.exports = MODEL;
  root.VEIL_MODEL = MODEL;
})(typeof window !== "undefined" ? window : globalThis);
