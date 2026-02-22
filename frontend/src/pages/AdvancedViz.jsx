import { useState, useEffect, useRef, useCallback } from 'react'
import * as d3 from 'd3'
import api from '../api'

export default function AdvancedViz() {
    const [activeTab, setActiveTab] = useState('mood');
    const [moodData, setMoodData] = useState(null);
    const [areasData, setAreasData] = useState(null);
    const [heatmapData, setHeatmapData] = useState(null);
    const [loading, setLoading] = useState(true);

    const moodRef = useRef(null);
    const areasRef = useRef(null);
    const heatmapRef = useRef(null);

    useEffect(() => {
        loadAllData();
    }, []);

    async function loadAllData() {
        setLoading(true);
        try {
            const [mood, areas, heatmap] = await Promise.all([
                api.getMoodEnergyViz(),
                api.getLifeAreasHistory(24),
                api.getActivityHeatmap(),
            ]);
            setMoodData(mood);
            setAreasData(areas);
            setHeatmapData(heatmap);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    // Mood/Energy chart
    const renderMoodChart = useCallback(() => {
        if (!moodRef.current || !moodData?.data?.length) return;

        const svg = d3.select(moodRef.current);
        svg.selectAll('*').remove();

        const margin = { top: 20, right: 30, bottom: 40, left: 40 };
        const width = moodRef.current.clientWidth - margin.left - margin.right;
        const height = 350 - margin.top - margin.bottom;

        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const data = moodData.data.map(d => ({ ...d, date: new Date(d.date) }));

        const x = d3.scaleTime()
            .domain(d3.extent(data, d => d.date))
            .range([0, width]);

        const y = d3.scaleLinear().domain([0, 10]).range([height, 0]);

        // Grid lines
        g.selectAll('.grid-line')
            .data([2, 4, 6, 8])
            .join('line')
            .attr('x1', 0).attr('x2', width)
            .attr('y1', d => y(d)).attr('y2', d => y(d))
            .attr('stroke', 'rgba(255,255,255,0.05)');

        // Mood area
        const moodArea = d3.area()
            .x(d => x(d.date))
            .y0(height)
            .y1(d => y(d.mood || 0))
            .curve(d3.curveMonotoneX);

        g.append('path')
            .datum(data.filter(d => d.mood))
            .attr('fill', 'rgba(99, 102, 241, 0.15)')
            .attr('d', moodArea);

        // Mood line
        const moodLine = d3.line()
            .x(d => x(d.date))
            .y(d => y(d.mood || 0))
            .curve(d3.curveMonotoneX);

        g.append('path')
            .datum(data.filter(d => d.mood))
            .attr('fill', 'none')
            .attr('stroke', '#6366f1')
            .attr('stroke-width', 2.5)
            .attr('d', moodLine);

        // Energy line
        const energyLine = d3.line()
            .x(d => x(d.date))
            .y(d => y(d.energy || 0))
            .curve(d3.curveMonotoneX);

        g.append('path')
            .datum(data.filter(d => d.energy))
            .attr('fill', 'none')
            .attr('stroke', '#10b981')
            .attr('stroke-width', 2.5)
            .attr('stroke-dasharray', '6,3')
            .attr('d', energyLine);

        // Mood dots
        g.selectAll('.mood-dot')
            .data(data.filter(d => d.mood))
            .join('circle')
            .attr('cx', d => x(d.date))
            .attr('cy', d => y(d.mood))
            .attr('r', 3)
            .attr('fill', '#6366f1');

        // Axes
        g.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x).ticks(8).tickFormat(d3.timeFormat('%b %d')))
            .selectAll('text').attr('fill', 'var(--text-tertiary)').attr('font-size', '10px');

        g.append('g')
            .call(d3.axisLeft(y).ticks(5))
            .selectAll('text').attr('fill', 'var(--text-tertiary)').attr('font-size', '10px');

        g.selectAll('.domain, .tick line').attr('stroke', 'rgba(255,255,255,0.1)');

        // Legend
        const legend = svg.append('g').attr('transform', `translate(${margin.left + 10}, 10)`);
        legend.append('line').attr('x1', 0).attr('x2', 20).attr('y1', 5).attr('y2', 5).attr('stroke', '#6366f1').attr('stroke-width', 2.5);
        legend.append('text').attr('x', 25).attr('y', 9).text('Mood').attr('fill', 'var(--text-secondary)').attr('font-size', '11px');
        legend.append('line').attr('x1', 80).attr('x2', 100).attr('y1', 5).attr('y2', 5).attr('stroke', '#10b981').attr('stroke-width', 2.5).attr('stroke-dasharray', '6,3');
        legend.append('text').attr('x', 105).attr('y', 9).text('Energy').attr('fill', 'var(--text-secondary)').attr('font-size', '11px');

    }, [moodData]);

    // Life Areas stacked area chart
    const renderAreasChart = useCallback(() => {
        if (!areasRef.current || !areasData?.data?.length) return;

        const svg = d3.select(areasRef.current);
        svg.selectAll('*').remove();

        const margin = { top: 20, right: 120, bottom: 40, left: 40 };
        const width = areasRef.current.clientWidth - margin.left - margin.right;
        const height = 350 - margin.top - margin.bottom;

        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const areas = areasData.areas || [];
        const data = areasData.data.map(d => ({ ...d, date: new Date(d.date) }));

        const areaColors = {
            health: '#10b981', career: '#6366f1', finances: '#f59e0b',
            relationships: '#ec4899', learning: '#0ea5e9', creativity: '#8b5cf6',
            spirituality: '#14b8a6',
        };

        const x = d3.scaleTime()
            .domain(d3.extent(data, d => d.date))
            .range([0, width]);

        const y = d3.scaleLinear().domain([0, 10]).range([height, 0]);

        // Draw a line for each area
        areas.forEach(area => {
            const lineData = data.filter(d => d[area] !== undefined);
            if (lineData.length === 0) return;

            const line = d3.line()
                .x(d => x(d.date))
                .y(d => y(d[area] || 0))
                .curve(d3.curveMonotoneX);

            g.append('path')
                .datum(lineData)
                .attr('fill', 'none')
                .attr('stroke', areaColors[area] || '#888')
                .attr('stroke-width', 2)
                .attr('d', line);
        });

        // Axes
        g.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x).ticks(8).tickFormat(d3.timeFormat('%b %d')))
            .selectAll('text').attr('fill', 'var(--text-tertiary)').attr('font-size', '10px');

        g.append('g')
            .call(d3.axisLeft(y).ticks(5))
            .selectAll('text').attr('fill', 'var(--text-tertiary)').attr('font-size', '10px');

        g.selectAll('.domain, .tick line').attr('stroke', 'rgba(255,255,255,0.1)');

        // Legend
        const legend = svg.append('g').attr('transform', `translate(${margin.left + width + 10}, ${margin.top})`);
        areas.forEach((area, i) => {
            const lg = legend.append('g').attr('transform', `translate(0, ${i * 20})`);
            lg.append('rect').attr('width', 12).attr('height', 12).attr('rx', 3).attr('fill', areaColors[area] || '#888');
            lg.append('text').attr('x', 18).attr('y', 10).text(area).attr('fill', 'var(--text-secondary)').attr('font-size', '11px').attr('text-transform', 'capitalize');
        });

    }, [areasData]);

    // Activity heatmap
    const renderHeatmap = useCallback(() => {
        if (!heatmapRef.current || !heatmapData?.data) return;

        const svg = d3.select(heatmapRef.current);
        svg.selectAll('*').remove();

        const cellSize = 14;
        const cellPad = 2;
        const margin = { top: 20, right: 20, bottom: 20, left: 40 };

        const year = heatmapData.year;
        const loggedDates = new Set(heatmapData.data.map(d => d.date));
        const moodMap = {};
        heatmapData.data.forEach(d => { moodMap[d.date] = d.mood; });

        // Generate all dates in the year
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31);
        const allDays = [];
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            allDays.push(new Date(d));
        }

        const width = 53 * (cellSize + cellPad) + margin.left + margin.right;
        const height = 7 * (cellSize + cellPad) + margin.top + margin.bottom;

        svg.attr('viewBox', `0 0 ${width} ${height}`);

        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        // Day labels
        const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
        dayLabels.forEach((label, i) => {
            if (label) {
                g.append('text')
                    .attr('x', -5)
                    .attr('y', i * (cellSize + cellPad) + cellSize - 2)
                    .text(label)
                    .attr('fill', 'var(--text-tertiary)')
                    .attr('font-size', '9px')
                    .attr('text-anchor', 'end');
            }
        });

        // Cells
        const colorScale = d3.scaleSequential(d3.interpolateRgbBasis(['#1a1a2e', '#312e81', '#6366f1', '#818cf8']))
            .domain([0, 10]);

        g.selectAll('rect.day')
            .data(allDays)
            .join('rect')
            .attr('class', 'day')
            .attr('width', cellSize)
            .attr('height', cellSize)
            .attr('rx', 2)
            .attr('x', d => {
                const week = d3.timeWeek.count(d3.timeYear(d), d);
                return week * (cellSize + cellPad);
            })
            .attr('y', d => d.getDay() * (cellSize + cellPad))
            .attr('fill', d => {
                const key = d.toISOString().slice(0, 10);
                if (!loggedDates.has(key)) return 'rgba(255,255,255,0.03)';
                const mood = moodMap[key];
                return mood ? colorScale(mood) : 'rgba(99, 102, 241, 0.3)';
            })
            .attr('stroke', 'rgba(255,255,255,0.02)');

        // Month labels
        const months = d3.timeMonths(startDate, endDate);
        months.forEach(m => {
            const week = d3.timeWeek.count(d3.timeYear(m), m);
            g.append('text')
                .attr('x', week * (cellSize + cellPad))
                .attr('y', -5)
                .text(d3.timeFormat('%b')(m))
                .attr('fill', 'var(--text-tertiary)')
                .attr('font-size', '10px');
        });

    }, [heatmapData]);

    useEffect(() => {
        if (activeTab === 'mood') renderMoodChart();
        if (activeTab === 'areas') renderAreasChart();
        if (activeTab === 'heatmap') renderHeatmap();
    }, [activeTab, renderMoodChart, renderAreasChart, renderHeatmap]);

    return (
        <div>
            <div className="page-header">
                <h1>Advanced Visualizations</h1>
            </div>

            <div className="page-content">
                <div className="viz-tabs">
                    <button className={`viz-tab ${activeTab === 'mood' ? 'active' : ''}`} onClick={() => setActiveTab('mood')}>
                        Mood & Energy
                    </button>
                    <button className={`viz-tab ${activeTab === 'areas' ? 'active' : ''}`} onClick={() => setActiveTab('areas')}>
                        Life Areas History
                    </button>
                    <button className={`viz-tab ${activeTab === 'heatmap' ? 'active' : ''}`} onClick={() => setActiveTab('heatmap')}>
                        Activity Heatmap
                    </button>
                </div>

                {loading ? (
                    <div className="empty-state"><div className="loading-dots"><span></span><span></span><span></span></div></div>
                ) : (
                    <div className="viz-content">
                        <div className="card" style={{ display: activeTab === 'mood' ? 'block' : 'none' }}>
                            <h3 style={{ marginBottom: 'var(--space-md)' }}>Mood & Energy Over Time</h3>
                            {moodData?.data?.length > 0 ? (
                                <svg ref={moodRef} width="100%" height="350" />
                            ) : (
                                <div className="empty-state"><p>No mood/energy data available.</p></div>
                            )}
                        </div>

                        <div className="card" style={{ display: activeTab === 'areas' ? 'block' : 'none' }}>
                            <h3 style={{ marginBottom: 'var(--space-md)' }}>Life Areas Score Trends</h3>
                            {areasData?.data?.length > 0 ? (
                                <svg ref={areasRef} width="100%" height="350" />
                            ) : (
                                <div className="empty-state"><p>No life area data available.</p></div>
                            )}
                        </div>

                        <div className="card" style={{ display: activeTab === 'heatmap' ? 'block' : 'none' }}>
                            <h3 style={{ marginBottom: 'var(--space-md)' }}>Activity Heatmap {heatmapData?.year}</h3>
                            {heatmapData?.data?.length > 0 ? (
                                <svg ref={heatmapRef} width="100%" height="140" />
                            ) : (
                                <div className="empty-state"><p>No activity data for this year.</p></div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
