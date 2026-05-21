/* ============================================
   YAHAVI FORGE — CAREER INTELLIGENCE REPORT ENGINE
   Premium recruiter-grade ATS analysis output
   Structured JSON · Linear-style render · PDF + HTML export
   ============================================ */

/* === LOCAL ALGORITHMIC ATS SCORE (JS port of forge.py) === */
const STOP_WORDS = new Set([
  'the','a','an','and','or','but','of','in','on','at','to','for','from','with','by','as','is','was','are','were',
  'be','been','being','have','has','had','do','does','did','will','would','shall','should','can','could','may',
  'might','must','this','that','these','those','it','its','i','you','he','she','we','they','them','their','our',
  'your','his','her','my','me','us','him','about','into','through','during','before','after','above','below','up',
  'down','out','off','over','under','again','further','then','once','here','there','when','where','why','how',
  'all','any','both','each','few','more','most','other','some','such','no','nor','not','only','own','same','so',
  'than','too','very','company','role','responsible','work','team','using','used','use','working'
]);

function tokenize(text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  const matches = lower.match(/[a-z][a-z0-9\+\#\.\-]{2,}/g) || [];
  return matches.filter(t => !STOP_WORDS.has(t) && t.length >= 3);
}

function ngrams(tokens, n) {
  const out = [];
  for (let i = 0; i <= tokens.length - n; i++) out.push(tokens.slice(i, i + n).join(' '));
  return out;
}

function extractKeywords(text, topK = 40) {
  const tokens = tokenize(text);
  const freq = {};
  for (const t of tokens) freq[t] = (freq[t] || 0) + 1;
  for (const bg of ngrams(tokens, 2)) {
    const parts = bg.split(' ');
    if (parts.every(p => p.length >= 4)) freq[bg] = (freq[bg] || 0) + 1.5;
  }
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, topK);
}

function computeLocalAtsScore(resumeText, jdText) {
  const resumeLower = resumeText.toLowerCase();
  const jdKeywords = extractKeywords(jdText, 40);
  const matched = jdKeywords.filter(([kw]) => resumeLower.includes(kw)).map(([k]) => k);
  const missing = jdKeywords.filter(([kw]) => !resumeLower.includes(kw)).map(([k]) => k);
  const kwScore = Math.min(50, Math.round(50 * matched.length / Math.max(1, jdKeywords.length)));

  const wordCount = resumeText.split(/\s+/).filter(Boolean).length;
  let lengthScore = 5;
  if (wordCount >= 350 && wordCount <= 900) lengthScore = 10;
  else if ((wordCount >= 250 && wordCount < 350) || (wordCount > 900 && wordCount <= 1100)) lengthScore = 7;
  else if (wordCount < 250) lengthScore = 3;

  const sections = {
    experience: ['experience', 'work history', 'employment', 'professional'],
    education: ['education', 'academic', 'university', 'college', 'degree'],
    skills: ['skills', 'technologies', 'competencies', 'expertise', 'tech stack'],
    summary: ['summary', 'about', 'profile', 'objective']
  };
  let sectionsFound = 0;
  for (const kws of Object.values(sections)) {
    if (kws.some(k => resumeLower.includes(k))) sectionsFound++;
  }
  const sectionScore = Math.round(15 * sectionsFound / 4);

  const actionVerbs = ['architected','built','shipped','engineered','designed','led','managed','drove','reduced',
    'increased','accelerated','automated','optimized','scaled','launched','delivered','created','developed',
    'implemented','integrated','migrated','owned','spearheaded','transformed','negotiated','mentored','achieved',
    'improved','boosted','streamlined','orchestrated','executed'];
  const verbHits = actionVerbs.filter(v => new RegExp('\\b' + v + '\\b').test(resumeLower)).length;
  const verbScore = Math.min(10, verbHits);

  const quantMatches = (resumeText.match(/\b\d+[%xKkMmBb]?\b/g) || []).length;
  const quantScore = Math.min(15, quantMatches);

  const total = kwScore + lengthScore + sectionScore + verbScore + quantScore;
  return {
    score: total,
    word_count: wordCount,
    matched_keywords: matched.slice(0, 20),
    missing_keywords: missing.slice(0, 25),
    verb_hits: verbHits,
    quant_hits: quantMatches,
    breakdown: {
      keyword_overlap: { score: kwScore, max: 50 },
      length_density: { score: lengthScore, max: 10 },
      section_completeness: { score: sectionScore, max: 15 },
      action_verbs: { score: verbScore, max: 10 },
      quantified_impact: { score: quantScore, max: 15 }
    }
  };
}

/* === JSON SCHEMA FOR AI === */
const REPORT_SCHEMA_HINT = `{
  "ats_score": { "score": <number 0-100>, "category": "Exceptional|Strong|Moderate|Weak|Critical", "confidence": "high|medium|low" },
  "six_second_impression": "<one or two sentences a recruiter would think in 6 seconds>",
  "identity": {
    "actual_role": "<the role this resume actually positions for>",
    "target_role": "<the role the JD targets>",
    "alignment": "<one paragraph on alignment, what is missing or strong>"
  },
  "skill_credibility": [
    { "skill": "<skill name>", "level": "Strong|Moderate|Weak", "evidence": "<short why>" }
  ],
  "keyword_gap": {
    "critical_missing": [<5-8 strings>],
    "recommended": [<5-8 strings>],
    "optional": [<3-6 strings>]
  },
  "risk_flags": [
    { "flag": "<short title>", "severity": "high|medium|low", "evidence": "<specific phrase or quote from resume>" }
  ],
  "technical_depth": {
    "tool_usage_score": <0-10>,
    "system_dev_score": <0-10>,
    "assessment": "<one paragraph distinguishing tool-using vs system-building>"
  },
  "achievement_impact": {
    "score": <0-10>,
    "metrics_present": <bool>,
    "scale_mentioned": <bool>,
    "automation_value": "high|medium|low|none",
    "leadership_shown": <bool>,
    "assessment": "<one sentence>"
  },
  "strength_summary": {
    "strengths": [<3-5 strings>],
    "weaknesses": [<3-5 strings>],
    "recruiter_perception": "<one or two-sentence narrative>",
    "hiring_probability": "Strong|High|Moderate|Low"
  },
  "top_fixes": [
    { "priority": <1-7>, "fix": "<actionable sentence>", "impact": "<short why this matters>" }
  ],
  "rewrites": {
    "headline": "<one polished line>",
    "summary": "<2-3 sentences>",
    "achievements": [<3-5 rewritten bullet sentences>],
    "skills_section": "<reordered, JD-aligned skills line>"
  },
  "interview_probability": {
    "level": "Strong|High|Moderate|Low",
    "reasoning": "<one or two sentences>"
  }
}`;

/* === LARGE INPUT HANDLING === */
const MAX_INPUT_CHARS = 18000; // safe limit across most free-tier providers
const MAX_SINGLE_KEY_CHARS = 9000; // when only 1 key available, be conservative

function estimateInputSize(resume, jd) {
  return (resume?.length || 0) + (jd?.length || 0);
}

function buildInputWarning(size, hasMultipleKeys) {
  if (size <= MAX_INPUT_CHARS) return null;
  if (!hasMultipleKeys) {
    return {
      level: 'critical',
      message: `One free API key cannot reliably process ${(size / 1000).toFixed(1)}KB of recruiter-grade analysis. Add a second free key (Gemini or OpenRouter) in <strong>▸ KEYS</strong> for distributed processing — or trim the resume/JD.`
    };
  }
  return {
    level: 'warn',
    message: `Large input detected (${(size / 1000).toFixed(1)}KB). Running on extended-context provider — this may take 15-30 seconds.`
  };
}

function truncateIntelligently(text, maxChars) {
  if (text.length <= maxChars) return text;
  // Keep the first 70% and last 20% — middle is usually less critical
  const head = Math.floor(maxChars * 0.7);
  const tail = Math.floor(maxChars * 0.2);
  return text.slice(0, head) + '\n\n[ ... middle section truncated for length ... ]\n\n' + text.slice(-tail);
}

/* === EXTRACT JSON FROM AI RESPONSE === */
function extractJson(raw) {
  if (!raw) throw new Error('Empty response from AI');
  let text = raw.trim();
  // Strip markdown fences
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  // Find the first { and last }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found in AI response');
  text = text.slice(start, end + 1);
  // Parse with one cleanup attempt for trailing commas
  try {
    return JSON.parse(text);
  } catch (e) {
    const cleaned = text.replace(/,(\s*[}\]])/g, '$1');
    return JSON.parse(cleaned);
  }
}

/* === MAIN REPORT FUNCTION === */
async function runReport() {
  const resume = ($('#ats-resume').value || '').trim();
  const jd = ($('#ats-jd').value || '').trim();
  const containerEl = $('#report-container');
  const btn = $('#ats-go');

  if (!resume || !jd) {
    toast('Need both resume AND job description', 'error');
    containerEl.innerHTML = `<div class="report-empty">▸ PASTE RESUME + JD ABOVE TO GENERATE REPORT</div>`;
    return;
  }

  const inputSize = estimateInputSize(resume, jd);
  const activeKeys = Object.keys(state.keys).filter(k => state.keys[k]).length;
  if (activeKeys === 0) {
    containerEl.innerHTML = renderNoKeysState();
    toast('Add at least one free API key in ▸ KEYS', 'error');
    return;
  }

  // Truncate intelligently if input too large for single-key setup
  let resumeForAi = resume;
  let jdForAi = jd;
  const truncWarn = inputSize > MAX_SINGLE_KEY_CHARS && activeKeys === 1;
  if (inputSize > MAX_INPUT_CHARS) {
    const each = Math.floor(MAX_INPUT_CHARS / 2);
    resumeForAi = truncateIntelligently(resume, each);
    jdForAi = truncateIntelligently(jd, each);
  }

  setBusy(btn, true);
  renderLoadingState(containerEl);

  // Compute local algorithmic score in parallel
  const localScore = computeLocalAtsScore(resume, jd);

  const sys = `You are Yahavi Forge — an elite AI hiring intelligence engine. You combine the brutal honesty of a senior FAANG recruiter, the structural analysis of an ATS engine like Workday, and the strategic eye of a top tech career coach.

Your output is ALWAYS a single valid JSON object matching this exact schema:

${REPORT_SCHEMA_HINT}

Rules:
- Return ONLY the JSON. No markdown fences. No commentary before or after.
- Be specific and brutally honest in analysis. Quote actual phrases from the resume in evidence fields.
- Scores are realistic — most resumes score 40-70, not 80+. An 85+ is rare and elite.
- "skill_credibility" should cover 6-10 of the most relevant skills, distinguishing tool-using vs system-building.
- "risk_flags" should be specific (vague achievements, missing metrics, keyword stuffing, fake AI claims, weak technical depth, unclear career path). Include actual quoted evidence.
- "rewrites" must be production-ready — exactly the text a candidate could paste into their resume.
- All strings are clean prose, no markdown formatting inside the JSON values.`;

  const user = `RESUME:
${resumeForAi}

---

TARGET JOB DESCRIPTION:
${jdForAi}

${truncWarn ? '\n[NOTE: Input was lightly truncated to fit single-API-key processing window.]\n' : ''}

Generate the full structured career intelligence report now as a JSON object. Output JSON only.`;

  try {
    const { result, provider } = await aiCall(
      [{ role: 'system', content: sys }, { role: 'user', content: user }],
      { temperature: 0.3, max_tokens: 4000, json_mode: true }
    );

    let report;
    try {
      report = extractJson(result);
    } catch (parseErr) {
      // One retry with a stricter prompt
      const retry = await aiCall(
        [{ role: 'system', content: sys }, { role: 'user', content: user + '\n\nReturn ONLY valid JSON. Start with { and end with }. No fences, no commentary.' }],
        { temperature: 0.1, max_tokens: 4000, json_mode: true }
      );
      report = extractJson(retry.result);
    }

    // Stash for export
    containerEl.dataset.report = JSON.stringify(report);
    containerEl.dataset.provider = provider;
    containerEl.dataset.localScore = JSON.stringify(localScore);

    renderReport(containerEl, report, provider, localScore, truncWarn);
    toast('Report generated ✓', 'success');
  } catch (e) {
    containerEl.innerHTML = renderReportError(e.message, inputSize, activeKeys);
    toast('Report failed — see card', 'error');
  } finally {
    setBusy(btn, false);
  }
}

/* === LOADING STATE === */
function renderLoadingState(el) {
  const stages = [
    'Analyzing resume structure',
    'Cross-checking with JD',
    'Running ATS simulation',
    'Computing recruiter perception',
    'Generating rewrites'
  ];
  el.innerHTML = `
    <div class="report-loading">
      <div class="stage" id="loading-stage">▸ ${stages[0]}</div>
      <div class="dots"><span></span><span></span><span></span></div>
      <div class="progress-trail" id="loading-trail">YAHAVI FORGE · CAREER INTELLIGENCE ENGINE</div>
    </div>
  `;
  // Rotate the stage label every 3 seconds
  let i = 0;
  const stageEl = el.querySelector('#loading-stage');
  const interval = setInterval(() => {
    i++;
    if (stageEl && i < stages.length && document.body.contains(stageEl)) {
      stageEl.textContent = '▸ ' + stages[i];
    } else {
      clearInterval(interval);
    }
  }, 3500);
}

/* === NO KEYS STATE === */
function renderNoKeysState() {
  return `
    <div class="no-keys-state">
      <div class="icon">⚠</div>
      <h3>NO API KEY YET</h3>
      <p>Yahavi Forge runs on free-tier AI. Add a free Groq key (60 seconds) in <strong>▸ KEYS</strong> top right to generate your career intelligence report.</p>
      <button class="btn btn-primary" onclick="openDrawer()">▸ OPEN KEYS PANEL</button>
    </div>
  `;
}

/* === REPORT ERROR STATE === */
function renderReportError(message, inputSize, activeKeys) {
  const isTokenLimit = /token|context|too.{0,8}long|limit|max/i.test(message);
  const isLargeInput = inputSize > MAX_SINGLE_KEY_CHARS;
  const showLargeInputHint = isTokenLimit || isLargeInput;

  return `
    <div class="report" style="padding: 0;">
      <div class="report-head" style="background: var(--pink);">
        <div class="eyebrow"><span class="badge-live" style="background: var(--paper);"></span> ERROR · YAHAVI INTELLIGENCE ENGINE</div>
        <h1>Couldn't complete the analysis</h1>
        <div class="meta">${new Date().toLocaleString()}</div>
      </div>
      <div class="report-body">
        ${showLargeInputHint && activeKeys === 1 ? `
          <div class="input-warning">
            <span class="icon">▶</span>
            <div class="text">
              <strong>Large resume detected.</strong> One free API key can't reliably handle this size of recruiter-grade analysis.
              <br><br>
              <strong>Fix in 2 minutes:</strong> Add a Gemini key (1M context window) or OpenRouter key in <strong>▸ KEYS</strong>. The engine will route automatically to whichever provider can handle the load.
            </div>
          </div>
        ` : ''}
        <div style="padding: 16px; background: var(--paper-warm); border: 2px solid var(--ink); margin-bottom: 16px;">
          <div style="font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--ink-faint); margin-bottom: 8px;">▸ TECHNICAL DETAIL</div>
          <div style="font-family: var(--font-mono); font-size: 12px; line-height: 1.6; color: var(--ink);">${(message || '').replace(/</g, '&lt;').replace(/\n/g, '<br>')}</div>
        </div>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button class="btn btn-primary" onclick="runReport()">▸ TRY AGAIN</button>
          <button class="btn btn-ghost" onclick="openDrawer()">▸ MANAGE KEYS</button>
        </div>
      </div>
    </div>
  `;
}

/* === MAIN REPORT RENDER === */
function renderReport(el, r, provider, localScore, truncated) {
  el.classList.add('has-content');
  const now = new Date();
  const pname = PROVIDERS[provider]?.name || provider || 'AI';
  const score = r.ats_score?.score ?? 0;
  const cat = r.ats_score?.category || 'Moderate';
  const confidence = r.ats_score?.confidence || 'medium';

  const html = `
    <div class="report" id="report-root">
      <div class="report-head">
        <div class="eyebrow">
          <span class="badge-live"></span> CAREER INTELLIGENCE REPORT · YAHAVI FORGE
        </div>
        <h1>${escapeHtml(r.identity?.target_role || 'Resume vs Target Role')}</h1>
        <div class="meta">
          ${now.toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'})} · ${now.toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit'})}
          · Generated by ${pname} · ${confidence.toUpperCase()} CONFIDENCE
        </div>
      </div>
      <div class="report-body">
        ${truncated ? `
          <div class="input-warning">
            <span class="icon">▶</span>
            <div class="text"><strong>Note:</strong> Resume was lightly truncated to fit free-tier processing window. Add a second provider key in <strong>▸ KEYS</strong> for full-length analysis.</div>
          </div>
        ` : ''}

        ${renderMetricsRow(r, score, cat, localScore)}
        ${renderIdentity(r)}
        ${renderSkillCredibility(r)}
        ${renderKeywordGap(r)}
        ${renderRiskFlags(r)}
        ${renderTechnicalDepth(r)}
        ${renderAchievementImpact(r)}
        ${renderStrengthSummary(r)}
        ${renderTopFixes(r)}
        ${renderRewrites(r)}
        ${renderExportBar()}
      </div>
    </div>
  `;
  el.innerHTML = html;
  bindReportControls();
}

function renderMetricsRow(r, score, cat, localScore) {
  const catClass = cat.toLowerCase();
  const interview = r.interview_probability?.level || 'Moderate';
  return `
    <div class="metrics-row">
      <div class="metric-card score-card">
        <div class="metric-label">▸ ATS COMPATIBILITY</div>
        <div class="metric-value">${score}<span class="denominator">/100</span></div>
        <span class="metric-tag ${catClass}">${escapeHtml(cat).toUpperCase()}</span>
        <div class="metric-meta">Local algo: ${localScore.score}/100 · ${localScore.matched_keywords.length} kw matched</div>
      </div>
      <div class="metric-card imp">
        <div class="metric-label">▸ 6-SECOND IMPRESSION</div>
        <div class="metric-value">${escapeHtml(r.six_second_impression || 'No impression generated')}</div>
      </div>
      <div class="metric-card primary">
        <div class="metric-label">▸ INTERVIEW PROBABILITY</div>
        <div class="metric-value" style="color: var(--yellow); font-size: 32px;">${escapeHtml(interview).toUpperCase()}</div>
        <div class="metric-meta">${escapeHtml(r.interview_probability?.reasoning || '').slice(0, 90)}</div>
      </div>
    </div>
  `;
}

function renderIdentity(r) {
  const id = r.identity || {};
  return `
    <div class="r-section">
      <div class="r-section-head" data-toggle>
        <h2><span class="num">01</span> IDENTITY ANALYSIS</h2>
        <span class="chev">▾</span>
      </div>
      <div class="r-section-body">
        <div class="identity-grid">
          <div class="identity-block">
            <div class="label">▸ ACTUAL POSITIONING</div>
            <div class="val">${escapeHtml(id.actual_role || '—')}</div>
          </div>
          <div class="identity-block target">
            <div class="label">▸ TARGET ROLE</div>
            <div class="val">${escapeHtml(id.target_role || '—')}</div>
          </div>
        </div>
        <div class="alignment-text">${escapeHtmlWithStrong(id.alignment || '')}</div>
      </div>
    </div>
  `;
}

function renderSkillCredibility(r) {
  const skills = r.skill_credibility || [];
  if (!skills.length) return '';
  return `
    <div class="r-section">
      <div class="r-section-head" data-toggle>
        <h2><span class="num">02</span> SKILL CREDIBILITY METER</h2>
        <span class="chev">▾</span>
      </div>
      <div class="r-section-body">
        <div class="skill-list">
          ${skills.map(s => `
            <div class="skill-bar ${(s.level || 'moderate').toLowerCase()}">
              <div class="skill-name">${escapeHtml(s.skill || '—')}</div>
              <div class="skill-meter"><div class="skill-fill"></div></div>
              <div class="skill-level">${escapeHtml(s.level || '—')}</div>
              ${s.evidence ? `<div class="skill-evidence">▸ ${escapeHtml(s.evidence)}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderKeywordGap(r) {
  const g = r.keyword_gap || {};
  const chips = (arr) => (arr || []).map(k => `<span>${escapeHtml(k)}</span>`).join('');
  return `
    <div class="r-section">
      <div class="r-section-head" data-toggle>
        <h2><span class="num">03</span> KEYWORD GAP ANALYSIS</h2>
        <span class="chev">▾</span>
      </div>
      <div class="r-section-body">
        <div class="gap-grid">
          <div class="gap-col critical">
            <h3><span class="dot"></span>CRITICAL MISSING</h3>
            <div class="kw-chips">${chips(g.critical_missing) || '<span style="opacity: 0.5;">None — strong coverage</span>'}</div>
          </div>
          <div class="gap-col recommended">
            <h3><span class="dot"></span>RECOMMENDED</h3>
            <div class="kw-chips">${chips(g.recommended) || '<span style="opacity: 0.5;">—</span>'}</div>
          </div>
          <div class="gap-col optional">
            <h3><span class="dot"></span>NICE TO HAVE</h3>
            <div class="kw-chips">${chips(g.optional) || '<span style="opacity: 0.5;">—</span>'}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderRiskFlags(r) {
  const flags = r.risk_flags || [];
  if (!flags.length) return '';
  return `
    <div class="r-section">
      <div class="r-section-head" data-toggle>
        <h2><span class="num">04</span> HIRING RISK FLAGS</h2>
        <span class="chev">▾</span>
      </div>
      <div class="r-section-body">
        <div class="risk-list">
          ${flags.map(f => `
            <div class="risk-item ${(f.severity || 'medium').toLowerCase()}">
              <span class="sev">${escapeHtml(f.severity || 'medium').toUpperCase()}</span>
              <div class="body">
                <h4>${escapeHtml(f.flag || '—')}</h4>
                ${f.evidence ? `<div class="evidence"><em>${escapeHtml(f.evidence)}</em></div>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderTechnicalDepth(r) {
  const t = r.technical_depth || {};
  const tu = clamp(t.tool_usage_score || 0, 0, 10);
  const sd = clamp(t.system_dev_score || 0, 0, 10);
  const cellsTu = Array.from({length: 10}, (_, i) => `<span class="${i < tu ? 'fill' : ''}"></span>`).join('');
  const cellsSd = Array.from({length: 10}, (_, i) => `<span class="${i < sd ? 'fill' : ''}"></span>`).join('');
  return `
    <div class="r-section">
      <div class="r-section-head" data-toggle>
        <h2><span class="num">05</span> TECHNICAL DEPTH</h2>
        <span class="chev">▾</span>
      </div>
      <div class="r-section-body">
        <div class="depth-pair">
          <div class="depth-card ${tu >= 7 ? 'high' : tu <= 3 ? 'low' : ''}">
            <div class="label">▸ AI TOOL USAGE</div>
            <div class="score">${tu}<span class="of">/10</span></div>
            <div class="ten-bar">${cellsTu}</div>
          </div>
          <div class="depth-card ${sd >= 7 ? 'high' : sd <= 3 ? 'low' : ''}">
            <div class="label">▸ AI SYSTEM DEVELOPMENT</div>
            <div class="score">${sd}<span class="of">/10</span></div>
            <div class="ten-bar">${cellsSd}</div>
          </div>
        </div>
        ${t.assessment ? `<div class="depth-assessment">${escapeHtmlWithStrong(t.assessment)}</div>` : ''}
      </div>
    </div>
  `;
}

function renderAchievementImpact(r) {
  const a = r.achievement_impact || {};
  const score = clamp(a.score || 0, 0, 10);
  const checks = [
    { label: 'Metrics Present', v: a.metrics_present ? 'YES' : 'NO', cls: a.metrics_present ? 'yes' : 'no' },
    { label: 'Scale Mentioned', v: a.scale_mentioned ? 'YES' : 'NO', cls: a.scale_mentioned ? 'yes' : 'no' },
    { label: 'Automation Value', v: (a.automation_value || 'none').toUpperCase(), cls: (a.automation_value || 'none').toLowerCase() },
    { label: 'Leadership Shown', v: a.leadership_shown ? 'YES' : 'NO', cls: a.leadership_shown ? 'yes' : 'no' }
  ];
  return `
    <div class="r-section">
      <div class="r-section-head" data-toggle>
        <h2><span class="num">06</span> ACHIEVEMENT IMPACT</h2>
        <span class="chev">▾</span>
      </div>
      <div class="r-section-body">
        <div class="impact-grid">
          <div class="impact-score-block">
            <div class="num">${score}</div>
            <div class="of">/10 IMPACT</div>
          </div>
          <div class="impact-checks">
            ${checks.map(c => `
              <div class="impact-check">
                <span class="label">${c.label}</span>
                <span class="v ${c.cls}">${c.v}</span>
              </div>
            `).join('')}
          </div>
        </div>
        ${a.assessment ? `<div style="margin-top: 14px; padding: 12px; background: var(--paper-warm); border: 1.5px solid var(--ink); font-size: 13.5px; line-height: 1.5;">${escapeHtmlWithStrong(a.assessment)}</div>` : ''}
      </div>
    </div>
  `;
}

function renderStrengthSummary(r) {
  const s = r.strength_summary || {};
  return `
    <div class="r-section">
      <div class="r-section-head" data-toggle>
        <h2><span class="num">07</span> RESUME STRENGTH SUMMARY</h2>
        <span class="chev">▾</span>
      </div>
      <div class="r-section-body">
        <div class="strength-grid">
          <div class="strength-col good">
            <h3>▸ STRENGTHS</h3>
            <ul>${(s.strengths || []).map(x => `<li>${escapeHtml(x)}</li>`).join('') || '<li>—</li>'}</ul>
          </div>
          <div class="strength-col bad">
            <h3>▸ WEAKNESSES</h3>
            <ul>${(s.weaknesses || []).map(x => `<li>${escapeHtml(x)}</li>`).join('') || '<li>—</li>'}</ul>
          </div>
        </div>
        ${s.recruiter_perception ? `
          <div class="recruiter-quote">
            <span class="label">RECRUITER PERCEPTION</span>
            "${escapeHtml(s.recruiter_perception)}"
          </div>
        ` : ''}
        ${s.hiring_probability ? `
          <div style="margin-top: 14px; display: flex; align-items: center; gap: 10px;">
            <span style="font-family: var(--font-mono); font-size: 11px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: var(--ink-faint);">HIRING PROBABILITY:</span>
            <span class="metric-tag ${s.hiring_probability.toLowerCase()}">${escapeHtml(s.hiring_probability).toUpperCase()}</span>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function renderTopFixes(r) {
  const fixes = r.top_fixes || [];
  if (!fixes.length) return '';
  const sorted = [...fixes].sort((a, b) => (a.priority || 99) - (b.priority || 99));
  return `
    <div class="r-section">
      <div class="r-section-head" data-toggle>
        <h2><span class="num">08</span> TOP PRIORITY FIXES</h2>
        <span class="chev">▾</span>
      </div>
      <div class="r-section-body">
        <div class="fix-list">
          ${sorted.map((f, i) => `
            <div class="fix-item">
              <div class="pri">${String(f.priority || i + 1).padStart(2, '0')}</div>
              <div class="body">
                <h4>${escapeHtml(f.fix || '—')}</h4>
                ${f.impact ? `<div class="impact">▸ ${escapeHtml(f.impact)}</div>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderRewrites(r) {
  const rw = r.rewrites || {};
  return `
    <div class="r-section">
      <div class="r-section-head" data-toggle>
        <h2><span class="num">09</span> AI RESUME REWRITES</h2>
        <span class="chev">▾</span>
      </div>
      <div class="r-section-body">
        ${rw.headline ? `
          <div class="rewrite-block">
            <div class="rewrite-label">▸ STRONGER HEADLINE</div>
            <div class="rewrite-value">${escapeHtml(rw.headline)}</div>
          </div>
        ` : ''}
        ${rw.summary ? `
          <div class="rewrite-block">
            <div class="rewrite-label">▸ STRONGER SUMMARY</div>
            <div class="rewrite-value summary">${escapeHtml(rw.summary)}</div>
          </div>
        ` : ''}
        ${(rw.achievements && rw.achievements.length) ? `
          <div class="rewrite-block">
            <div class="rewrite-label">▸ ACHIEVEMENT BULLETS</div>
            <ul class="rewrite-list">
              ${rw.achievements.map(a => `<li>${escapeHtmlWithStrong(a)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        ${rw.skills_section ? `
          <div class="rewrite-block">
            <div class="rewrite-label">▸ OPTIMIZED SKILLS LINE</div>
            <div class="rewrite-value">${escapeHtml(rw.skills_section)}</div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function renderExportBar() {
  return `
    <div class="export-bar">
      <span class="label">▸ EXPORT YOUR REPORT</span>
      <div class="btns">
        <button onclick="exportReportPDF()">↓ PROFESSIONAL PDF</button>
        <button class="pink" onclick="exportReportHTML()">↓ INTERACTIVE HTML</button>
        <button class="lime" onclick="copyReportJSON()">⧉ COPY JSON</button>
      </div>
    </div>
  `;
}

/* === BIND COLLAPSIBLE SECTIONS === */
function bindReportControls() {
  $$('.r-section [data-toggle]').forEach(head => {
    head.addEventListener('click', () => {
      head.parentElement.classList.toggle('collapsed');
    });
  });
}

/* === UTILITIES === */
function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeHtmlWithStrong(s) {
  if (!s) return '';
  return escapeHtml(s).replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

/* === EXPORTS === */
function exportReportPDF() {
  const el = $('#report-container');
  const reportJson = el.dataset.report;
  if (!reportJson) { toast('Generate a report first', 'error'); return; }
  const report = JSON.parse(reportJson);
  const localScore = el.dataset.localScore ? JSON.parse(el.dataset.localScore) : null;
  const provider = el.dataset.provider || '';
  const docHtml = buildReportStandaloneHtml(report, localScore, provider, true);

  const win = window.open('', '_blank', 'width=900,height=1100');
  if (!win) { toast('Pop-up blocked — allow pop-ups', 'error'); return; }
  win.document.write(docHtml);
  win.document.close();
  setTimeout(() => { try { win.focus(); win.print(); } catch (e) {} }, 800);
  toast('Opening print dialog → save as PDF', 'success');
}

function exportReportHTML() {
  const el = $('#report-container');
  const reportJson = el.dataset.report;
  if (!reportJson) { toast('Generate a report first', 'error'); return; }
  const report = JSON.parse(reportJson);
  const localScore = el.dataset.localScore ? JSON.parse(el.dataset.localScore) : null;
  const provider = el.dataset.provider || '';
  const docHtml = buildReportStandaloneHtml(report, localScore, provider, false);

  const fn = 'yahavi-forge-career-report-' + new Date().toISOString().slice(0, 10) + '.html';
  downloadFile(docHtml, fn, 'text/html');
  toast('▸ HTML report downloaded', 'success');
}

function copyReportJSON() {
  const el = $('#report-container');
  const reportJson = el.dataset.report;
  if (!reportJson) { toast('Generate a report first', 'error'); return; }
  navigator.clipboard.writeText(JSON.stringify(JSON.parse(reportJson), null, 2)).then(
    () => toast('JSON copied to clipboard ✓', 'success'),
    () => toast('Copy failed', 'error')
  );
}

/* === BUILD STANDALONE HTML REPORT === */
function buildReportStandaloneHtml(r, localScore, provider, forPrint) {
  const now = new Date();
  const pname = (window.PROVIDERS && PROVIDERS[provider]?.name) || provider || 'AI';
  const cat = r.ats_score?.category || 'Moderate';
  const score = r.ats_score?.score ?? 0;
  const interview = r.interview_probability?.level || 'Moderate';
  const tu = clamp(r.technical_depth?.tool_usage_score || 0, 0, 10);
  const sd = clamp(r.technical_depth?.system_dev_score || 0, 0, 10);
  const a = r.achievement_impact || {};
  const aScore = clamp(a.score || 0, 0, 10);

  const skillLevelToWidth = lvl => ({ Strong: 90, Moderate: 55, Weak: 25 }[lvl] || 50);
  const skillLevelToColor = lvl => ({ Strong: '#b6ff39', Moderate: '#ffea00', Weak: '#ff2e63' }[lvl] || '#ffea00');

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Career Intelligence Report — ${escapeHtml(r.identity?.target_role || 'Resume Analysis')}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 14mm; }
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',sans-serif;background:#faf6e9;color:#0a0a0a;padding:32px 20px;line-height:1.55}
  .wrap{max-width:920px;margin:0 auto}
  .head{background:#0a0a0a;color:#faf6e9;padding:22px 28px;border:3px solid #0a0a0a;margin-bottom:24px;page-break-after:avoid}
  .eyebrow{font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:.25em;color:#ffea00;text-transform:uppercase;margin-bottom:8px;display:flex;align-items:center;gap:10px}
  .badge{width:8px;height:8px;background:#b6ff39;border-radius:50%;display:inline-block}
  h1{font-family:'Archivo Black',sans-serif;font-size:30px;text-transform:uppercase;letter-spacing:-.025em;margin-bottom:8px}
  .meta{font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:.08em;color:rgba(250,246,233,.65);text-transform:uppercase}
  .metrics{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:14px;margin-bottom:24px;page-break-inside:avoid}
  .metric{padding:18px;border:2px solid #0a0a0a;background:#fff}
  .metric.dark{background:#0a0a0a;color:#faf6e9}
  .metric .lbl{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.2em;text-transform:uppercase;font-weight:700;margin-bottom:10px;opacity:.7}
  .big{font-family:'Archivo Black',sans-serif;font-size:46px;letter-spacing:-.04em;color:#ffea00;line-height:1}
  .of{font-size:18px;color:rgba(250,246,233,.5);margin-left:4px}
  .tag{display:inline-block;margin-top:8px;padding:3px 9px;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;background:#ffea00;color:#0a0a0a;border:2px solid #0a0a0a}
  .tag.strong,.tag.exceptional,.tag.high{background:#b6ff39}
  .tag.moderate{background:#ffea00}
  .tag.weak{background:#ff6b1a;color:#faf6e9}
  .tag.critical,.tag.low{background:#ff2e63;color:#faf6e9}
  .imp{font-size:16px;font-weight:500;line-height:1.4;color:#0a0a0a}
  .section{background:#fff;border:2px solid #0a0a0a;margin-bottom:14px;padding:18px;page-break-inside:avoid}
  .section h2{font-family:'Archivo Black',sans-serif;font-size:14px;text-transform:uppercase;letter-spacing:-.005em;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid #0a0a0a;display:flex;align-items:baseline;gap:10px}
  .section h2 .num{font-family:'JetBrains Mono',monospace;font-size:10px;background:#ff2e63;color:#faf6e9;padding:2px 6px;letter-spacing:.1em;border:1.5px solid #0a0a0a}
  .id-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}
  .id-cell{padding:12px;background:#f3ede2;border:2px solid #0a0a0a}
  .id-cell.tgt{background:#ffea00}
  .id-cell .l{font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:.15em;text-transform:uppercase;font-weight:700;margin-bottom:4px;opacity:.7}
  .id-cell .v{font-family:'Archivo Black',sans-serif;font-size:15px;text-transform:uppercase;letter-spacing:-.01em;line-height:1.2}
  .align{padding:12px;background:#f3ede2;border-left:4px solid #ff2e63;font-size:14px;line-height:1.5;color:#2a2a2a}
  .align strong{background:#ffea00;padding:0 3px}
  .skill{display:grid;grid-template-columns:1fr 2fr auto;gap:10px;align-items:center;padding:9px 12px;background:#f3ede2;border:1.5px solid #0a0a0a;margin-bottom:8px}
  .skill .nm{font-weight:600;font-size:13px}
  .skill .meter{height:12px;background:#fff;border:1.5px solid #0a0a0a;overflow:hidden}
  .skill .fill{height:100%}
  .skill .lvl{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:2px 6px;border:1.5px solid #0a0a0a}
  .gap{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
  .gcol{padding:12px;border:2px solid #0a0a0a;min-height:100px}
  .gcol.c{background:rgba(255,46,99,.08);border-color:#ff2e63}
  .gcol.r{background:rgba(255,234,0,.18)}
  .gcol.o{background:rgba(182,255,57,.18)}
  .gcol h3{font-family:'JetBrains Mono',monospace;font-size:9.5px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;margin-bottom:8px}
  .gcol.c h3{color:#ff2e63}
  .chips{display:flex;flex-wrap:wrap;gap:4px}
  .chips span{font-family:'JetBrains Mono',monospace;font-size:10.5px;font-weight:600;background:#fff;border:1.5px solid #0a0a0a;padding:2px 7px}
  .gcol.c .chips span{background:#ff2e63;color:#faf6e9;border-color:#ff2e63}
  .risk{display:flex;gap:12px;padding:12px;background:#f3ede2;border:2px solid #0a0a0a;margin-bottom:8px;align-items:flex-start}
  .risk .sev{font-family:'JetBrains Mono',monospace;font-size:9.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:3px 7px;border:1.5px solid #0a0a0a;flex-shrink:0;min-width:55px;text-align:center}
  .risk.high .sev{background:#ff2e63;color:#faf6e9}
  .risk.medium .sev{background:#ff6b1a;color:#faf6e9}
  .risk.low .sev{background:#ffea00}
  .risk h4{font-family:'Archivo Black',sans-serif;font-size:13px;text-transform:uppercase;margin-bottom:3px}
  .risk .ev{font-size:13px;color:#2a2a2a}
  .depth{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
  .dcard{padding:14px;background:#f3ede2;border:2px solid #0a0a0a}
  .dcard .lbl{font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:.15em;text-transform:uppercase;font-weight:700;margin-bottom:6px;opacity:.7}
  .dcard .sc{font-family:'Archivo Black',sans-serif;font-size:30px;letter-spacing:-.03em;line-height:1}
  .dcard .sc .o{font-size:14px;color:#666;margin-left:2px}
  .tenbar{display:grid;grid-template-columns:repeat(10,1fr);gap:2px;margin-top:6px}
  .tenbar span{height:7px;background:#fff;border:1px solid #0a0a0a}
  .tenbar span.f{background:#0a0a0a}
  .imp-grid{display:grid;grid-template-columns:1fr 2fr;gap:12px}
  .imp-sc{text-align:center;padding:22px 14px;background:#0a0a0a;color:#faf6e9;border:2px solid #0a0a0a}
  .imp-sc .num{font-family:'Archivo Black',sans-serif;font-size:50px;color:#ffea00;letter-spacing:-.04em;line-height:.9}
  .imp-sc .of{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.15em;text-transform:uppercase;margin-top:4px;opacity:.7}
  .checks{display:flex;flex-direction:column;gap:6px}
  .ck{display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:#f3ede2;border:1.5px solid #0a0a0a;font-size:12.5px}
  .ck .v{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:.08em;padding:2px 6px;border:1.5px solid #0a0a0a;text-transform:uppercase}
  .ck .v.yes,.ck .v.high{background:#b6ff39}
  .ck .v.medium{background:#ffea00}
  .ck .v.low{background:#ff6b1a;color:#faf6e9}
  .ck .v.no,.ck .v.none{background:#ff2e63;color:#faf6e9}
  .str-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
  .scol{padding:14px;border:2px solid #0a0a0a}
  .scol.good{background:rgba(182,255,57,.18)}
  .scol.bad{background:rgba(255,46,99,.08)}
  .scol h3{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;margin-bottom:10px;padding-bottom:5px;border-bottom:1.5px solid #0a0a0a}
  .scol li{list-style:none;font-size:13px;line-height:1.5;color:#2a2a2a;padding-left:14px;position:relative;margin-bottom:5px}
  .scol.good li:before{content:"+";position:absolute;left:0;color:#2a8043;font-weight:700}
  .scol.bad li:before{content:"−";position:absolute;left:0;color:#ff2e63;font-weight:700}
  .quote{padding:16px 18px;background:#0a0a0a;color:#faf6e9;border:2px solid #0a0a0a;font-size:15px;line-height:1.45;font-style:italic;position:relative}
  .quote .l{position:absolute;top:-9px;left:10px;background:#ffea00;color:#0a0a0a;font-family:'JetBrains Mono',monospace;font-size:9.5px;font-weight:700;padding:1px 7px;letter-spacing:.15em;border:1.5px solid #0a0a0a;font-style:normal}
  .fix{display:grid;grid-template-columns:42px 1fr;gap:12px;padding:12px;background:#f3ede2;border:2px solid #0a0a0a;margin-bottom:8px;align-items:flex-start}
  .fix .pri{font-family:'Archivo Black',sans-serif;font-size:26px;color:#ff2e63;letter-spacing:-.03em;line-height:1}
  .fix h4{font-weight:600;font-size:13.5px;line-height:1.4;margin-bottom:4px}
  .fix .imp{font-family:'JetBrains Mono',monospace;font-size:10.5px;color:#666;text-transform:uppercase;letter-spacing:.08em}
  .rw{margin-bottom:12px}
  .rw .l{font-family:'JetBrains Mono',monospace;font-size:9.5px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;margin-bottom:5px;color:#666}
  .rw .v{padding:12px;background:#ffea00;border:2px solid #0a0a0a;font-size:13.5px;line-height:1.55}
  .rw .v.sum{font-style:italic}
  .rw ul{list-style:none;background:#fff;border:2px solid #0a0a0a;padding:12px 12px 12px 28px}
  .rw li{position:relative;font-size:13px;line-height:1.55;margin-bottom:6px}
  .rw li:before{content:"▸";position:absolute;left:-16px;color:#ff2e63}
  .rw li strong{background:#ffea00;padding:0 3px}
  .foot{margin-top:24px;padding:14px;background:#0a0a0a;color:#faf6e9;border:3px solid #0a0a0a;font-family:'JetBrains Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:.1em;display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap}
  .foot .acc{color:#ffea00}
  ${forPrint ? '.no-print{display:none}' : ''}
  @media print{body{background:#fff;padding:0}.section,.head,.foot{box-shadow:none;page-break-inside:avoid}}
</style></head><body><div class="wrap">

<header class="head">
  <div class="eyebrow"><span class="badge"></span> CAREER INTELLIGENCE REPORT · YAHAVI FORGE</div>
  <h1>${escapeHtml(r.identity?.target_role || 'Resume vs Target Role')}</h1>
  <div class="meta">${now.toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'})} · GENERATED BY ${pname.toUpperCase()} · ${(r.ats_score?.confidence || 'medium').toUpperCase()} CONFIDENCE</div>
</header>

<div class="metrics">
  <div class="metric dark">
    <div class="lbl">▸ ATS COMPATIBILITY</div>
    <div class="big">${score}<span class="of">/100</span></div>
    <span class="tag ${cat.toLowerCase()}">${escapeHtml(cat).toUpperCase()}</span>
    ${localScore ? `<div style="margin-top:8px;font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:rgba(250,246,233,.55)">LOCAL ALGO: ${localScore.score}/100 · ${localScore.matched_keywords.length} KW MATCHED</div>` : ''}
  </div>
  <div class="metric">
    <div class="lbl">▸ 6-SECOND IMPRESSION</div>
    <div class="imp">${escapeHtml(r.six_second_impression || '')}</div>
  </div>
  <div class="metric dark">
    <div class="lbl">▸ INTERVIEW PROBABILITY</div>
    <div class="big" style="color:#ffea00;font-size:28px;line-height:1.1">${escapeHtml(interview).toUpperCase()}</div>
    <div style="margin-top:8px;font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:rgba(250,246,233,.55)">${escapeHtml((r.interview_probability?.reasoning || '').slice(0, 80))}</div>
  </div>
</div>

<div class="section">
  <h2><span class="num">01</span> IDENTITY ANALYSIS</h2>
  <div class="id-grid">
    <div class="id-cell"><div class="l">▸ ACTUAL POSITIONING</div><div class="v">${escapeHtml(r.identity?.actual_role || '—')}</div></div>
    <div class="id-cell tgt"><div class="l">▸ TARGET ROLE</div><div class="v">${escapeHtml(r.identity?.target_role || '—')}</div></div>
  </div>
  <div class="align">${escapeHtmlWithStrong(r.identity?.alignment || '')}</div>
</div>

${(r.skill_credibility || []).length ? `
<div class="section">
  <h2><span class="num">02</span> SKILL CREDIBILITY METER</h2>
  ${(r.skill_credibility || []).map(s => `
    <div class="skill">
      <div class="nm">${escapeHtml(s.skill || '—')}</div>
      <div class="meter"><div class="fill" style="width:${skillLevelToWidth(s.level)}%;background:${skillLevelToColor(s.level)}"></div></div>
      <div class="lvl" style="background:${skillLevelToColor(s.level)};${s.level === 'Weak' ? 'color:#faf6e9;' : ''}">${escapeHtml(s.level || '—')}</div>
    </div>
  `).join('')}
</div>
` : ''}

<div class="section">
  <h2><span class="num">03</span> KEYWORD GAP ANALYSIS</h2>
  <div class="gap">
    <div class="gcol c"><h3>CRITICAL MISSING</h3><div class="chips">${(r.keyword_gap?.critical_missing || []).map(k => `<span>${escapeHtml(k)}</span>`).join('') || '<span style="opacity:.5">Strong coverage</span>'}</div></div>
    <div class="gcol r"><h3>RECOMMENDED</h3><div class="chips">${(r.keyword_gap?.recommended || []).map(k => `<span>${escapeHtml(k)}</span>`).join('') || '—'}</div></div>
    <div class="gcol o"><h3>NICE TO HAVE</h3><div class="chips">${(r.keyword_gap?.optional || []).map(k => `<span>${escapeHtml(k)}</span>`).join('') || '—'}</div></div>
  </div>
</div>

${(r.risk_flags || []).length ? `
<div class="section">
  <h2><span class="num">04</span> HIRING RISK FLAGS</h2>
  ${(r.risk_flags || []).map(f => `
    <div class="risk ${(f.severity || 'medium').toLowerCase()}">
      <span class="sev">${escapeHtml(f.severity || 'medium').toUpperCase()}</span>
      <div><h4>${escapeHtml(f.flag || '—')}</h4>${f.evidence ? `<div class="ev"><em>${escapeHtml(f.evidence)}</em></div>` : ''}</div>
    </div>
  `).join('')}
</div>
` : ''}

<div class="section">
  <h2><span class="num">05</span> TECHNICAL DEPTH</h2>
  <div class="depth">
    <div class="dcard">
      <div class="lbl">▸ AI TOOL USAGE</div>
      <div class="sc">${tu}<span class="o">/10</span></div>
      <div class="tenbar">${Array.from({length: 10}, (_, i) => `<span class="${i < tu ? 'f' : ''}"></span>`).join('')}</div>
    </div>
    <div class="dcard">
      <div class="lbl">▸ AI SYSTEM DEVELOPMENT</div>
      <div class="sc">${sd}<span class="o">/10</span></div>
      <div class="tenbar">${Array.from({length: 10}, (_, i) => `<span class="${i < sd ? 'f' : ''}"></span>`).join('')}</div>
    </div>
  </div>
  ${r.technical_depth?.assessment ? `<div style="padding:12px;background:#0a0a0a;color:#faf6e9;border:2px solid #0a0a0a;font-size:13px;line-height:1.5">${escapeHtmlWithStrong(r.technical_depth.assessment).replace(/<strong>/g, '<strong style="background:#ffea00;color:#0a0a0a;padding:0 3px">')}</div>` : ''}
</div>

<div class="section">
  <h2><span class="num">06</span> ACHIEVEMENT IMPACT</h2>
  <div class="imp-grid">
    <div class="imp-sc"><div class="num">${aScore}</div><div class="of">/10 IMPACT</div></div>
    <div class="checks">
      <div class="ck"><span>Metrics Present</span><span class="v ${a.metrics_present ? 'yes' : 'no'}">${a.metrics_present ? 'YES' : 'NO'}</span></div>
      <div class="ck"><span>Scale Mentioned</span><span class="v ${a.scale_mentioned ? 'yes' : 'no'}">${a.scale_mentioned ? 'YES' : 'NO'}</span></div>
      <div class="ck"><span>Automation Value</span><span class="v ${(a.automation_value || 'none').toLowerCase()}">${escapeHtml(a.automation_value || 'none').toUpperCase()}</span></div>
      <div class="ck"><span>Leadership Shown</span><span class="v ${a.leadership_shown ? 'yes' : 'no'}">${a.leadership_shown ? 'YES' : 'NO'}</span></div>
    </div>
  </div>
  ${a.assessment ? `<div style="margin-top:12px;padding:11px;background:#f3ede2;border:1.5px solid #0a0a0a;font-size:13px;line-height:1.5">${escapeHtmlWithStrong(a.assessment)}</div>` : ''}
</div>

<div class="section">
  <h2><span class="num">07</span> RESUME STRENGTH SUMMARY</h2>
  <div class="str-grid">
    <div class="scol good"><h3>▸ STRENGTHS</h3><ul>${(r.strength_summary?.strengths || []).map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul></div>
    <div class="scol bad"><h3>▸ WEAKNESSES</h3><ul>${(r.strength_summary?.weaknesses || []).map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul></div>
  </div>
  ${r.strength_summary?.recruiter_perception ? `<div class="quote"><span class="l">RECRUITER PERCEPTION</span>"${escapeHtml(r.strength_summary.recruiter_perception)}"</div>` : ''}
  ${r.strength_summary?.hiring_probability ? `<div style="margin-top:12px;display:flex;align-items:center;gap:8px"><span style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#666">HIRING PROBABILITY:</span><span class="tag ${r.strength_summary.hiring_probability.toLowerCase()}">${escapeHtml(r.strength_summary.hiring_probability).toUpperCase()}</span></div>` : ''}
</div>

${(r.top_fixes || []).length ? `
<div class="section">
  <h2><span class="num">08</span> TOP PRIORITY FIXES</h2>
  ${[...(r.top_fixes || [])].sort((a,b) => (a.priority||99)-(b.priority||99)).map((f, i) => `
    <div class="fix">
      <div class="pri">${String(f.priority || i+1).padStart(2, '0')}</div>
      <div><h4>${escapeHtml(f.fix || '—')}</h4>${f.impact ? `<div class="imp">▸ ${escapeHtml(f.impact)}</div>` : ''}</div>
    </div>
  `).join('')}
</div>
` : ''}

<div class="section">
  <h2><span class="num">09</span> AI RESUME REWRITES</h2>
  ${r.rewrites?.headline ? `<div class="rw"><div class="l">▸ STRONGER HEADLINE</div><div class="v">${escapeHtml(r.rewrites.headline)}</div></div>` : ''}
  ${r.rewrites?.summary ? `<div class="rw"><div class="l">▸ STRONGER SUMMARY</div><div class="v sum">${escapeHtml(r.rewrites.summary)}</div></div>` : ''}
  ${(r.rewrites?.achievements && r.rewrites.achievements.length) ? `<div class="rw"><div class="l">▸ ACHIEVEMENT BULLETS</div><ul>${r.rewrites.achievements.map(x => `<li>${escapeHtmlWithStrong(x)}</li>`).join('')}</ul></div>` : ''}
  ${r.rewrites?.skills_section ? `<div class="rw"><div class="l">▸ OPTIMIZED SKILLS LINE</div><div class="v">${escapeHtml(r.rewrites.skills_section)}</div></div>` : ''}
</div>

<footer class="foot">
  <span>▸ YAHAVI FORGE · BY HACKKNOW</span>
  <span class="acc">"FREE INTELLIGENCE, INFINITE CAPABILITY."</span>
  <span>${now.getFullYear()}</span>
</footer>

</div></body></html>`;
}

/* === Expose globals === */
window.runReport = runReport;
window.exportReportPDF = exportReportPDF;
window.exportReportHTML = exportReportHTML;
window.copyReportJSON = copyReportJSON;
window.openDrawer = openDrawer;
