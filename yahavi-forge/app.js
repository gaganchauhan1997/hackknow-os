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
      errors.push({ id, msg: e.message, status: e.status });
      continue;
    }
  }

  if (errors.length === 0) {
    throw new Error('▸ NO API KEYS CONFIGURED\n\nOpen the ▸ KEYS panel (top right) and paste at least one free API key.\n\nFastest path: Get a Groq key (60 sec) at console.groq.com/keys');
  }

  // Friendlier composite error
  const summary = errors.map(e => {
    const p = PROVIDERS[e.id]?.name || e.id;
    if (e.status === 401 || /401|invalid.{0,20}key|unauthorized/i.test(e.msg)) {
      return `▸ ${p}: API KEY INVALID — re-generate at ${PROVIDERS[e.id]?.keyUrl}`;
    }
    if (e.status === 429 || /429|rate.?limit|quota/i.test(e.msg)) {
      return `▸ ${p}: RATE LIMITED — wait a minute, or add another provider as backup`;
    }
    if (e.status === 403 || /403|forbidden/i.test(e.msg)) {
      return `▸ ${p}: ACCESS DENIED — key may need billing/verification at ${PROVIDERS[e.id]?.keyUrl}`;
    }
    if (e.status === 404 || /404|model.{0,20}not.{0,20}found/i.test(e.msg)) {
      return `▸ ${p}: MODEL UNAVAILABLE — provider may have deprecated this model`;
    }
    if (/network|fetch|CORS|failed to fetch/i.test(e.msg)) {
      return `▸ ${p}: NETWORK ERROR — check connection or browser ad-blocker`;
    }
    return `▸ ${p}: ${e.msg.slice(0, 160)}`;
  }).join('\n');

  const hint = errors.length === 1
    ? '\n\nFix the issue above OR add another provider as fallback in ▸ KEYS.'
    : '\n\nAll your configured providers failed. Check keys in ▸ KEYS.';
  throw new Error(summary + hint);
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
    // JSON mode for providers that support it
    if (options.json_mode && (id === 'groq' || id === 'openrouter' || id === 'mistral' || id === 'together')) {
      body.response_format = { type: 'json_object' };
    }
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
      const err = new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      err.status = res.status;
      throw err;
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
    if (options.json_mode) body.generationConfig.responseMimeType = 'application/json';
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
      const err = new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      err.status = res.status;
      throw err;
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
      const err = new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      err.status = res.status;
      throw err;
    }
    const data = await res.json();
    return data.message?.content?.[0]?.text || '';
  }

  throw new Error(`Unknown provider type: ${p.type}`);
}

/* ============================================
   MARKDOWN → HTML (robust)
   Handles: # headers · **bold** · __bold__ · *italic* · _italic_
            `code` · ---  · - * + bullets · 1. numbered · > quotes
   ============================================ */
function md(text) {
  if (!text) return '';
  // Escape HTML
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code spans (do first so they don't interfere with bold/italic)
  html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');

  // Bold — handle ** and __ (must be done before italic)
  html = html.replace(/\*\*([^\*\n]+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_\n]+?)__/g, '<strong>$1</strong>');

  // Italic — handle * and _ (single chars, won't match the doubled versions above)
  // Negative lookbehind/ahead to avoid matching mid-word underscores
  html = html.replace(/(?<![\w*])\*([^\*\n]+?)\*(?![\w*])/g, '<em>$1</em>');
  html = html.replace(/(?<![\w_])_([^_\n]+?)_(?![\w_])/g, '<em>$1</em>');

  // Headers
  html = html.replace(/^### +(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## +(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# +(.+)$/gm, '<h1>$1</h1>');

  // Horizontal rules
  html = html.replace(/^[\-\*_]{3,}\s*$/gm, '<hr>');

  // Blockquotes
  html = html.replace(/^> +(.+)$/gm, '<blockquote>$1</blockquote>');

  // Unordered list items — accept -, *, +, or • as bullet markers
  html = html.replace(/^[ \t]*[\-\*\+•] +(.+)$/gm, '<li data-bullet="u">$1</li>');

  // Ordered list items
  html = html.replace(/^[ \t]*\d+\. +(.+)$/gm, '<li data-bullet="o">$1</li>');

  // Wrap consecutive <li> in <ul> or <ol>
  html = html.replace(/(<li data-bullet="u">[\s\S]*?<\/li>)(?:\n*(<li data-bullet="u">[\s\S]*?<\/li>))+/g,
    (m) => '<ul>' + m.replace(/ data-bullet="u"/g, '') + '</ul>');
  html = html.replace(/(<li data-bullet="o">[\s\S]*?<\/li>)(?:\n*(<li data-bullet="o">[\s\S]*?<\/li>))+/g,
    (m) => '<ol>' + m.replace(/ data-bullet="o"/g, '') + '</ol>');
  // Single-item lists
  html = html.replace(/<li data-bullet="u">([\s\S]*?)<\/li>/g, '<ul><li>$1</li></ul>');
  html = html.replace(/<li data-bullet="o">([\s\S]*?)<\/li>/g, '<ol><li>$1</li></ol>');

  // Paragraphs (lines not already in tags)
  html = html.split(/\n\n+/).map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    if (/^<(h\d|ul|ol|li|hr|p|pre|blockquote|div)/.test(trimmed)) return block;
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
  // Stash raw text on the element for exports
  outputEl.dataset.rawOutput = text;
  outputEl.dataset.provider = providerUsed || '';
}

function renderError(outputEl, message) {
  outputEl.classList.add('has-content');
  const escaped = String(message)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
  outputEl.innerHTML = `
    <div style="border: 3px solid var(--pink); background: rgba(255,46,99,0.08); padding: 18px;">
      <div style="font-family: var(--font-mono); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; color: var(--pink); margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
        <span style="display: inline-block; width: 10px; height: 10px; background: var(--pink);"></span>
        ERROR · YAHAVI COULDN'T FORGE
      </div>
      <div style="font-family: var(--font-mono); font-size: 12.5px; line-height: 1.65; color: var(--ink);">${escaped}</div>
    </div>
  `;
  delete outputEl.dataset.rawOutput;
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
    renderError(outputEl, e.message);
    toast('FAILED — see output panel', 'error');
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
    renderError(outputEl, e.message);
    toast('FAILED — see output panel', 'error');
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
    renderError(outputEl, e.message);
    toast('FAILED — see output panel', 'error');
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
    renderError(outputEl, e.message);
    toast('FAILED — see output panel', 'error');
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
    renderError(outputEl, e.message);
    toast('FAILED — see output panel', 'error');
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
    renderError(outputEl, e.message);
    toast('FAILED — see output panel', 'error');
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
    renderError(outputEl, e.message);
    toast('FAILED — see output panel', 'error');
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
   EXPORT — PDF (via print)
   ============================================ */
function exportPDF(outputId, title) {
  const el = $('#' + outputId);
  const raw = el.dataset.rawOutput;
  if (!raw) {
    toast('No successful output yet — run the module first', 'error');
    return;
  }
  const contentHtml = md(raw);
  const documentTitle = title || 'Yahavi Forge Output';
  const provider = el.dataset.provider ? PROVIDERS[el.dataset.provider]?.name : '';

  const win = window.open('', '_blank', 'width=900,height=1100');
  if (!win) {
    toast('Pop-up blocked — allow pop-ups for PDF export', 'error');
    return;
  }
  win.document.write(buildPrintDoc(documentTitle, contentHtml, provider));
  win.document.close();
  // Wait for fonts to load before printing
  setTimeout(() => {
    try {
      win.focus();
      win.print();
    } catch (e) { /* ignore */ }
  }, 600);
  toast('Opening print dialog → save as PDF', 'success');
}

function buildPrintDoc(title, contentHtml, provider) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; color: #1a1714; line-height: 1.55; background: #faf7f2; padding: 32px; margin: 0; }
  .doc { max-width: 720px; margin: 0 auto; }
  .doc-head { border-bottom: 2px solid #1a1714; padding-bottom: 14px; margin-bottom: 22px; }
  .doc-eyebrow { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.25em; text-transform: uppercase; color: #b8420f; margin-bottom: 8px; }
  .doc-title { font-family: 'Fraunces', serif; font-weight: 600; font-size: 32px; letter-spacing: -0.02em; line-height: 1.05; color: #1a1714; }
  .doc-meta { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: #8a8275; margin-top: 8px; }
  .doc-content { font-size: 14px; }
  .doc-content h1 { font-family: 'Fraunces', serif; font-weight: 600; font-size: 22px; margin: 18px 0 8px; letter-spacing: -0.015em; color: #1a1714; }
  .doc-content h2 { font-family: 'Fraunces', serif; font-weight: 600; font-size: 18px; margin: 16px 0 6px; color: #1a1714; }
  .doc-content h3 { font-family: 'Fraunces', serif; font-weight: 600; font-size: 15px; margin: 14px 0 4px; color: #1a1714; }
  .doc-content p { margin-bottom: 10px; }
  .doc-content ul, .doc-content ol { margin: 8px 0 12px 20px; }
  .doc-content li { margin-bottom: 4px; }
  .doc-content strong { font-weight: 600; color: #b8420f; }
  .doc-content em { font-style: italic; color: #4a4239; }
  .doc-content code { font-family: 'JetBrains Mono', monospace; font-size: 12px; background: #efe6d8; padding: 1px 4px; }
  .doc-content hr { border: none; border-top: 1px solid #d8cfc0; margin: 14px 0; }
  .doc-footer { margin-top: 32px; padding-top: 14px; border-top: 1px solid #d8cfc0; font-family: 'JetBrains Mono', monospace; font-size: 9.5px; letter-spacing: 0.1em; text-transform: uppercase; color: #8a8275; display: flex; justify-content: space-between; }
  @media print { body { background: white; padding: 0; } .doc-footer { page-break-inside: avoid; } }
</style></head>
<body>
<div class="doc">
  <div class="doc-head">
    <div class="doc-eyebrow">▸ YAHAVI FORGE · AI CAREER OS</div>
    <h1 class="doc-title">${title}</h1>
    <div class="doc-meta">Generated ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}${provider ? ' · via ' + provider : ''}</div>
  </div>
  <div class="doc-content">${contentHtml}</div>
  <div class="doc-footer">
    <span>YAHAVI FORGE · BY HACKKNOW</span>
    <span>"FREE INTELLIGENCE, INFINITE CAPABILITY."</span>
  </div>
</div>
</body></html>`;
}

/* ============================================
   EXPORT — HTML (download standalone webpage)
   ============================================ */
function exportHTML(outputId, title, filename) {
  const el = $('#' + outputId);
  const raw = el.dataset.rawOutput;
  if (!raw) {
    toast('No successful output yet — run the module first', 'error');
    return;
  }
  const contentHtml = md(raw);
  const documentTitle = title || 'Yahavi Forge Output';
  const provider = el.dataset.provider ? PROVIDERS[el.dataset.provider]?.name : '';
  const html = buildPrintDoc(documentTitle, contentHtml, provider);
  downloadFile(html, filename || 'yahavi-forge-output.html', 'text/html');
  toast('▸ HTML downloaded', 'success');
}

function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ============================================
   MODULE 8: PORTFOLIO WEBPAGE GENERATOR
   ============================================ */
async function runPortfolio() {
  const name = $('#port-name').value.trim();
  const headline = $('#port-headline').value.trim();
  const resume = $('#port-resume').value.trim();
  const links = $('#port-links').value.trim();
  const style = $('#port-style').value;
  const outputEl = $('#port-output');
  const btn = $('#port-go');

  if (!name || !resume) {
    toast('Need at least your name and resume content', 'error');
    return;
  }

  setBusy(btn, true);
  showLoading(outputEl, 'Forging your portfolio');

  const styleHint = {
    editorial: 'editorial magazine aesthetic with refined serif typography (Fraunces) and warm paper background',
    brutalist: 'brutalist neo-design with bold Archivo Black headlines, off-white paper, hard 6px shadows, electric yellow + hot pink accents',
    minimal: 'ultra-minimal Swiss design with generous whitespace, single sans-serif (Inter), monochrome with one accent',
    terminal: 'dark terminal/developer aesthetic with monospace (JetBrains Mono), green/cyan accents on near-black',
    luxury: 'luxury fashion-house aesthetic with thin elegant serif, gold accents, deep contrast'
  }[style] || 'clean editorial style';

  const sys = `You are Yahavi Forge — a world-class web designer. Produce ONLY raw HTML for a standalone portfolio webpage (single file, all CSS embedded in <style>, no external dependencies except Google Fonts <link>). The HTML must be complete, valid, and ready to save as .html.

REQUIRED STYLE: ${styleHint}

PAGE REQUIREMENTS:
- Sticky hero with name + headline + 1-line tagline
- About section (3-4 sentences from the resume)
- Skills section (chips/badges)
- Experience section (timeline-style with company, role, date, 3-4 achievement bullets each)
- Projects section if present in resume
- Education section
- Contact section with links provided
- Footer with name and year
- Fully responsive (mobile-first works)
- Print-friendly (@media print rules)
- Semantic HTML5 (<header>, <main>, <section>, <footer>)
- Accessibility (alt text, contrast)

OUTPUT FORMAT: Return ONLY the complete HTML document, starting with <!DOCTYPE html> and ending with </html>. NO explanation, NO markdown fences, NO commentary. Just the HTML.`;

  const user = `Build a portfolio website for:

NAME: ${name}
HEADLINE: ${headline || 'Professional'}

LINKS:
${links || '(none provided)'}

RESUME CONTENT:
${resume}

Generate the complete standalone HTML now.`;

  try {
    const { result, provider } = await aiCall(
      [{ role: 'system', content: sys }, { role: 'user', content: user }],
      { temperature: 0.5, max_tokens: 8192 }
    );

    // Strip markdown fences if AI added them anyway
    let html = result.trim();
    html = html.replace(/^```(?:html)?\n?/i, '').replace(/\n?```\s*$/i, '');

    // Validate it starts with <!DOCTYPE or <html
    if (!/^<!DOCTYPE|^<html/i.test(html)) {
      // Try to find a DOCTYPE within the response
      const match = html.match(/<!DOCTYPE html[\s\S]+<\/html>/i);
      if (match) html = match[0];
    }

    // Stash for export
    outputEl.dataset.rawOutput = html;
    outputEl.dataset.provider = provider;
    outputEl.classList.add('has-content');

    // Show preview with iframe + actions
    const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'portfolio';
    outputEl.innerHTML = `
      <div style="font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; color: var(--ink-faint); margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px dotted var(--ink);">
        ▸ PORTFOLIO READY · GENERATED BY ${PROVIDERS[provider]?.name || provider} · ${(html.length/1024).toFixed(1)}KB
      </div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px;">
        <button class="btn btn-primary" onclick="downloadPortfolio('${safeName}')">▸ DOWNLOAD HTML</button>
        <button class="btn btn-pink" onclick="previewPortfolioNewTab()">▸ OPEN IN NEW TAB</button>
        <button class="btn btn-ghost" onclick="printPortfolio()">▸ PRINT / PDF</button>
      </div>
      <iframe id="port-preview" sandbox="allow-same-origin" style="width: 100%; height: 520px; border: var(--border); background: #fff;"></iframe>
    `;
    const iframe = $('#port-preview');
    iframe.srcdoc = html;

    toast('Portfolio forged ✓', 'success');
  } catch (e) {
    renderError(outputEl, e.message);
    toast('FAILED — see output', 'error');
  } finally {
    setBusy(btn, false);
  }
}

function downloadPortfolio(safeName) {
  const el = $('#port-output');
  const html = el.dataset.rawOutput;
  if (!html) { toast('No portfolio to download', 'error'); return; }
  downloadFile(html, `${safeName}-portfolio.html`, 'text/html');
  toast('▸ Portfolio downloaded', 'success');
}

function previewPortfolioNewTab() {
  const el = $('#port-output');
  const html = el.dataset.rawOutput;
  if (!html) return;
  const win = window.open('', '_blank');
  if (!win) { toast('Pop-up blocked', 'error'); return; }
  win.document.write(html);
  win.document.close();
}

function printPortfolio() {
  const el = $('#port-output');
  const html = el.dataset.rawOutput;
  if (!html) return;
  const win = window.open('', '_blank', 'width=900,height=1100');
  if (!win) { toast('Pop-up blocked', 'error'); return; }
  win.document.write(html);
  win.document.close();
  setTimeout(() => { try { win.focus(); win.print(); } catch (e) {} }, 600);
}

// Expose globals for inline onclick
window.downloadPortfolio = downloadPortfolio;
window.previewPortfolioNewTab = previewPortfolioNewTab;
window.printPortfolio = printPortfolio;

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

  // ATS — Career Intelligence Report (v3)
  const atsBtn = $('#ats-go');
  if (atsBtn) atsBtn.addEventListener('click', () => {
    if (window.runReport) window.runReport();
    else runAtsOptimizer();
  });

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

  // Portfolio Generator
  const portBtn = $('#port-go');
  if (portBtn) portBtn.addEventListener('click', runPortfolio);

  // Copy buttons
  $$('[data-copy]').forEach(btn => {
    btn.addEventListener('click', () => copyOutput(btn.dataset.copy));
  });

  // PDF export buttons
  $$('[data-pdf]').forEach(btn => {
    btn.addEventListener('click', () => {
      const [outputId, title] = btn.dataset.pdf.split('|');
      exportPDF(outputId, title);
    });
  });

  // HTML export buttons
  $$('[data-html]').forEach(btn => {
    btn.addEventListener('click', () => {
      const [outputId, title, filename] = btn.dataset.html.split('|');
      exportHTML(outputId, title, filename);
    });
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
