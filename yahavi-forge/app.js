/* ============================================
   YAHAVI FORGE — APP LOGIC
   AI Router · Modules · UI Orchestration
   By Hackknow · Operator: Myth
   ============================================ */

/* ============================================
   PROVIDER REGISTRY (FREE-TIER FOCUS)
   ============================================ */
const PROVIDERS = {
  groq: {
    name: 'Groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile',
    fallbackModel: 'llama-3.1-8b-instant',
    type: 'openai',
    keyHint: 'gsk_...',
    keyUrl: 'https://console.groq.com/keys',
    note: 'Fastest free tier · 14,400 req/day'
  },
  gemini: {
    name: 'Google Gemini',
    url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    fallbackUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
    type: 'gemini',
    keyHint: 'AIza...',
    keyUrl: 'https://aistudio.google.com/apikey',
    note: 'Free · 1,500 req/day · 1M context'
  },
  openrouter: {
    name: 'OpenRouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'meta-llama/llama-3.3-70b-instruct:free',
    fallbackModel: 'google/gemini-2.0-flash-exp:free',
    type: 'openai',
    keyHint: 'sk-or-...',
    keyUrl: 'https://openrouter.ai/keys',
    note: 'Free tier across 100+ models'
  },
  together: {
    name: 'Together AI',
    url: 'https://api.together.xyz/v1/chat/completions',
    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
    type: 'openai',
    keyHint: 'API key',
    keyUrl: 'https://api.together.xyz/settings/api-keys',
    note: 'Free tier with $5 credit on signup'
  },
  mistral: {
    name: 'Mistral',
    url: 'https://api.mistral.ai/v1/chat/completions',
    model: 'mistral-small-latest',
    type: 'openai',
    keyHint: 'API key',
    keyUrl: 'https://console.mistral.ai/api-keys',
    note: 'Free tier · La Plateforme'
  },
  cohere: {
    name: 'Cohere',
    url: 'https://api.cohere.com/v2/chat',
    model: 'command-r-08-2024',
    type: 'cohere',
    keyHint: 'API key',
    keyUrl: 'https://dashboard.cohere.com/api-keys',
    note: 'Free trial keys · 1,000 req/month'
  }
};

const STORAGE_KEY = 'yahavi-forge-keys';
const PREFS_KEY = 'yahavi-forge-prefs';

/* ============================================
   STATE
   ============================================ */
const state = {
  keys: {},
  prefs: { tone: 'corporate', preferredProvider: 'auto', roastPersona: 'recruiter' },
  busy: false
};

function loadState() {
  try {
    state.keys = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    state.prefs = { ...state.prefs, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') };
  } catch (e) { console.warn('Load failed', e); }
}

function saveKeys() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.keys));
  updateConnectionStatus();
}

function savePrefs() {
  localStorage.setItem(PREFS_KEY, JSON.stringify(state.prefs));
}

/* ============================================
   AI CALL ROUTING
   ============================================ */
async function aiCall(messages, options = {}) {
  const order = ['groq', 'gemini', 'openrouter', 'together', 'mistral', 'cohere'];
  const preferred = state.prefs.preferredProvider;
  const tryOrder = (preferred && preferred !== 'auto' && state.keys[preferred])
    ? [preferred, ...order.filter(p => p !== preferred)]
    : order;

  const errors = [];
  for (const id of tryOrder) {
    if (!state.keys[id]) continue;
    try {
      const result = await callProvider(id, messages, options);
      return { result, provider: id };
    } catch (e) {
      errors.push(`${id}: ${e.message}`);
      continue;
    }
  }

  if (errors.length === 0) {
    throw new Error('No API keys configured. Open settings and paste at least one free key.');
  }
  throw new Error('All providers failed:\n' + errors.join('\n'));
}

async function callProvider(id, messages, options) {
  const p = PROVIDERS[id];
  const key = state.keys[id];
  const temperature = options.temperature ?? 0.7;

  if (p.type === 'openai') {
    const body = {
      model: options.model || p.model,
      messages,
      temperature,
      max_tokens: options.max_tokens || 2048
    };
    const res = await fetch(p.url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  if (p.type === 'gemini') {
    // Convert messages to Gemini format
    const sys = messages.find(m => m.role === 'system');
    const userTurns = messages.filter(m => m.role !== 'system');
    const body = {
      contents: userTurns.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })),
      generationConfig: {
        temperature,
        maxOutputTokens: options.max_tokens || 2048
      }
    };
    if (sys) body.systemInstruction = { parts: [{ text: sys.content }] };

    const url = `${p.url}?key=${encodeURIComponent(key)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const text = await res.text();
      // Try fallback model
      if (p.fallbackUrl) {
        const res2 = await fetch(`${p.fallbackUrl}?key=${encodeURIComponent(key)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (res2.ok) {
          const data2 = await res2.json();
          return data2.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
      }
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  if (p.type === 'cohere') {
    const body = {
      model: options.model || p.model,
      messages: messages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : (m.role === 'system' ? 'system' : 'user'),
        content: m.content
      })),
      temperature
    };
    const res = await fetch(p.url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    const data = await res.json();
    return data.message?.content?.[0]?.text || '';
  }

  throw new Error(`Unknown provider type: ${p.type}`);
}

/* ============================================
   MARKDOWN → HTML (lightweight)
   ============================================ */
function md(text) {
  if (!text) return '';
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code spans
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Bold
  html = html.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  // Horizontal rule
  html = html.replace(/^---+$/gm, '<hr>');
  // Lists
  html = html.replace(/^(?:[\*\-]) (.+)$/gm, '<li>$1</li>');
  html = html.replace(/((?:<li>.*<\/li>\s*)+)/g, '<ul>$1</ul>');
  // Numbered lists
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
  // Paragraphs (lines not already in tags)
  html = html.split(/\n\n+/).map(block => {
    if (/^<(h\d|ul|ol|li|hr|p|pre|blockquote)/.test(block.trim())) return block;
    return '<p>' + block.replace(/\n/g, '<br>') + '</p>';
  }).join('\n');

  return html;
}

/* ============================================
   UI HELPERS
   ============================================ */
function $(sel, root = document) { return root.querySelector(sel); }
function $$(sel, root = document) { return [...root.querySelectorAll(sel)]; }

function toast(msg, type = '') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  setTimeout(() => t.classList.remove('show'), 3200);
}

function showLoading(outputEl, msg = 'Yahavi is thinking') {
  outputEl.classList.add('has-content');
  outputEl.innerHTML = `<div class="loading">
    <span style="font-family: var(--font-mono); font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;">${msg}</span>
    <span class="loading-dots"><span></span><span></span><span></span></span>
  </div>`;
}

function renderOutput(outputEl, text, providerUsed) {
  outputEl.classList.add('has-content');
  const providerBadge = providerUsed
    ? `<div style="font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; color: var(--ink-faint); margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px dotted var(--ink);">▸ Generated by ${PROVIDERS[providerUsed]?.name || providerUsed}</div>`
    : '';
  outputEl.innerHTML = providerBadge + md(text);
}

function setBusy(btn, isBusy, originalText) {
  if (isBusy) {
    btn.dataset.original = btn.textContent;
    btn.innerHTML = `<span class="loading-dots"><span></span><span></span><span></span></span>`;
    btn.disabled = true;
  } else {
    btn.textContent = originalText || btn.dataset.original || 'GO';
    btn.disabled = false;
  }
}

/* ============================================
   NAVIGATION
   ============================================ */
function activatePage(pageId) {
  $$('.page').forEach(p => p.classList.remove('active'));
  $$('.nav-tab').forEach(t => t.classList.remove('active'));
  const page = $('#page-' + pageId);
  if (page) page.classList.add('active');
  const tab = $(`.nav-tab[data-page="${pageId}"]`);
  if (tab) tab.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ============================================
   SETTINGS DRAWER
   ============================================ */
function openDrawer() {
  $('#drawer').classList.add('open');
  $('#drawer-overlay').classList.add('open');
}

function closeDrawer() {
  $('#drawer').classList.remove('open');
  $('#drawer-overlay').classList.remove('open');
}

function renderProviderCards() {
  const container = $('#provider-list');
  container.innerHTML = '';
  Object.entries(PROVIDERS).forEach(([id, p]) => {
    const hasKey = !!state.keys[id];
    const card = document.createElement('div');
    card.className = 'provider-card';
    card.innerHTML = `
      <div class="provider-head">
        <div class="provider-name">${p.name}</div>
        <span class="provider-pill ${hasKey ? '' : 'empty'}">${hasKey ? 'ACTIVE' : 'EMPTY'}</span>
      </div>
      <div class="provider-body">
        <div class="form-group" style="margin-bottom: 8px;">
          <label class="form-label" style="font-size: 10px;">${p.note}</label>
          <input type="password" class="provider-input" data-provider="${id}"
                 placeholder="${p.keyHint}" value="${state.keys[id] || ''}" autocomplete="off" />
        </div>
        <a class="provider-link" href="${p.keyUrl}" target="_blank" rel="noopener noreferrer">
          GET FREE KEY ↗
        </a>
      </div>
    `;
    container.appendChild(card);
  });

  $$('.provider-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const id = e.target.dataset.provider;
      const v = e.target.value.trim();
      if (v) state.keys[id] = v;
      else delete state.keys[id];
      saveKeys();
    });
    input.addEventListener('change', (e) => {
      // Re-render pill state
      const id = e.target.dataset.provider;
      const card = e.target.closest('.provider-card');
      const pill = card.querySelector('.provider-pill');
      if (state.keys[id]) {
        pill.classList.remove('empty');
        pill.textContent = 'ACTIVE';
      } else {
        pill.classList.add('empty');
        pill.textContent = 'EMPTY';
      }
    });
  });
}

function updateConnectionStatus() {
  const count = Object.keys(state.keys).filter(k => state.keys[k]).length;
  const pill = $('#connection-status');
  if (count > 0) {
    pill.className = 'status-pill connected';
    pill.innerHTML = `<span class="dot"></span>${count} KEY${count > 1 ? 'S' : ''} ACTIVE`;
  } else {
    pill.className = 'status-pill';
    pill.innerHTML = `<span class="dot"></span>NO KEYS — ADD ONE`;
  }
}

/* ============================================
   MODULE 1: AI RESUME BUILDER
   ============================================ */
const TONE_INSTRUCTIONS = {
  corporate: 'Use polished corporate language. Emphasize structure, governance, stakeholder management, and measurable business outcomes.',
  startup: 'Use bold, builder-energy language. Emphasize ownership, speed, shipped products, and 0-to-1 impact.',
  faang: 'Use FAANG/big-tech language. Emphasize scale, system design, distributed systems thinking, A/B tests, and quantified user/business impact (latency reductions, conversion lifts, cost savings).',
  creative: 'Use vivid, narrative-driven language. Emphasize craft, design sensibility, and emotional impact.',
  executive: 'Use executive-level language. Emphasize strategy, P&L ownership, transformation, and board-level outcomes.'
};

async function runResumeBuilder() {
  const role = $('#rb-role').value.trim();
  const experience = $('#rb-experience').value.trim();
  const tone = state.prefs.tone;
  const outputEl = $('#rb-output');
  const btn = $('#rb-go');

  if (!experience) {
    toast('Paste your raw experience first', 'error');
    return;
  }

  setBusy(btn, true);
  showLoading(outputEl, 'Forging your achievements');

  const sys = `You are Yahavi Forge — an elite resume engineer specializing in AI Full Stack and modern engineering roles. ${TONE_INSTRUCTIONS[tone]}

For each task or experience the user describes, generate 3-5 powerful achievement-based bullet points using the STAR method (Situation, Task, Action, Result). Each bullet should:
- Start with a strong action verb (Architected, Engineered, Shipped, Reduced, Scaled, Automated, Designed, Led)
- Include quantified impact wherever possible (%, $, time saved, scale)
- Be ATS-optimized (incorporate role-relevant keywords)
- Be one line, ideally 18-26 words
- NEVER use weak verbs like "helped", "worked on", "responsible for"

Use bold (**) sparingly on the most important metrics. Format as clean markdown bullet list.`;

  const user = `ROLE BEING TARGETED: ${role || 'AI Full Stack Developer'}
TONE: ${tone.toUpperCase()}

RAW EXPERIENCE TO TRANSFORM:
${experience}

Generate the achievement bullets now.`;

  try {
    const { result, provider } = await aiCall(
      [{ role: 'system', content: sys }, { role: 'user', content: user }],
      { temperature: 0.7, max_tokens: 1400 }
    );
    renderOutput(outputEl, result, provider);
    toast('Achievements forged ✓', 'success');
  } catch (e) {
    outputEl.classList.remove('has-content');
    outputEl.innerHTML = `<div class="output-empty" style="color: var(--pink);">⚠ ${e.message}</div>`;
    toast(e.message, 'error');
  } finally {
    setBusy(btn, false);
  }
}

/* ============================================
   MODULE 2: ATS OPTIMIZER
   ============================================ */
async function runAtsOptimizer() {
  const resume = $('#ats-resume').value.trim();
  const jd = $('#ats-jd').value.trim();
  const outputEl = $('#ats-output');
  const btn = $('#ats-go');

  if (!resume || !jd) {
    toast('Paste both your resume AND the job description', 'error');
    return;
  }

  setBusy(btn, true);
  showLoading(outputEl, 'Running ATS simulation');

  const sys = `You are an enterprise ATS (Applicant Tracking System) parsing engine combined with a senior technical recruiter. Analyze the resume against the job description with the rigor of Workday, Greenhouse, or Lever.

Output format MUST be:

## ATS SCORE: [number out of 100]
**Verdict:** [BLOCKED | WEAK | DECENT | STRONG | ELITE]

## KEYWORD GAP
List the top 8-12 missing or under-represented keywords from the JD. For each: keyword → how to naturally inject it.

## SECTION ANALYSIS
- **Summary/Headline:** [strength + 1-line fix]
- **Skills:** [strength + 1-line fix]
- **Experience:** [strength + 1-line fix]
- **Education/Other:** [strength + 1-line fix]

## TOP 3 PRIORITY FIXES
Numbered, actionable, copy-pasteable.

## RECRUITER 6-SECOND READ
What a recruiter sees in the first 6 seconds. Is the candidate's value clear? Yes/no, why.

Be brutally specific. No fluff.`;

  const user = `RESUME:
${resume}

---

JOB DESCRIPTION:
${jd}

Score and analyze now.`;

  try {
    const { result, provider } = await aiCall(
      [{ role: 'system', content: sys }, { role: 'user', content: user }],
      { temperature: 0.3, max_tokens: 2000 }
    );
    // Extract score if present
    const scoreMatch = result.match(/ATS\s*SCORE:?\s*(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : null;
    const grade = score >= 85 ? 'ELITE' : score >= 70 ? 'STRONG' : score >= 55 ? 'DECENT' : score >= 40 ? 'WEAK' : 'BLOCKED';

    let html = '';
    if (score !== null) {
      html += `<div class="score-block">
        <div class="score-num">${score}</div>
        <div class="score-meta">
          <div class="score-label">ATS COMPATIBILITY · /100</div>
          <div class="score-grade">${grade}</div>
        </div>
      </div>`;
    }
    html += `<div style="font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; color: var(--ink-faint); margin-bottom: 14px;">▸ ANALYZED BY ${PROVIDERS[provider]?.name || provider}</div>`;
    html += md(result);
    outputEl.classList.add('has-content');
    outputEl.innerHTML = html;
    toast(score !== null ? `Score: ${score}/100` : 'ATS analysis done', 'success');
  } catch (e) {
    outputEl.classList.remove('has-content');
    outputEl.innerHTML = `<div class="output-empty" style="color: var(--pink);">⚠ ${e.message}</div>`;
    toast(e.message, 'error');
  } finally {
    setBusy(btn, false);
  }
}

/* ============================================
   MODULE 3: RESUME ROAST
   ============================================ */
const ROAST_PERSONAS = {
  recruiter: {
    label: 'Brutally Honest Recruiter',
    voice: 'You are a brutally honest senior recruiter who has reviewed 50,000+ resumes. You roast bad resumes with sharp wit but every roast contains a usable insight. Be funny, direct, and devastatingly accurate. Sprinkle in some Indian recruiting context where it fits.'
  },
  faang: {
    label: 'FAANG Recruiter',
    voice: 'You are a senior recruiter at Google/Meta/Amazon. You review resumes against the bar of L4-L6 engineers. Roast with cool detachment. Highlight what wouldn\'t survive a recruiter screen, then a hiring committee. Use insider FAANG vocabulary.'
  },
  hr: {
    label: 'HR Roast',
    voice: 'You are a sarcastic HR manager who has seen every cliché. Roast every buzzword, every cringe phrase, every weak claim. Be funny, cutting, but ultimately constructive.'
  },
  founder: {
    label: 'Startup Founder Review',
    voice: 'You are a YC-batch founder who has hired 200+ engineers. You roast resumes from a builder\'s lens: where\'s the ownership? Where\'s the shipped product? Be impatient, direct, and bullshit-allergic.'
  }
};

async function runRoast() {
  const resume = $('#roast-resume').value.trim();
  const persona = state.prefs.roastPersona;
  const outputEl = $('#roast-output');
  const btn = $('#roast-go');

  if (!resume) {
    toast('Paste your resume first — bring it on', 'error');
    return;
  }

  setBusy(btn, true);
  showLoading(outputEl, 'Loading the flamethrower');

  const personaCfg = ROAST_PERSONAS[persona];
  const sys = `${personaCfg.voice}

Roast format:
1. Open with a savage one-liner verdict
2. Roast 5-7 specific things (each: a quote/excerpt → why it's bad → suggested fix)
3. End with one piece of genuine, life-changing advice
4. Final line: a brutal honesty score out of 10 with a 1-line judgement

Be funny but every roast must contain a usable insight. Format with markdown.`;

  const user = `RESUME TO ROAST:

${resume}

Roast away. Don't hold back.`;

  try {
    const { result, provider } = await aiCall(
      [{ role: 'system', content: sys }, { role: 'user', content: user }],
      { temperature: 0.9, max_tokens: 1800 }
    );
    renderOutput(outputEl, result, provider);
    toast('Roasted to perfection 🔥', 'success');
  } catch (e) {
    outputEl.classList.remove('has-content');
    outputEl.innerHTML = `<div class="output-empty" style="color: var(--pink);">⚠ ${e.message}</div>`;
    toast(e.message, 'error');
  } finally {
    setBusy(btn, false);
  }
}

/* ============================================
   MODULE 4: JOB TAILORING
   ============================================ */
async function runTailoring() {
  const resume = $('#tailor-resume').value.trim();
  const jd = $('#tailor-jd').value.trim();
  const outputEl = $('#tailor-output');
  const btn = $('#tailor-go');

  if (!resume || !jd) {
    toast('Need both resume and target job description', 'error');
    return;
  }

  setBusy(btn, true);
  showLoading(outputEl, 'Tailoring for maximum match');

  const sys = `You are Yahavi Forge — a world-class resume tailoring engine.

Your task: rewrite the user's resume to maximize match against the target job description while preserving 100% truth (never invent experience).

Output sections:
## TAILORED SUMMARY
A 2-3 line punchy summary repositioning the candidate for this specific role.

## TAILORED SKILLS (REORDERED)
List skills in optimal order for this JD. Bold the ones that exactly match JD requirements.

## TAILORED BULLETS
For each major role in the resume, rewrite 3-5 bullets to lead with JD-relevant language. Inject keywords naturally.

## INJECTED KEYWORDS
List of keywords now present that weren't before.

## MATCH UPGRADE
Estimated match score: BEFORE [%] → AFTER [%]
Quick rationale.

Use markdown. Bold the highest-impact phrases.`;

  const user = `ORIGINAL RESUME:
${resume}

---

TARGET JOB DESCRIPTION:
${jd}

Tailor it now. Maximum match, zero invention.`;

  try {
    const { result, provider } = await aiCall(
      [{ role: 'system', content: sys }, { role: 'user', content: user }],
      { temperature: 0.5, max_tokens: 2400 }
    );
    renderOutput(outputEl, result, provider);
    toast('Resume tailored ✓', 'success');
  } catch (e) {
    outputEl.classList.remove('has-content');
    outputEl.innerHTML = `<div class="output-empty" style="color: var(--pink);">⚠ ${e.message}</div>`;
    toast(e.message, 'error');
  } finally {
    setBusy(btn, false);
  }
}

/* ============================================
   MODULE 5: INTERVIEW PREP
   ============================================ */
async function runInterviewPrep() {
  const jd = $('#prep-jd').value.trim();
  const resume = $('#prep-resume').value.trim();
  const outputEl = $('#prep-output');
  const btn = $('#prep-go');

  if (!jd) {
    toast('Paste the job description to generate prep', 'error');
    return;
  }

  setBusy(btn, true);
  showLoading(outputEl, 'Predicting questions');

  const sys = `You are Yahavi Forge — an AI interview coach trained on 10,000+ interviews at top companies (FAANG, unicorn startups, top consultancies).

Generate a tactical interview prep pack for this specific role.

## PREDICTED QUESTIONS (12 total)
Format each as:
**Q: [question]**
*Why they ask:* [1 line]
*Strong answer framework:* [STAR structure in 2-3 lines, personalized if resume provided]

Cover:
- 3 BEHAVIORAL (collaboration, conflict, ownership)
- 4 TECHNICAL (role-specific depth)
- 3 SITUATIONAL (judgment calls)
- 2 RED-FLAG (gap, weakness, why this role)

## PREP CHECKLIST
A 7-item checklist of what to nail before the interview.

## CLOSING POWER QUESTIONS
3 questions the candidate should ask the interviewer to signal seniority.

Format in markdown. Be specific to THIS role.`;

  const user = `TARGET ROLE / JOB DESCRIPTION:
${jd}

${resume ? `CANDIDATE RESUME (use to personalize answers):\n${resume}\n` : ''}

Generate the prep pack now.`;

  try {
    const { result, provider } = await aiCall(
      [{ role: 'system', content: sys }, { role: 'user', content: user }],
      { temperature: 0.6, max_tokens: 2800 }
    );
    renderOutput(outputEl, result, provider);
    toast('Prep pack ready 🎯', 'success');
  } catch (e) {
    outputEl.classList.remove('has-content');
    outputEl.innerHTML = `<div class="output-empty" style="color: var(--pink);">⚠ ${e.message}</div>`;
    toast(e.message, 'error');
  } finally {
    setBusy(btn, false);
  }
}

/* ============================================
   MODULE 6: CAREER GAP FRAMING
   ============================================ */
async function runGapFraming() {
  const gap = $('#gap-input').value.trim();
  const tone = $('#gap-tone').value;
  const outputEl = $('#gap-output');
  const btn = $('#gap-go');

  if (!gap) {
    toast('Describe the gap or transition you want to frame', 'error');
    return;
  }

  setBusy(btn, true);
  showLoading(outputEl, 'Reframing your story');

  const sys = `You are Yahavi Forge — an elite career narrative architect.

Take the user's raw description of a career gap, industry switch, freelancing period, or weak phase, and reframe it into compelling professional language that:
- Reads as intentional and growth-oriented
- Demonstrates skill acquisition, self-direction, or relevant exposure
- Stays 100% truthful (never invent)
- Reads naturally in resume bullets, LinkedIn About, and interview answers

Generate three variants:

## VARIANT 1 — RESUME LINE
One powerful bullet/sentence ready to drop into a resume.

## VARIANT 2 — LINKEDIN ABOUT PARAGRAPH
A 3-4 sentence paragraph for LinkedIn About section.

## VARIANT 3 — INTERVIEW ANSWER (60-SECONDS)
A confident, structured spoken answer.

## STRATEGY NOTE
1-2 sentences explaining the reframing strategy.

Tone: ${tone}.`;

  const user = `RAW DESCRIPTION OF GAP / TRANSITION:
${gap}`;

  try {
    const { result, provider } = await aiCall(
      [{ role: 'system', content: sys }, { role: 'user', content: user }],
      { temperature: 0.6, max_tokens: 1400 }
    );
    renderOutput(outputEl, result, provider);
    toast('Story reframed ✓', 'success');
  } catch (e) {
    outputEl.classList.remove('has-content');
    outputEl.innerHTML = `<div class="output-empty" style="color: var(--pink);">⚠ ${e.message}</div>`;
    toast(e.message, 'error');
  } finally {
    setBusy(btn, false);
  }
}

/* ============================================
   MODULE 7: ACHIEVEMENT GENERATOR (QUICK)
   ============================================ */
async function runAchievement() {
  const input = $('#ach-input').value.trim();
  const outputEl = $('#ach-output');
  const btn = $('#ach-go');

  if (!input) {
    toast('Type a task or duty to transform', 'error');
    return;
  }

  setBusy(btn, true);
  showLoading(outputEl, 'Transforming');

  const sys = `You are Yahavi Forge's achievement-bullet engine.

The user gives you a weak, generic statement of a task or duty. You transform it into 3 strong achievement-based bullets that:
- Start with a powerful action verb
- Include realistic quantified impact (make conservative, plausible estimates)
- Sound ATS-optimized and recruiter-magnet
- Each is one line, 18-26 words

Format as a numbered list with one bullet per option. Bold the metric.`;

  const user = `WEAK STATEMENT:
${input}

Transform into 3 strong variants now.`;

  try {
    const { result, provider } = await aiCall(
      [{ role: 'system', content: sys }, { role: 'user', content: user }],
      { temperature: 0.8, max_tokens: 700 }
    );
    renderOutput(outputEl, result, provider);
    toast('Achievement forged ⚡', 'success');
  } catch (e) {
    outputEl.classList.remove('has-content');
    outputEl.innerHTML = `<div class="output-empty" style="color: var(--pink);">⚠ ${e.message}</div>`;
    toast(e.message, 'error');
  } finally {
    setBusy(btn, false);
  }
}

/* ============================================
   COPY TO CLIPBOARD
   ============================================ */
async function copyOutput(outputId) {
  const el = $('#' + outputId);
  const text = el.innerText || el.textContent;
  try {
    await navigator.clipboard.writeText(text);
    toast('Copied to clipboard ✓', 'success');
  } catch (e) {
    toast('Copy failed — select manually', 'error');
  }
}

/* ============================================
   INIT
   ============================================ */
function bindNav() {
  $$('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => activatePage(tab.dataset.page));
  });

  $$('[data-goto]').forEach(el => {
    el.addEventListener('click', () => activatePage(el.dataset.goto));
  });
}

function bindDrawer() {
  $('#btn-open-settings').addEventListener('click', openDrawer);
  $('#drawer-close').addEventListener('click', closeDrawer);
  $('#drawer-overlay').addEventListener('click', closeDrawer);
  // ESC closes
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawer();
  });
}

function bindModules() {
  // Resume Builder
  $('#rb-go').addEventListener('click', runResumeBuilder);
  $$('#page-builder .mode-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      $$('#page-builder .mode-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.prefs.tone = chip.dataset.tone;
      savePrefs();
    });
  });

  // ATS
  $('#ats-go').addEventListener('click', runAtsOptimizer);

  // Roast
  $('#roast-go').addEventListener('click', runRoast);
  $$('#page-roast .mode-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      $$('#page-roast .mode-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.prefs.roastPersona = chip.dataset.persona;
      savePrefs();
    });
  });

  // Tailoring
  $('#tailor-go').addEventListener('click', runTailoring);

  // Interview Prep
  $('#prep-go').addEventListener('click', runInterviewPrep);

  // Gap Framing
  $('#gap-go').addEventListener('click', runGapFraming);

  // Achievement Generator
  $('#ach-go').addEventListener('click', runAchievement);

  // Copy buttons
  $$('[data-copy]').forEach(btn => {
    btn.addEventListener('click', () => copyOutput(btn.dataset.copy));
  });
}

function applyPrefsToUI() {
  // Tone chips
  $$('#page-builder .mode-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.tone === state.prefs.tone);
  });
  // Roast persona chips
  $$('#page-roast .mode-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.persona === state.prefs.roastPersona);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadState();
  renderProviderCards();
  updateConnectionStatus();
  bindNav();
  bindDrawer();
  bindModules();
  applyPrefsToUI();
  activatePage('home');

  // First-run welcome
  if (Object.keys(state.keys).length === 0) {
    setTimeout(() => {
      toast('▸ Add a free API key to start forging', '');
    }, 800);
  }
});
