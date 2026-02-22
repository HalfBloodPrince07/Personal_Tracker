import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import ForceGraph3D from 'react-force-graph-3d'
import SpriteText from 'three-spritetext'
import * as THREE from 'three'
import api from '../api'

const ENERGY_COLORS = {
    energizing: '#10b981',
    neutral: '#f59e0b',
    draining: '#ef4444',
};

const TYPE_COLORS = {
    family: '#f43f5e',
    partner: '#ec4899',
    close_friend: '#8b5cf6',
    friend: '#3b82f6',
    colleague: '#06b6d4',
    mentor: '#10b981',
    other: '#6b7280',
    self: '#fbbf24',
};

export default function RelationshipGraph() {
    const [graphData, setGraphData] = useState({ nodes: [], links: [] });
    const [loading, setLoading] = useState(true);
    const [selectedNode, setSelectedNode] = useState(null);
    const [hoveredNode, setHoveredNode] = useState(null);
    // Start with a reasonable estimate to avoid 800px canvas on first render
    const [dimensions, setDimensions] = useState({
        width: typeof window !== 'undefined' ? window.innerWidth - 170 : 800,
        height: typeof window !== 'undefined' ? window.innerHeight - 72 : 600
    });
    const [filterType, setFilterType] = useState('all');
    const containerRef = useRef(null);
    const graphRef = useRef(null);
    const initialFitDone = useRef(false);

    useEffect(() => { loadGraph(); }, []);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver(entries => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                setDimensions({ width, height });
            }
        });
        ro.observe(el);
        // Fire immediately
        setDimensions({ width: el.offsetWidth, height: el.offsetHeight });
        return () => ro.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading]); // re-run after loading state changes so the container exists

    const loadGraph = async () => {
        setLoading(true);
        initialFitDone.current = false;
        try {
            const data = await api.getGraphData();
            // Normalize node sizes — clamp between 2 and 12
            if (data.nodes) {
                const vals = data.nodes.map(n => n.val || 1);
                const maxVal = Math.max(...vals, 1);
                data.nodes = data.nodes.map(n => ({
                    ...n,
                    _size: 2 + (((n.val || 1) / maxVal) * 10),  // 2–12 range
                }));
            }
            setGraphData(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    // Filter graph data by relationship type
    const filteredData = useMemo(() => {
        if (filterType === 'all') return graphData;
        const visibleIds = new Set();
        const nodes = graphData.nodes.filter(n => {
            const show = n.type === 'self' || n.type === filterType;
            if (show) visibleIds.add(n.id);
            return show;
        });
        const links = graphData.links.filter(l => {
            const sid = typeof l.source === 'object' ? l.source.id : l.source;
            const tid = typeof l.target === 'object' ? l.target.id : l.target;
            return visibleIds.has(sid) && visibleIds.has(tid);
        });
        return { nodes, links };
    }, [graphData, filterType]);

    const handleNodeClick = useCallback((node) => {
        setSelectedNode(prev => prev?.id === node.id ? null : node);
        if (graphRef.current) {
            const distance = 60;
            const distRatio = 1 + distance / Math.hypot(node.x || 1, node.y || 1, node.z || 1);
            graphRef.current.cameraPosition(
                { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
                node,
                800
            );
        }
    }, []);

    const handleNodeHover = useCallback((node) => {
        setHoveredNode(node || null);
        if (containerRef.current) {
            containerRef.current.style.cursor = node ? 'grab' : 'default';
        }
    }, []);

    const handleBackgroundClick = useCallback(() => {
        setSelectedNode(null);
    }, []);

    // Stable node rendering — created ONCE per node, never rebuilt on hover/select
    const nodeThreeObject = useCallback((node) => {
        const group = new THREE.Group();
        const size = node._size || 4;

        // Main sphere
        const geometry = new THREE.SphereGeometry(size, 32, 32);
        const baseColor = new THREE.Color(node.color || '#6366f1');
        const material = new THREE.MeshPhongMaterial({
            color: baseColor,
            emissive: baseColor,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.85,
            shininess: 100,
        });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.name = 'nodeSphere';
        group.add(sphere);

        // Glow ring (hidden by default, shown on hover/select)
        const ringGeo = new THREE.RingGeometry(size * 1.3, size * 1.6, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: baseColor,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.name = 'glowRing';
        group.add(ring);

        // Name label
        const sprite = new SpriteText(node.name);
        sprite.color = node.color || '#ccc';
        sprite.textHeight = 2.5;
        sprite.fontWeight = 'normal';
        sprite.position.y = size + 3;
        sprite.name = 'label';
        group.add(sprite);

        // Store node ref for highlight updates
        node.__threeObj = group;

        return group;
    }, []); // NO dependencies — stable object

    // Update highlights reactively without rebuilding nodes
    useEffect(() => {
        if (!graphRef.current) return;
        const allNodes = filteredData.nodes;
        for (const node of allNodes) {
            const group = node.__threeObj;
            if (!group) continue;

            const isHighlighted = hoveredNode?.id === node.id || selectedNode?.id === node.id;
            const isDimmed = (hoveredNode || selectedNode) && !isHighlighted;

            // Update sphere material
            const sphere = group.getObjectByName('nodeSphere');
            if (sphere) {
                sphere.material.emissiveIntensity = isHighlighted ? 0.8 : 0.3;
                sphere.material.opacity = isHighlighted ? 1.0 : isDimmed ? 0.3 : 0.85;
            }

            // Show/hide glow ring
            const ring = group.getObjectByName('glowRing');
            if (ring) {
                ring.material.opacity = isHighlighted ? 0.4 : 0;
            }

            // Update label
            const label = group.children.find(c => c.name === 'label');
            if (label) {
                label.color = isHighlighted ? '#ffffff' : (node.color || '#ccc');
                label.textHeight = isHighlighted ? 3.5 : 2.5;
                label.fontWeight = isHighlighted ? 'bold' : 'normal';
            }
        }
    }, [hoveredNode, selectedNode, filteredData.nodes]);

    // Drag handlers — reheat simulation so nodes rearrange organically
    const handleNodeDrag = useCallback((node) => {
        if (containerRef.current) {
            containerRef.current.style.cursor = 'grabbing';
        }
    }, []);

    const handleNodeDragEnd = useCallback((node) => {
        if (containerRef.current) {
            containerRef.current.style.cursor = 'grab';
        }
        // Fix node position after drag
        node.fx = node.x;
        node.fy = node.y;
        node.fz = node.z;
    }, []);

    const getLinkColor = useCallback((link) => {
        const sid = typeof link.source === 'object' ? link.source.id : link.source;
        const tid = typeof link.target === 'object' ? link.target.id : link.target;
        const isHovered = hoveredNode && (sid === hoveredNode.id || tid === hoveredNode.id);
        const isSelected = selectedNode && (sid === selectedNode.id || tid === selectedNode.id);
        const active = isHovered || isSelected;

        if (link.type === 'shared_context') {
            return active ? 'rgba(167, 139, 250, 0.6)' : 'rgba(167, 139, 250, 0.08)';
        }
        const strength = link.value || 0.5;
        const opacity = active ? 0.7 : (0.06 + strength * 0.15);
        return `rgba(99, 102, 241, ${opacity})`;
    }, [hoveredNode, selectedNode]);

    const getLinkWidth = useCallback((link) => {
        const sid = typeof link.source === 'object' ? link.source.id : link.source;
        const tid = typeof link.target === 'object' ? link.target.id : link.target;
        const active = (hoveredNode && (sid === hoveredNode.id || tid === hoveredNode.id)) ||
            (selectedNode && (sid === selectedNode.id || tid === selectedNode.id));
        return active ? 2 : 0.3;
    }, [hoveredNode, selectedNode]);

    const getLinkParticles = useCallback((link) => {
        const sid = typeof link.source === 'object' ? link.source.id : link.source;
        const tid = typeof link.target === 'object' ? link.target.id : link.target;
        const active = (hoveredNode && (sid === hoveredNode.id || tid === hoveredNode.id)) ||
            (selectedNode && (sid === selectedNode.id || tid === selectedNode.id));
        return active ? 3 : 0;
    }, [hoveredNode, selectedNode]);

    const getNodeLabel = useCallback((node) => {
        if (node.type === 'self') return '';
        return `<div style="background:rgba(10,10,20,0.92);padding:12px 16px;border-radius:12px;color:white;font-size:13px;max-width:240px;border:1px solid ${node.color}50;backdrop-filter:blur(12px);box-shadow:0 8px 32px rgba(0,0,0,0.5)">
            <div style="font-size:15px;font-weight:700;color:${node.color};margin-bottom:4px">${node.name}</div>
            <div style="opacity:0.6;text-transform:capitalize;font-size:11px;margin-bottom:6px">${node.type?.replace('_', ' ')}</div>
            <div style="display:flex;gap:12px;font-size:12px">
                <span>Trust: <b style="color:${node.trust >= 7 ? '#10b981' : node.trust >= 4 ? '#f59e0b' : '#ef4444'}">${node.trust}/10</b></span>
                <span style="color:${ENERGY_COLORS[node.energy] || '#aaa'}">${node.energy || 'n/a'}</span>
            </div>
            ${node.interactions ? `<div style="font-size:11px;opacity:0.5;margin-top:4px">${node.interactions} interactions</div>` : ''}
        </div>`;
    }, []);

    const getLinkLabel = useCallback((link) => {
        if (link.type === 'shared_context') return '';
        return `<div style="background:rgba(10,10,20,0.85);padding:6px 10px;border-radius:6px;color:white;font-size:11px;backdrop-filter:blur(8px)">
            <span style="text-transform:capitalize">${link.type?.replace('_', ' ')}</span>
        </div>`;
    }, []);

    const relationshipTypes = [
        { id: 'all', label: 'All', color: '#6366f1' },
        { id: 'family', label: 'Family', color: '#f43f5e' },
        { id: 'partner', label: 'Partner', color: '#ec4899' },
        { id: 'close_friend', label: 'Close Friend', color: '#8b5cf6' },
        { id: 'friend', label: 'Friend', color: '#3b82f6' },
        { id: 'colleague', label: 'Colleague', color: '#06b6d4' },
        { id: 'mentor', label: 'Mentor', color: '#10b981' },
        { id: 'other', label: 'Other', color: '#6b7280' },
    ];

    return (
        <>
            <div className="page-header">
                <h1>🌐 Relationship Graph</h1>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={() => {
                        if (graphRef.current) {
                            graphRef.current.zoomToFit(800, 40);
                        }
                        setSelectedNode(null);
                        setHoveredNode(null);
                    }}>🔄 Reset View</button>
                    <button className="btn btn-primary" onClick={loadGraph}>↻ Refresh</button>
                </div>
            </div>

            <div className="page-content" style={{ padding: 0, position: 'relative', overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '70vh' }}>
                        <div className="loading-dots"><span /><span /><span /></div>
                    </div>
                ) : graphData.nodes.length <= 1 ? (
                    <div className="empty-state">
                        <div className="empty-icon">🌐</div>
                        <h3>No people in your network yet</h3>
                        <p>Add people from the People page to see your relationship graph come alive!</p>
                    </div>
                ) : (
                    <div ref={containerRef} style={{
                        width: '100%', height: 'calc(100vh - 140px)',
                        background: 'radial-gradient(ellipse at center, #0d0d1a 0%, #050510 100%)',
                        borderRadius: 'var(--radius-lg)', overflow: 'hidden', position: 'relative',
                    }}>
                        <ForceGraph3D
                            ref={graphRef}
                            graphData={filteredData}
                            width={dimensions.width}
                            height={dimensions.height}
                            backgroundColor="rgba(0,0,0,0)"
                            nodeLabel={getNodeLabel}
                            nodeThreeObject={nodeThreeObject}
                            linkLabel={getLinkLabel}
                            linkColor={getLinkColor}
                            linkWidth={getLinkWidth}
                            linkOpacity={1}
                            linkDirectionalParticles={getLinkParticles}
                            linkDirectionalParticleWidth={1.5}
                            linkDirectionalParticleSpeed={0.006}
                            linkDirectionalParticleColor={() => '#818cf8'}
                            linkCurvature={0.1}
                            onNodeClick={handleNodeClick}
                            onNodeHover={handleNodeHover}
                            onNodeDrag={handleNodeDrag}
                            onNodeDragEnd={handleNodeDragEnd}
                            onBackgroundClick={handleBackgroundClick}
                            enableNodeDrag={true}
                            enableNavigationControls={true}
                            showNavInfo={false}
                            warmupTicks={200}
                            cooldownTicks={200}
                            d3AlphaDecay={0.01}
                            d3VelocityDecay={0.15}
                            onEngineStop={() => {
                                // Apply proper physics forces
                                if (graphRef.current) {
                                    const chargeForce = graphRef.current.d3Force('charge');
                                    if (chargeForce) chargeForce.strength(-250).distanceMax(350);
                                    const linkForce = graphRef.current.d3Force('link');
                                    if (linkForce) linkForce.distance(link => 40 + (link.value || 0.5) * 50);
                                }
                                if (graphRef.current && !initialFitDone.current) {
                                    graphRef.current.zoomToFit(800, 60);
                                    initialFitDone.current = true;
                                    // Second call after resize settles
                                    setTimeout(() => {
                                        if (graphRef.current) graphRef.current.zoomToFit(400, 60);
                                    }, 600);
                                }
                            }}
                        />

                        {/* Filter Pills */}
                        <div style={{
                            position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)',
                            display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center',
                            background: 'rgba(10,10,20,0.75)', backdropFilter: 'blur(12px)',
                            borderRadius: '24px', padding: '6px 12px',
                            border: '1px solid rgba(99,102,241,0.15)',
                        }}>
                            {relationshipTypes.map(rt => (
                                <button
                                    key={rt.id}
                                    onClick={() => setFilterType(rt.id)}
                                    style={{
                                        background: filterType === rt.id ? rt.color + '30' : 'transparent',
                                        border: `1px solid ${filterType === rt.id ? rt.color : 'rgba(255,255,255,0.1)'}`,
                                        color: filterType === rt.id ? rt.color : 'var(--text-tertiary)',
                                        borderRadius: '16px', padding: '4px 12px', fontSize: '11px',
                                        cursor: 'pointer', transition: 'all 0.2s ease',
                                        fontWeight: filterType === rt.id ? 700 : 400,
                                    }}
                                >
                                    {rt.label}
                                </button>
                            ))}
                        </div>

                        {/* Legend */}
                        <div style={{
                            position: 'absolute', bottom: '14px', left: '14px',
                            background: 'rgba(10,10,20,0.8)', backdropFilter: 'blur(12px)',
                            borderRadius: '12px', padding: '12px 16px',
                            border: '1px solid rgba(99,102,241,0.15)', fontSize: '11px',
                            color: 'var(--text-secondary)',
                        }}>
                            <div style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)', fontSize: '12px' }}>Legend</div>
                            {relationshipTypes.filter(r => r.id !== 'all').map(l => (
                                <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px', cursor: 'pointer', opacity: filterType === 'all' || filterType === l.id ? 1 : 0.4 }}
                                    onClick={() => setFilterType(filterType === l.id ? 'all' : l.id)}
                                >
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: l.color, flexShrink: 0 }} />
                                    <span>{l.label}</span>
                                </div>
                            ))}
                        </div>

                        {/* Stats */}
                        <div style={{
                            position: 'absolute', bottom: '14px', right: '14px',
                            background: 'rgba(10,10,20,0.8)', backdropFilter: 'blur(12px)',
                            borderRadius: '12px', padding: '10px 14px',
                            border: '1px solid rgba(99,102,241,0.15)', fontSize: '11px',
                            color: 'var(--text-tertiary)', display: 'flex', gap: '16px',
                        }}>
                            <div><span style={{ fontWeight: 700, color: '#6366f1', fontSize: '14px' }}>{filteredData.nodes.length}</span> people</div>
                            <div><span style={{ fontWeight: 700, color: '#818cf8', fontSize: '14px' }}>{filteredData.links.length}</span> connections</div>
                        </div>

                        {/* Controls hint */}
                        <div style={{
                            position: 'absolute', top: '52px', right: '14px',
                            background: 'rgba(10,10,20,0.6)', backdropFilter: 'blur(8px)',
                            borderRadius: '8px', padding: '8px 12px',
                            border: '1px solid rgba(255,255,255,0.06)', fontSize: '10px',
                            color: 'var(--text-tertiary)',
                        }}>
                            🖱️ Drag to rotate · Scroll to zoom · Click node for details
                        </div>
                    </div>
                )}

                {/* Selected Node Detail Panel */}
                {selectedNode && selectedNode.type !== 'self' && (
                    <div style={{
                        position: 'absolute', top: '60px', left: '14px',
                        background: 'rgba(10,10,20,0.92)', backdropFilter: 'blur(20px)',
                        borderRadius: '16px', padding: '20px',
                        border: `1px solid ${selectedNode.color}40`,
                        minWidth: '250px', maxWidth: '280px', zIndex: 10,
                        boxShadow: `0 8px 40px ${selectedNode.color}15, 0 0 0 1px rgba(255,255,255,0.05)`,
                        animation: 'fadeIn 0.2s ease',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '14px' }}>
                            <div>
                                <div style={{ fontSize: '18px', fontWeight: 700, color: selectedNode.color }}>{selectedNode.name}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'capitalize', marginTop: '2px' }}>
                                    {selectedNode.type?.replace('_', ' ')}
                                </div>
                            </div>
                            <button onClick={() => setSelectedNode(null)} style={{
                                background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer',
                                color: 'var(--text-tertiary)', fontSize: '14px', width: '28px', height: '28px',
                                borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>✕</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px 12px', borderRadius: '10px' }}>
                                <div style={{ fontSize: '18px', fontWeight: 700, color: selectedNode.trust >= 7 ? '#10b981' : selectedNode.trust >= 4 ? '#f59e0b' : '#ef4444' }}>{selectedNode.trust}/10</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Trust Level</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px 12px', borderRadius: '10px' }}>
                                <div style={{ fontSize: '18px', fontWeight: 700, color: ENERGY_COLORS[selectedNode.energy] || '#aaa' }}>
                                    {selectedNode.energy === 'energizing' ? '⚡' : selectedNode.energy === 'draining' ? '🔋' : '😐'}
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'capitalize', marginTop: '2px' }}>{selectedNode.energy}</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px 12px', borderRadius: '10px' }}>
                                <div style={{ fontSize: '18px', fontWeight: 700, color: '#6366f1' }}>{selectedNode.interactions || 0}</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Interactions</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px 12px', borderRadius: '10px' }}>
                                <div style={{ fontSize: '18px', fontWeight: 700, color: '#a78bfa' }}>{selectedNode.influence ? Math.round(selectedNode.influence * 100) + '%' : '—'}</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Influence</div>
                            </div>
                        </div>
                        {selectedNode.notes && (
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                                "{selectedNode.notes}"
                            </div>
                        )}
                        {selectedNode.known_since && (
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '8px' }}>
                                📅 Known since {selectedNode.known_since}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}
