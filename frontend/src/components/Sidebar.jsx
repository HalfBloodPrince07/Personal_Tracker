import { NavLink } from 'react-router-dom'
import { useState } from 'react'

const navSections = [
    {
        label: 'Quick',
        items: [
            { path: '/offline', icon: '📡', label: 'Offline Entry' },
        ],
    },
    {
        label: 'Core',
        items: [
            { path: '/', icon: '📊', label: 'Dashboard' },
            { path: '/daily-log', icon: '📝', label: 'Daily Log' },
            { path: '/projects', icon: '🚀', label: 'Projects' },
            { path: '/life-areas', icon: '🎯', label: 'Life Areas' },
            { path: '/goals', icon: '⭐', label: 'Goals' },
            { path: '/decisions', icon: '⚖️', label: 'Decisions' },
        ],
    },
    {
        label: 'People',
        items: [
            { path: '/people', icon: '👥', label: 'People' },
            { path: '/people/graph', icon: '🌐', label: '3D Graph' },
            { path: '/network-evolution', icon: '🔄', label: 'Net Evolution' },
            { path: '/people-in-life', icon: '🧑‍🤝‍🧑', label: 'People in Life' },
            { path: '/conversation-memory', icon: '💬', label: 'Conv Memory' },
        ],
    },
    {
        label: 'Intelligence',
        items: [
            { path: '/weekly-review', icon: '📋', label: 'Weekly Review' },
            { path: '/agents', icon: '🤖', label: 'AI Agents' },
            { path: '/advanced-viz', icon: '📈', label: 'Visualizations' },
        ],
    },
    {
        label: 'Narrative',
        items: [
            { path: '/timeline', icon: '📅', label: 'Timeline' },
            { path: '/chapters', icon: '📖', label: 'Chapters' },
        ],
    },
];

export default function Sidebar({ user, onLogout, collapsed, onToggle, pendingCount = 0 }) {
    const initials = user?.display_name
        ? user.display_name.slice(0, 2).toUpperCase()
        : user?.username?.slice(0, 2).toUpperCase() || '??';

    return (
        <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                <span className="logo">🧠</span>
                <span className="brand">
                    PLIS
                    {pendingCount > 0 && (
                        <span title={`${pendingCount} item${pendingCount !== 1 ? 's' : ''} pending sync`} style={{
                            marginLeft: '6px',
                            background: '#f59e0b',
                            color: '#000',
                            borderRadius: '999px',
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '1px 6px',
                            verticalAlign: 'middle',
                            lineHeight: '1.6',
                        }}>
                            {pendingCount}
                        </span>
                    )}
                </span>
            </div>

            <nav className="sidebar-nav">
                {navSections.map(section => (
                    <div key={section.label} className="nav-section">
                        <div className="nav-section-label">{section.label}</div>
                        {section.items.map(item => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.path === '/'}
                                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            >
                                <span className="nav-icon">{item.icon}</span>
                                <span className="nav-label">{item.label}</span>
                            </NavLink>
                        ))}
                    </div>
                ))}
            </nav>

            <div className="user-section">
                <div className="user-card" onClick={onLogout} title="Sign out">
                    <div className="user-avatar">{initials}</div>
                    <div className="user-info-text">
                        <div className="name">{user?.display_name || user?.username}</div>
                        <div className="role">Sign out</div>
                    </div>
                </div>
            </div>

            <div className="sidebar-footer">
                <button className="sidebar-toggle" onClick={onToggle}>
                    <span className="nav-icon">{collapsed ? '→' : '←'}</span>
                    <span className="nav-label">{collapsed ? 'Expand' : 'Collapse'}</span>
                </button>
            </div>
        </div>
    );
}
