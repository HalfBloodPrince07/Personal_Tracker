import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

const AGENT_CONFIGS = {
    behavioral:     { color: '#6366f1', gradient: 'linear-gradient(135deg, #6366f1, #818cf8)' },
    psychological:  { color: '#ec4899', gradient: 'linear-gradient(135deg, #ec4899, #f472b6)' },
    financial:      { color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #34d399)' },
    relationship:   { color: '#f43f5e', gradient: 'linear-gradient(135deg, #f43f5e, #fb7185)' },
    decision_audit: { color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)' },
    predictive:     { color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' },
    contradiction:  { color: '#0ea5e9', gradient: 'linear-gradient(135deg, #0ea5e9, #38bdf8)' },
    life_pattern:   { color: '#14b8a6', gradient: 'linear-gradient(135deg, #14b8a6, #2dd4bf)' },
};

export default function AgentHub() {
    const [agents, setAgents] = useState([]);
    const [latestInsights, setLatestInsights] = useState({});
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadAgents();
    }, []);

    async function loadAgents() {
        try {
            setLoading(true);
            const types = await api.getAgentTypes();
            setAgents(types || []);

            // Load latest insight for each agent type
            const insightMap = {};
            for (const t of (types || [])) {
                try {
                    const insights = await api.getAgentInsights(t.id, 1);
                    if (insights && insights.length > 0) {
                        insightMap[t.id] = insights[0];
                    }
                } catch (e) { /* ignore */ }
            }
            setLatestInsights(insightMap);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    function formatDate(dateStr) {
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    return (
        <div>
            <div className="page-header">
                <h1>AI Agent Suite</h1>
                <div className="header-actions">
                    <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
                        8 specialized agents analyzing your life data
                    </span>
                </div>
            </div>

            <div className="page-content">
                {loading ? (
                    <div className="empty-state"><div className="loading-dots"><span></span><span></span><span></span></div></div>
                ) : (
                    <div className="agent-grid">
                        {agents.map(agent => {
                            const config = AGENT_CONFIGS[agent.id] || { color: '#6366f1', gradient: 'var(--gradient-primary)' };
                            const latest = latestInsights[agent.id];
                            return (
                                <div
                                    key={agent.id}
                                    className="agent-card"
                                    onClick={() => navigate(`/agents/${agent.id}`)}
                                    style={{ '--agent-color': config.color }}
                                >
                                    <div className="agent-card-header" style={{ background: config.gradient }}>
                                        <span className="agent-icon">{agent.icon}</span>
                                        <span className="agent-name">{agent.name}</span>
                                    </div>
                                    <div className="agent-card-body">
                                        <p className="agent-description">{agent.description}</p>
                                        {latest ? (
                                            <div className="agent-latest">
                                                <div className="agent-latest-title">{latest.title}</div>
                                                <div className="agent-latest-meta">
                                                    <span className={`badge badge-${latest.severity || 'info'}`}>
                                                        {latest.severity || 'info'}
                                                    </span>
                                                    <span>{formatDate(latest.created_at)}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="agent-no-data">No insights yet — run analysis</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
