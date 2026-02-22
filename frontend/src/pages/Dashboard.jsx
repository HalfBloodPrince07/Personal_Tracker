import { useState, useEffect, useRef } from 'react'
import { Routes, Route } from 'react-router-dom'
import api from '../api'
import { useSyncStatus } from '../SyncManager'
import Sidebar from '../components/Sidebar'
import DashboardHome from './DashboardHome'
import DailyLog from './DailyLog'
import Projects from './Projects'
import LifeAreas from './LifeAreas'
import Goals from './Goals'
import People from './People'
import Decisions from './Decisions'
import Timeline from './Timeline'
import Chapters from './Chapters'
import RelationshipGraph from './RelationshipGraph'
import WeeklyReview from './WeeklyReview'
import AgentHub from './AgentHub'
import AgentDetail from './AgentDetail'
import NetworkEvolution from './NetworkEvolution'
import ConversationMemory from './ConversationMemory'
import AdvancedViz from './AdvancedViz'
import PeopleInLife from './PeopleInLife'
import OfflineEntry from './OfflineEntry'

// ── SyncBanner ────────────────────────────────────────────────────────────────
function SyncBanner({ pendingCount, isSyncing, lastSyncAt }) {
    const [showAllSynced, setShowAllSynced] = useState(false);
    const prevCountRef = useRef(pendingCount);

    useEffect(() => {
        // When count drops to 0 from a positive value, flash the "All synced!" banner
        if (prevCountRef.current > 0 && pendingCount === 0) {
            setShowAllSynced(true);
            const t = setTimeout(() => setShowAllSynced(false), 3000);
            prevCountRef.current = 0;
            return () => clearTimeout(t);
        }
        prevCountRef.current = pendingCount;
    }, [pendingCount]);

    if (isSyncing) {
        return (
            <div style={{
                padding: '8px 24px', background: '#4f46e5', color: '#fff',
                fontSize: '13px', fontWeight: 500, display: 'flex',
                alignItems: 'center', gap: '8px',
            }}>
                <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
                Syncing {pendingCount} item{pendingCount !== 1 ? 's' : ''}…
            </div>
        );
    }

    if (showAllSynced) {
        return (
            <div style={{
                padding: '8px 24px', background: '#059669', color: '#fff',
                fontSize: '13px', fontWeight: 500,
            }}>
                ✅ All synced!
            </div>
        );
    }

    if (pendingCount > 0) {
        return (
            <div style={{
                padding: '8px 24px', background: '#d97706', color: '#fff',
                fontSize: '13px', fontWeight: 500,
            }}>
                📦 {pendingCount} item{pendingCount !== 1 ? 's' : ''} saved locally — will sync when PC is back online
            </div>
        );
    }

    return null;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard({ user, onLogout }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const { pendingCount, isSyncing, lastSyncAt } = useSyncStatus();

    return (
        <div className="app-layout">
            <Sidebar
                user={user}
                onLogout={onLogout}
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                pendingCount={pendingCount}
            />
            <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                <SyncBanner pendingCount={pendingCount} isSyncing={isSyncing} lastSyncAt={lastSyncAt} />
                <Routes>
                    <Route path="/" element={<DashboardHome user={user} />} />
                    <Route path="/daily-log" element={<DailyLog />} />
                    <Route path="/projects" element={<Projects />} />
                    <Route path="/life-areas" element={<LifeAreas />} />
                    <Route path="/goals" element={<Goals />} />
                    <Route path="/people" element={<People />} />
                    <Route path="/people/graph" element={<RelationshipGraph />} />
                    <Route path="/decisions" element={<Decisions />} />
                    <Route path="/timeline" element={<Timeline />} />
                    <Route path="/chapters" element={<Chapters />} />
                    {/* Module 9: Weekly Review */}
                    <Route path="/weekly-review" element={<WeeklyReview />} />
                    {/* Module 10: AI Agent Suite */}
                    <Route path="/agents" element={<AgentHub />} />
                    <Route path="/agents/:agentType" element={<AgentDetail />} />
                    {/* Module 11: Network Evolution, Conversation Memory, Advanced Viz */}
                    <Route path="/network-evolution" element={<NetworkEvolution />} />
                    <Route path="/conversation-memory" element={<ConversationMemory />} />
                    <Route path="/advanced-viz" element={<AdvancedViz />} />
                    <Route path="/people-in-life" element={<PeopleInLife />} />
                    <Route path="/offline" element={<OfflineEntry />} />
                </Routes>
            </main>
        </div>
    );
}
