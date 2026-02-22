/**
 * API wrapper with JWT token injection, error handling, and offline queue.
 *
 * When a network-level failure (TypeError: Failed to fetch) occurs on a
 * queued-eligible mutation, the operation is stored in IndexedDB and a
 * sentinel { __offline: true } is returned so the calling component doesn't
 * crash.  SyncManager replays the queue when the server comes back.
 */

import { enqueue } from './offlineQueue';

const API_BASE = '/api';

// ── Auth helpers ──────────────────────────────────────────────────────────

function getToken()       { return localStorage.getItem('plis_token'); }
function setToken(token)  { localStorage.setItem('plis_token', token); }
function removeToken()    { localStorage.removeItem('plis_token'); }

function getUser()        { const d = localStorage.getItem('plis_user'); return d ? JSON.parse(d) : null; }
function setUser(user)    { localStorage.setItem('plis_user', JSON.stringify(user)); }
function removeUser()     { localStorage.removeItem('plis_user'); }

// ── Offline queue configuration ───────────────────────────────────────────

/**
 * Paths that should NEVER be queued offline.
 * These require the server-side LLM, are destructive, or make no sense offline.
 */
const BLACKLIST = [
    '/daily-log/nlp',
    '/people/nlp',
    '/life-areas/nlp',
    '/weekly-reviews/generate',
    '/agents/run',
    '/rag/index',
    '/knowledge/extract',
    '/conversation-briefs/generate',
    '/auth/',
    '/upload',
];

/**
 * Returns true if this request should be saved to the offline queue
 * when the server is unreachable.
 */
function isQueueable(path, method) {
    // Only queue mutations
    if (method === 'GET' || method === 'DELETE') return false;
    // Never queue blacklisted paths
    if (BLACKLIST.some(b => path.startsWith(b))) return false;
    // Queue all other POST / PUT mutations
    return true;
}

/**
 * Build a short human-readable label for the queue badge tooltip.
 */
function buildLabel(path, method, body) {
    if (path === '/logs')                        return `Daily log for ${body?.date ?? 'today'}`;
    if (path === '/interactions')                return `Interaction with ${body?.person_id ? `person #${body.person_id}` : 'someone'}`;
    if (path.includes('/checkins'))              return `Goal check-in`;
    if (path === '/decisions')                   return `Decision: ${body?.title ?? ''}`;
    if (path.startsWith('/decisions/'))          return `Update decision`;
    if (path === '/people' && method === 'POST') return `New person: ${body?.name ?? ''}`;
    if (path.startsWith('/people/'))             return `Update person`;
    if (path === '/projects' && method === 'POST') return `New project: ${body?.name ?? ''}`;
    if (path.startsWith('/projects/') && path.includes('/tasks')) return `New task: ${body?.title ?? ''}`;
    if (path.startsWith('/projects/'))           return `Update project`;
    if (path.startsWith('/tasks/'))              return `Update task`;
    if (path === '/life-areas/batch')            return `Life area scores`;
    if (path.startsWith('/goals/'))              return `Update goal`;
    if (path === '/goals')                       return `New goal: ${body?.title ?? ''}`;
    return `${method} ${path}`;
}

// ── Core request function ─────────────────────────────────────────────────

async function request(path, options = {}) {
    const token  = getToken();
    const method = (options.method || 'GET').toUpperCase();

    const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(options.headers || {}),
    };

    try {
        const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

        if (res.status === 401) {
            removeToken();
            removeUser();
            window.location.href = '/login';
            throw new Error('Unauthorized');
        }

        if (!res.ok) {
            const error = await res.json().catch(() => ({ detail: 'Request failed' }));
            throw new Error(error.detail || 'Request failed');
        }

        if (res.status === 204 || res.headers.get('content-length') === '0') {
            return null;
        }

        return res.json();

    } catch (err) {
        // Only intercept true network failures (server unreachable / offline)
        // HTTP errors thrown above are not TypeError, so they propagate normally.
        if (err instanceof TypeError && isQueueable(path, method)) {
            const body  = options.body ? JSON.parse(options.body) : null;
            const label = buildLabel(path, method, body);

            await enqueue(path, method, body, label);

            // Tell SyncManager to refresh its badge count
            window.__plisRefreshPendingCount?.();

            // Return a sentinel so calling components don't crash.
            // Callers that use the return value (DailyLog) must guard for __offline.
            return { __offline: true };
        }

        throw err;
    }
}

// ── Public API ────────────────────────────────────────────────────────────

const api = {
    // Auth
    login:    (data) => request('/auth/login',    { method: 'POST', body: JSON.stringify(data) }),
    register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    getMe:    ()     => request('/auth/me'),

    // Daily Logs
    getLogs: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return request(`/logs${qs ? '?' + qs : ''}`);
    },
    getLogByDate: (date) => request(`/logs/${date}`),
    createLog:    (data) => request('/logs',      { method: 'POST', body: JSON.stringify(data) }),
    updateLog:  (id, data) => request(`/logs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteLog:    (id)   => request(`/logs/${id}`,   { method: 'DELETE' }),

    // People
    getPeople:    ()         => request('/people'),
    createPerson: (data)     => request('/people',     { method: 'POST', body: JSON.stringify(data) }),
    updatePerson: (id, data) => request(`/people/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deletePerson: (id)       => request(`/people/${id}`, { method: 'DELETE' }),
    nlpPerson:    (text, personId) => request('/people/nlp',    { method: 'POST', body: JSON.stringify({ text, person_id: personId || null }) }),
    nlpDailyLog:  (text, date)     => request('/daily-log/nlp', { method: 'POST', body: JSON.stringify({ text, log_date: date || null }) }),

    // Interactions
    getInteractions:  (personId) => request(`/people/${personId}/interactions`),
    createInteraction:(data)     => request('/interactions', { method: 'POST', body: JSON.stringify(data) }),
    deleteInteraction:(id)       => request(`/interactions/${id}`, { method: 'DELETE' }),

    // Projects
    getProjects: (status) => {
        const qs = status ? `?status_filter=${status}` : '';
        return request(`/projects${qs}`);
    },
    createProject: (data)     => request('/projects',     { method: 'POST', body: JSON.stringify(data) }),
    updateProject: (id, data) => request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteProject: (id)       => request(`/projects/${id}`, { method: 'DELETE' }),

    // Tasks
    getTasks:   (projectId)       => request(`/projects/${projectId}/tasks`),
    createTask: (projectId, data) => request(`/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(data) }),
    updateTask: (id, data)        => request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteTask: (id)              => request(`/tasks/${id}`, { method: 'DELETE' }),

    // Life Areas
    getLifeAreaScores: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return request(`/life-areas${qs ? '?' + qs : ''}`);
    },
    batchCreateScores: (data) => request('/life-areas/batch', { method: 'POST', body: JSON.stringify(data) }),
    nlpLifeAreas: (text, weekDate) => request('/life-areas/nlp', { method: 'POST', body: JSON.stringify({ text, week_start_date: weekDate }) }),

    // Goals
    getGoals: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return request(`/goals${qs ? '?' + qs : ''}`);
    },
    createGoal:      (data)         => request('/goals',             { method: 'POST', body: JSON.stringify(data) }),
    updateGoal:      (id, data)     => request(`/goals/${id}`,       { method: 'PUT',  body: JSON.stringify(data) }),
    deleteGoal:      (id)           => request(`/goals/${id}`,       { method: 'DELETE' }),
    createGoalCheckIn: (goalId, data) => request(`/goals/${goalId}/checkins`, { method: 'POST', body: JSON.stringify(data) }),

    // Decisions
    getDecisions:   ()         => request('/decisions'),
    createDecision: (data)     => request('/decisions',     { method: 'POST', body: JSON.stringify(data) }),
    updateDecision: (id, data) => request(`/decisions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

    // Dashboard
    getDashboardSummary: () => request('/dashboard/summary'),

    // Timeline
    getTimeline: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return request(`/timeline${qs ? '?' + qs : ''}`);
    },

    // Chapters
    getChapters: () => request('/chapters'),

    // Relationship Graph
    getGraphData: () => request('/people/graph'),

    // Photo Upload (multipart — not queued, just fails gracefully offline)
    uploadPhoto: async (file) => {
        const token = getToken();
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API_BASE}/upload`, {
            method:  'POST',
            headers: { ...(token && { Authorization: `Bearer ${token}` }) },
            body:    formData,
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({ detail: 'Upload failed' }));
            throw new Error(error.detail || 'Upload failed');
        }
        return res.json();
    },

    // Weekly Reviews (Module 9)
    getWeeklyReviews:   (limit = 12) => request(`/weekly-reviews?limit=${limit}`),
    getWeeklyReview:    (weekDate)   => request(`/weekly-reviews/${weekDate}`),
    generateWeeklyReview: (weekDate) => request('/weekly-reviews/generate', { method: 'POST', body: JSON.stringify({ week_start_date: weekDate || null }) }),

    // AI Agent Suite (Module 10)
    getAgentTypes: () => request('/agents/types'),
    getAgentInsights: (agentType, limit = 20) => {
        const params = new URLSearchParams({ limit });
        if (agentType) params.set('agent_type', agentType);
        return request(`/agents/insights?${params}`);
    },
    getAgentInsight: (id) => request(`/agents/insights/${id}`),
    runAgent: (agentType, startDate, endDate, insightPeriod) => request('/agents/run', {
        method: 'POST',
        body: JSON.stringify({
            agent_type:       agentType,
            date_range_start: startDate     || null,
            date_range_end:   endDate       || null,
            insight_period:   insightPeriod || null,
        }),
    }),

    // Network Evolution (Module 11)
    getNetworkEvolution: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return request(`/people/graph/evolution${qs ? '?' + qs : ''}`);
    },

    // Conversation Memory (Module 11)
    generateConversationBrief: (personId) => request('/conversation-briefs/generate', { method: 'POST', body: JSON.stringify({ person_id: personId }) }),
    getConversationBriefs: (personId, limit = 5) => request(`/conversation-briefs/${personId}?limit=${limit}`),

    // Advanced Visualizations (Module 11)
    getMoodEnergyViz: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return request(`/visualizations/mood-energy${qs ? '?' + qs : ''}`);
    },
    getLifeAreasHistory: (weeks = 24) => request(`/visualizations/life-areas-history?weeks=${weeks}`),
    getActivityHeatmap: (year) => {
        const qs = year ? `?year=${year}` : '';
        return request(`/visualizations/activity-heatmap${qs}`);
    },

    // RAG / Vector Store (Module 12)
    ragIndex:  ()             => request('/rag/index', { method: 'POST' }),
    ragStatus: ()             => request('/rag/status'),
    ragSearch: (query, params = {}) => {
        const qs = new URLSearchParams({ q: query, ...params }).toString();
        return request(`/rag/search?${qs}`);
    },

    // Knowledge Graph (Module 13)
    extractKnowledge: ()              => request('/knowledge/extract', { method: 'POST' }),
    getKnowledgeFacts: (category, limit = 50) => {
        const params = new URLSearchParams({ limit });
        if (category) params.set('category', category);
        return request(`/knowledge/facts?${params}`);
    },
    queryKnowledge: (query) => request(`/knowledge/query?q=${encodeURIComponent(query)}`),

    // Token / user management (exposed for SyncManager and App)
    getToken,
    setToken,
    removeToken,
    getUser,
    setUser,
    removeUser,
};

export default api;
