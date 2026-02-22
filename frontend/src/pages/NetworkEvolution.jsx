import { useState, useEffect, useRef, useCallback } from 'react'
import * as d3 from 'd3'
import api from '../api'

export default function NetworkEvolution() {
    const [snapshots, setSnapshots] = useState([]);
    const [people, setPeople] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [interval, setInterval_] = useState('week');
    const svgRef = useRef(null);
    const timerRef = useRef(null);

    useEffect(() => { loadData(); }, [interval]);

    async function loadData() {
        try {
            setLoading(true);
            const data = await api.getNetworkEvolution({ interval });
            setSnapshots(data.snapshots || []);
            setPeople(data.people || []);
            setCurrentIndex(0);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    // Animation playback
    useEffect(() => {
        if (playing && snapshots.length > 0) {
            timerRef.current = window.setInterval(() => {
                setCurrentIndex(prev => {
                    if (prev >= snapshots.length - 1) {
                        setPlaying(false);
                        return prev;
                    }
                    return prev + 1;
                });
            }, 1500);
        }
        return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
    }, [playing, snapshots.length]);

    // D3 rendering
    const renderGraph = useCallback(() => {
        if (!svgRef.current || snapshots.length === 0) return;

        const snapshot = snapshots[currentIndex];
        if (!snapshot) return;

        const svg = d3.select(svgRef.current);
        const width = svgRef.current.clientWidth;
        const height = 500;

        svg.attr('viewBox', `0 0 ${width} ${height}`);
        svg.selectAll('*').remove();

        const g = svg.append('g');

        // User node always at center
        const allNodes = [
            { id: 'user', name: 'You', x: width / 2, y: height / 2, r: 20, color: '#6366f1', type: 'self' },
            ...snapshot.nodes.map((n, i) => ({
                ...n,
                x: width / 2 + Math.cos(i * 2 * Math.PI / snapshot.nodes.length) * (150 + n.activity * 10),
                y: height / 2 + Math.sin(i * 2 * Math.PI / snapshot.nodes.length) * (150 + n.activity * 10),
                r: 8 + Math.min(n.activity * 3, 15),
                color: getTypeColor(n.type),
            })),
        ];

        const nodeMap = {};
        allNodes.forEach(n => nodeMap[n.id] = n);

        // Draw links
        g.selectAll('line')
            .data(snapshot.links)
            .join('line')
            .attr('x1', d => nodeMap[d.source]?.x || 0)
            .attr('y1', d => nodeMap[d.source]?.y || 0)
            .attr('x2', d => nodeMap[d.target]?.x || 0)
            .attr('y2', d => nodeMap[d.target]?.y || 0)
            .attr('stroke', 'rgba(99, 102, 241, 0.3)')
            .attr('stroke-width', d => 1 + d.value * 3)
            .style('opacity', 0)
            .transition().duration(500)
            .style('opacity', 1);

        // Draw nodes
        const nodeGroups = g.selectAll('g.node')
            .data(allNodes)
            .join('g')
            .attr('class', 'node')
            .attr('transform', d => `translate(${d.x},${d.y})`);

        nodeGroups.append('circle')
            .attr('r', 0)
            .attr('fill', d => d.color)
            .attr('stroke', 'rgba(255,255,255,0.2)')
            .attr('stroke-width', 1.5)
            .transition().duration(600)
            .attr('r', d => d.r);

        nodeGroups.append('text')
            .text(d => d.name)
            .attr('text-anchor', 'middle')
            .attr('dy', d => d.r + 14)
            .attr('fill', 'var(--text-secondary)')
            .attr('font-size', '11px')
            .style('opacity', 0)
            .transition().delay(300).duration(400)
            .style('opacity', 1);

    }, [currentIndex, snapshots]);

    useEffect(() => { renderGraph(); }, [renderGraph]);

    function getTypeColor(type) {
        if (!type) return '#a78bfa';
        const t = type.toLowerCase();
        if (['mother', 'father', 'brother', 'sister', 'parent', 'family', 'mummy', 'dad', 'mom'].some(k => t.includes(k))) return '#f43f5e';
        if (['girlfriend', 'boyfriend', 'partner', 'wife', 'husband', 'ex-girlfriend', 'ex-boyfriend', 'ex'].some(k => t.includes(k))) return '#ec4899';
        if (['best friend', 'very good friend', 'close friend', 'roommate'].some(k => t.includes(k))) return '#8b5cf6';
        if (['colleague', 'manager', 'teammate', 'flatmate', 'coworker'].some(k => t.includes(k))) return '#06b6d4';
        if (t.includes('mentor')) return '#10b981';
        if (['former', 'acquaintance'].some(k => t.includes(k))) return '#6b7280';
        if (t.includes('friend')) return '#3b82f6';
        return '#a78bfa';
    }

    const currentSnapshot = snapshots[currentIndex];

    return (
        <div>
            <div className="page-header">
                <h1>Network Evolution</h1>
                <div className="header-actions">
                    <select className="form-input" style={{ width: 120 }} value={interval} onChange={e => setInterval_(e.target.value)}>
                        <option value="day">Daily</option>
                        <option value="week">Weekly</option>
                        <option value="month">Monthly</option>
                    </select>
                </div>
            </div>

            <div className="page-content">
                {error && <div className="alert alert-error">{error}</div>}

                {loading ? (
                    <div className="empty-state"><div className="loading-dots"><span></span><span></span><span></span></div></div>
                ) : snapshots.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">🌐</div>
                        <h3>No Network Data</h3>
                        <p>Add people and interactions to see your network evolve over time.</p>
                    </div>
                ) : (
                    <>
                        <div className="card evolution-viz-card">
                            <div className="evolution-header">
                                <div className="evolution-date">
                                    {currentSnapshot && `${currentSnapshot.date} — ${currentSnapshot.date_end}`}
                                </div>
                                <div className="evolution-stats">
                                    <span>{currentSnapshot?.nodes?.length || 0} active connections</span>
                                    <span>{currentSnapshot?.total_interactions || 0} interactions</span>
                                </div>
                            </div>
                            <svg ref={svgRef} width="100%" height="500" style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)' }} />
                        </div>

                        <div className="evolution-controls">
                            <button className="btn btn-secondary" onClick={() => setCurrentIndex(0)} disabled={currentIndex === 0}>
                                ⏮
                            </button>
                            <button className="btn btn-secondary" onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0}>
                                ◀
                            </button>
                            <button className="btn btn-primary" onClick={() => setPlaying(!playing)}>
                                {playing ? '⏸ Pause' : '▶ Play'}
                            </button>
                            <button className="btn btn-secondary" onClick={() => setCurrentIndex(Math.min(snapshots.length - 1, currentIndex + 1))} disabled={currentIndex >= snapshots.length - 1}>
                                ▶
                            </button>
                            <button className="btn btn-secondary" onClick={() => setCurrentIndex(snapshots.length - 1)} disabled={currentIndex >= snapshots.length - 1}>
                                ⏭
                            </button>
                            <input
                                type="range"
                                min={0}
                                max={snapshots.length - 1}
                                value={currentIndex}
                                onChange={e => setCurrentIndex(Number(e.target.value))}
                                style={{ flex: 1 }}
                            />
                            <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-sm)', minWidth: 60 }}>
                                {currentIndex + 1}/{snapshots.length}
                            </span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
