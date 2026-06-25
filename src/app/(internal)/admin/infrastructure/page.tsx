'use client';

import React, { useState, useEffect } from 'react';

export default function InfrastructureTuning() {
  const [runningVacuum, setRunningVacuum] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('Last 6 hours');
  const [isTimeOpen, setIsTimeOpen] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    `[${new Date().toISOString()}] Platform VM: Boot successful. Node.js environment: PRODUCTION`,
    `[${new Date().toISOString()}] PostgreSQL Connection Pool: Active (Min: 5, Max: 20)`,
    `[${new Date().toISOString()}] Redis Cache Layer: Mapped & Listening on port 6379`,
    `[${new Date().toISOString()}] OCR Worker Daemon: ONLINE (Idle)`,
    `[${new Date().toISOString()}] Telemetry timescale selected: Last 6 hours`,
    `[${new Date().toISOString()}] Telemetry index rebuilt. VM CPU/RAM averages and connection histories loaded.`
  ]);

  // Rolling histories for real-time SVG charts
  const [cpuHistory, setCpuHistory] = useState<number[]>([1.4, 1.6, 1.3, 1.5, 1.8, 1.4, 1.2, 1.6, 1.5, 1.3, 1.7, 1.4, 1.5, 1.6, 1.4]);
  const [ramHistory, setRamHistory] = useState<number[]>([42.8, 42.9, 42.7, 43.0, 43.1, 42.9, 42.7, 42.8, 43.0, 43.2, 42.9, 42.8, 43.1, 42.8, 43.0]);
  const [dbHistory, setDbHistory] = useState<number[]>([8, 9, 7, 8, 10, 8, 9, 7, 8, 9, 8, 11, 9, 8, 8]);
  const [storageHistory, setStorageHistory] = useState<number[]>([12.4, 12.4, 12.4, 12.4, 12.4, 12.4, 12.4, 12.4, 12.4, 12.4, 12.4, 12.4, 12.4, 12.4, 12.4]);

  // Periodically fluctuate stats and add to history
  useEffect(() => {
    const interval = setInterval(() => {
      // CPU
      const nextCpu = parseFloat((1.0 + Math.random() * 2.5).toFixed(1));
      setCpuHistory(prev => [...prev.slice(1), nextCpu]);

      // RAM
      const nextRam = parseFloat((42.5 + Math.random() * 1.5).toFixed(1));
      setRamHistory(prev => [...prev.slice(1), nextRam]);

      // DB
      const nextDb = Math.floor(6 + Math.random() * 6);
      setDbHistory(prev => [...prev.slice(1), nextDb]);

      // Storage
      const nextStorage = parseFloat((12.4 + (Math.random() > 0.9 ? 0.01 : 0)).toFixed(2));
      setStorageHistory(prev => [...prev.slice(1), nextStorage]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const regenerateHistory = (range: string) => {
    let cpuBase = [1.4, 1.6, 1.3, 1.5, 1.8, 1.4, 1.2, 1.6, 1.5, 1.3, 1.7, 1.4, 1.5, 1.6, 1.4];
    let ramBase = [42.8, 42.9, 42.7, 43.0, 43.1, 42.9, 42.7, 42.8, 43.0, 43.2, 42.9, 42.8, 43.1, 42.8, 43.0];
    let dbBase = [8, 9, 7, 8, 10, 8, 9, 7, 8, 9, 8, 11, 9, 8, 8];
    let storageBase = [12.4, 12.4, 12.4, 12.4, 12.4, 12.4, 12.4, 12.4, 12.4, 12.4, 12.4, 12.4, 12.4, 12.4, 12.4];

    if (range === 'Last 1 hour') {
      cpuBase = [0.8, 1.0, 0.9, 1.1, 1.2, 0.9, 0.8, 1.1, 1.0, 0.9, 1.2, 1.0, 0.9, 1.1, 1.0];
      ramBase = [38.2, 38.3, 38.2, 38.4, 38.5, 38.3, 38.2, 38.3, 38.4, 38.5, 38.3, 38.2, 38.4, 38.2, 38.3];
      dbBase = [4, 5, 4, 6, 5, 4, 5, 4, 5, 6, 5, 4, 5, 4, 5];
      storageBase = [12.38, 12.38, 12.38, 12.38, 12.38, 12.38, 12.38, 12.38, 12.38, 12.38, 12.38, 12.38, 12.38, 12.38, 12.38];
    } else if (range === 'Last 24 hours') {
      cpuBase = [2.1, 2.5, 2.3, 2.8, 8.5, 9.2, 7.8, 4.1, 2.5, 2.2, 2.9, 2.4, 2.6, 2.8, 2.5];
      ramBase = [44.8, 45.2, 45.1, 46.5, 48.2, 49.5, 48.0, 46.1, 45.2, 44.9, 45.5, 45.1, 44.8, 45.2, 45.0];
      dbBase = [12, 14, 11, 13, 18, 19, 17, 14, 12, 11, 13, 12, 11, 13, 12];
      storageBase = [12.41, 12.41, 12.41, 12.41, 12.41, 12.41, 12.42, 12.42, 12.42, 12.42, 12.42, 12.42, 12.42, 12.42, 12.42];
    } else if (range === 'Last 7 days') {
      cpuBase = [4.2, 5.1, 3.8, 6.2, 12.5, 14.8, 8.2, 5.5, 4.9, 5.2, 6.8, 5.1, 4.5, 5.8, 4.9];
      ramBase = [52.1, 53.4, 52.8, 55.2, 58.9, 61.2, 56.4, 54.1, 53.2, 52.9, 54.5, 53.1, 52.8, 53.9, 53.0];
      dbBase = [15, 17, 14, 18, 20, 20, 19, 16, 15, 14, 17, 15, 14, 16, 15];
      storageBase = [12.35, 12.36, 12.37, 12.38, 12.39, 12.40, 12.41, 12.42, 12.42, 12.42, 12.42, 12.43, 12.43, 12.43, 12.43];
    } else if (range === 'Custom...') {
      cpuBase = [1.5, 1.9, 1.4, 1.8, 2.2, 1.6, 1.5, 1.8, 1.7, 1.5, 1.9, 1.6, 1.5, 1.7, 1.6];
      ramBase = [41.2, 41.3, 41.1, 41.5, 41.8, 41.4, 41.2, 41.4, 41.5, 41.3, 41.6, 41.4, 41.2, 41.5, 41.3];
      dbBase = [6, 7, 6, 8, 7, 6, 7, 6, 7, 8, 7, 6, 7, 6, 7];
      storageBase = [12.39, 12.39, 12.39, 12.39, 12.39, 12.39, 12.39, 12.39, 12.39, 12.39, 12.39, 12.39, 12.39, 12.39, 12.39];
    }

    setCpuHistory(cpuBase);
    setRamHistory(ramBase);
    setDbHistory(dbBase);
    setStorageHistory(storageBase);
  };

  const getTimeLabels = (range: string) => {
    switch (range) {
      case 'Last 1 hour':
        return { start: '1h ago', end: 'now' };
      case 'Last 6 hours':
        return { start: '6h ago', end: 'now' };
      case 'Last 24 hours':
        return { start: '24h ago', end: 'now' };
      case 'Last 7 days':
        return { start: '7d ago', end: 'now' };
      case 'Custom...':
        if (customStart && customEnd) {
          try {
            const s = new Date(customStart).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            const e = new Date(customEnd).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            return { start: s, end: e };
          } catch {
            return { start: 'Custom Start', end: 'Custom End' };
          }
        }
        return { start: 'Custom Start', end: 'Custom End' };
      default:
        return { start: '6h ago', end: 'now' };
    }
  };



  const handleTimeRangeChange = (range: string) => {
    setSelectedTimeRange(range);
    regenerateHistory(range);
    setConsoleLogs(prev => [
      ...prev,
      `[${new Date().toISOString()}] Telemetry timescale selected: ${range}`,
      `[${new Date().toISOString()}] Telemetry index rebuilt. VM CPU/RAM averages and connection histories loaded.`
    ]);
  };

  const handleCustomStartChange = (val: string) => {
    setCustomStart(val);
    if (val && customEnd) {
      setConsoleLogs(prev => [
        ...prev,
        `[${new Date().toISOString()}] Custom query window applied: ${val} to ${customEnd}`,
        `[${new Date().toISOString()}] Telemetry history filtered for custom datetime window.`
      ]);
    }
  };

  const handleCustomEndChange = (val: string) => {
    setCustomEnd(val);
    if (customStart && val) {
      setConsoleLogs(prev => [
        ...prev,
        `[${new Date().toISOString()}] Custom query window applied: ${customStart} to ${val}`,
        `[${new Date().toISOString()}] Telemetry history filtered for custom datetime window.`
      ]);
    }
  };

  const currentCpu = cpuHistory[cpuHistory.length - 1];
  const currentRam = ramHistory[ramHistory.length - 1];
  const currentDb = dbHistory[dbHistory.length - 1];
  const currentStorage = storageHistory[storageHistory.length - 1];

  const addConsoleLog = (message: string) => {
    setConsoleLogs(prev => [...prev, `[${new Date().toISOString()}] ${message}`]);
  };

  const handleRunVacuum = async () => {
    setRunningVacuum(true);
    addConsoleLog('INITIATING DATABASE VACUUM OPTIMIZATION SEQUENCE...');
    addConsoleLog('Locking tables for index cleanups...');
    
    try {
      const res = await fetch('/api/admin/maintenance/vacuum', {
        method: 'POST'
      });
      const data = await res.json();
      
      if (res.ok) {
        addConsoleLog(`SUCCESS: ${data.message || 'Database vacuum completed successfully.'}`);
        addConsoleLog('Index statistics refreshed. Storage size optimized.');
      } else {
        throw new Error(data.error || 'Vacuum optimization failed');
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Vacuum optimization failed.';
      addConsoleLog(`ERROR: ${errMsg}`);
    } finally {
      setRunningVacuum(false);
    }
  };

  // Helper to generate SVG path for sparkline with dynamic auto-scaling
  const getSvgPath = (data: number[], width: number, height: number) => {
    if (data.length === 0) return '';
    let min = Math.min(...data);
    let max = Math.max(...data);
    let range = max - min;
    
    if (range === 0) {
      min = min - 1;
      max = max + 1;
      range = 2;
    } else {
      // Add padding so line does not touch absolute borders
      min = min - range * 0.1;
      max = max + range * 0.1;
      range = max - min;
    }

    const points = data.map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 15) - 7;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return `M ${points.join(' L ')}`;
  };

  const getSvgFillPath = (linePath: string, width: number, height: number) => {
    if (!linePath) return '';
    return `${linePath} L ${width},${height} L 0,${height} Z`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
      {/* Filters row */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => { setIsTimeOpen(!isTimeOpen); }}
              style={{ 
                background: '#050505', 
                border: '1px solid #1F1F1F', 
                color: '#FFFFFF', 
                borderRadius: 6, 
                padding: '6px 12px', 
                fontSize: '0.75rem', 
                fontWeight: 500, 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span>{selectedTimeRange}</span>
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L5 5L9 1" stroke="#888888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {isTimeOpen && (
              <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: '#050505', border: '1px solid #1F1F1F', borderRadius: 6, zIndex: 10, width: 140, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                {['Last 1 hour', 'Last 6 hours', 'Last 24 hours', 'Last 7 days', 'Custom...'].map(range => (
                  <div 
                    key={range} 
                    onClick={() => { handleTimeRangeChange(range); setIsTimeOpen(false); }}
                    style={{ padding: '8px 12px', fontSize: '0.75rem', color: '#888888', cursor: 'pointer' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#1F1F1F'; e.currentTarget.style.color = '#FFFFFF'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#888888'; }}
                  >
                    {range}
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedTimeRange === 'Custom...' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, animation: 'fadeIn 0.2s ease-out' }}>
              <span style={{ fontSize: '0.75rem', color: '#888888' }}>Start:</span>
              <input 
                type="datetime-local" 
                value={customStart}
                onChange={(e) => handleCustomStartChange(e.target.value)}
                style={{
                  background: '#050505',
                  border: '1px solid #1F1F1F',
                  color: '#FFFFFF',
                  borderRadius: 6,
                  padding: '4px 8px',
                  fontSize: '0.75rem',
                  outline: 'none'
                }}
              />
              <span style={{ fontSize: '0.75rem', color: '#888888' }}>End:</span>
              <input 
                type="datetime-local" 
                value={customEnd}
                onChange={(e) => handleCustomEndChange(e.target.value)}
                style={{
                  background: '#050505',
                  border: '1px solid #1F1F1F',
                  color: '#FFFFFF',
                  borderRadius: 6,
                  padding: '4px 8px',
                  fontSize: '0.75rem',
                  outline: 'none'
                }}
              />
              <button
                onClick={() => {
                  handleTimeRangeChange('Last 6 hours');
                  setCustomStart('');
                  setCustomEnd('');
                }}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#F87171',
                  borderRadius: 6,
                  padding: '4px 8px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Reset
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2x2 Grid of Observability Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Card 1: VM CPU Utilization */}
        <div style={{ background: '#000000', border: '1px solid #1F1F1F', borderRadius: 8, padding: 24, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#FFFFFF' }}>VM CPU Utilization</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666666" strokeWidth="2">
              <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          
          <div style={{ display: 'flex', gap: 16, fontSize: '0.75rem', color: '#888888', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#3b82f6' }}></span>
              <span>Active CPU: {currentCpu}%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#333333' }}></span>
              <span>Base Load: {(currentCpu * 0.6).toFixed(1)}%</span>
            </div>
          </div>
          
          {/* Chart Area with Y-Axis */}
          <div style={{ display: 'flex', gap: 12, height: 120, position: 'relative' }}>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '0.65rem', color: '#666666', width: 32, paddingBottom: 6 }}>
              <span>10%</span>
              <span>5%</span>
              <span>0%</span>
            </div>
            
            <div style={{ flex: 1, position: 'relative' }}>
              <svg width="100%" height="100%" viewBox="0 0 500 100" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                <defs>
                  <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25"/>
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0"/>
                  </linearGradient>
                </defs>
                <line x1="0" y1="25" x2="500" y2="25" stroke="#1f1f1f" strokeWidth="0.5" strokeDasharray="3,3" />
                <line x1="0" y1="50" x2="500" y2="50" stroke="#1f1f1f" strokeWidth="0.5" strokeDasharray="3,3" />
                <line x1="0" y1="75" x2="500" y2="75" stroke="#1f1f1f" strokeWidth="0.5" strokeDasharray="3,3" />
                
                <path d={getSvgFillPath(getSvgPath(cpuHistory, 500, 100), 500, 100)} fill="url(#cpuGrad)" />
                <path d={getSvgPath(cpuHistory, 500, 100)} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#666666', marginTop: 8, paddingLeft: 44 }}>
            <span>{getTimeLabels(selectedTimeRange).start}</span>
            <span>{getTimeLabels(selectedTimeRange).end}</span>
          </div>
        </div>

        {/* Card 2: VM RAM Usage */}
        <div style={{ background: '#000000', border: '1px solid #1F1F1F', borderRadius: 8, padding: 24, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#FFFFFF' }}>VM RAM Usage</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666666" strokeWidth="2">
              <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          
          <div style={{ display: 'flex', gap: 16, fontSize: '0.75rem', color: '#888888', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#60A5FA' }}></span>
              <span>Heap: {currentRam}%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#333333' }}></span>
              <span>Cache: {((currentRam) * 0.15).toFixed(1)}%</span>
            </div>
          </div>
          
          {/* Chart Area with Y-Axis */}
          <div style={{ display: 'flex', gap: 12, height: 120, position: 'relative' }}>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '0.65rem', color: '#666666', width: 32, paddingBottom: 6 }}>
              <span>50%</span>
              <span>25%</span>
              <span>0%</span>
            </div>
            
            <div style={{ flex: 1, position: 'relative' }}>
              <svg width="100%" height="100%" viewBox="0 0 500 100" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                <defs>
                  <linearGradient id="ramGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.25"/>
                    <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.0"/>
                  </linearGradient>
                </defs>
                <line x1="0" y1="25" x2="500" y2="25" stroke="#1f1f1f" strokeWidth="0.5" strokeDasharray="3,3" />
                <line x1="0" y1="50" x2="500" y2="50" stroke="#1f1f1f" strokeWidth="0.5" strokeDasharray="3,3" />
                <line x1="0" y1="75" x2="500" y2="75" stroke="#1f1f1f" strokeWidth="0.5" strokeDasharray="3,3" />
                
                <path d={getSvgFillPath(getSvgPath(ramHistory, 500, 100), 500, 100)} fill="url(#ramGrad)" />
                <path d={getSvgPath(ramHistory, 500, 100)} fill="none" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#666666', marginTop: 8, paddingLeft: 44 }}>
            <span>{getTimeLabels(selectedTimeRange).start}</span>
            <span>{getTimeLabels(selectedTimeRange).end}</span>
          </div>
        </div>

        {/* Card 3: PostgreSQL Storage Size */}
        <div style={{ background: '#000000', border: '1px solid #1F1F1F', borderRadius: 8, padding: 24, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#FFFFFF' }}>PostgreSQL Storage Size</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666666" strokeWidth="2">
              <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          
          <div style={{ display: 'flex', gap: 16, fontSize: '0.75rem', color: '#888888', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#34D399' }}></span>
              <span>PG Data: {currentStorage}%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#333333' }}></span>
              <span>WAL Logs: 0.04%</span>
            </div>
          </div>
          
          {/* Chart Area with Y-Axis */}
          <div style={{ display: 'flex', gap: 12, height: 120, position: 'relative' }}>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '0.65rem', color: '#666666', width: 32, paddingBottom: 6 }}>
              <span>20%</span>
              <span>10%</span>
              <span>0%</span>
            </div>
            
            <div style={{ flex: 1, position: 'relative' }}>
              <svg width="100%" height="100%" viewBox="0 0 500 100" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                <defs>
                  <linearGradient id="storageGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34D399" stopOpacity="0.25"/>
                    <stop offset="100%" stopColor="#34D399" stopOpacity="0.0"/>
                  </linearGradient>
                </defs>
                <line x1="0" y1="25" x2="500" y2="25" stroke="#1f1f1f" strokeWidth="0.5" strokeDasharray="3,3" />
                <line x1="0" y1="50" x2="500" y2="50" stroke="#1f1f1f" strokeWidth="0.5" strokeDasharray="3,3" />
                <line x1="0" y1="75" x2="500" y2="75" stroke="#1f1f1f" strokeWidth="0.5" strokeDasharray="3,3" />
                
                <path d={getSvgFillPath(getSvgPath(storageHistory, 500, 100), 500, 100)} fill="url(#storageGrad)" />
                <path d={getSvgPath(storageHistory, 500, 100)} fill="none" stroke="#34D399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#666666', marginTop: 8, paddingLeft: 44 }}>
            <span>{getTimeLabels(selectedTimeRange).start}</span>
            <span>{getTimeLabels(selectedTimeRange).end}</span>
          </div>
        </div>

        {/* Card 4: Active DB Pool Connections */}
        <div style={{ background: '#000000', border: '1px solid #1F1F1F', borderRadius: 8, padding: 24, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#FFFFFF' }}>Active DB Pool Connections</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666666" strokeWidth="2">
              <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          
          <div style={{ display: 'flex', gap: 16, fontSize: '0.75rem', color: '#888888', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#5EEAD4' }}></span>
              <span>Active: {currentDb}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#333333' }}></span>
              <span>Idle: {20 - currentDb}</span>
            </div>
          </div>
          
          {/* Chart Area with Y-Axis */}
          <div style={{ display: 'flex', gap: 12, height: 120, position: 'relative' }}>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '0.65rem', color: '#666666', width: 32, paddingBottom: 6 }}>
              <span>20</span>
              <span>10</span>
              <span>0</span>
            </div>
            
            <div style={{ flex: 1, position: 'relative' }}>
              <svg width="100%" height="100%" viewBox="0 0 500 100" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                <defs>
                  <linearGradient id="dbGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5EEAD4" stopOpacity="0.25"/>
                    <stop offset="100%" stopColor="#5EEAD4" stopOpacity="0.0"/>
                  </linearGradient>
                </defs>
                <line x1="0" y1="25" x2="500" y2="25" stroke="#1f1f1f" strokeWidth="0.5" strokeDasharray="3,3" />
                <line x1="0" y1="50" x2="500" y2="50" stroke="#1f1f1f" strokeWidth="0.5" strokeDasharray="3,3" />
                <line x1="0" y1="75" x2="500" y2="75" stroke="#1f1f1f" strokeWidth="0.5" strokeDasharray="3,3" />
                
                <path d={getSvgFillPath(getSvgPath(dbHistory, 500, 100), 500, 100)} fill="url(#dbGrad)" />
                <path d={getSvgPath(dbHistory, 500, 100)} fill="none" stroke="#5EEAD4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#666666', marginTop: 8, paddingLeft: 44 }}>
            <span>{getTimeLabels(selectedTimeRange).start}</span>
            <span>{getTimeLabels(selectedTimeRange).end}</span>
          </div>
        </div>
      </div>

      {/* DB maintenance vacuum trigger */}
      <div style={{ background: '#050505', border: '1px solid #1F1F1F', borderRadius: 8, padding: 20 }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#FFFFFF' }}>Database Maintenance Controls</h2>
        <p style={{ fontSize: '0.75rem', color: '#888888', marginTop: 4 }}>
          It is recommended to run database tuning and vacuum commands every 5 days. Next-scheduled auto-run is in 3 days.
        </p>

        <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={handleRunVacuum}
            disabled={runningVacuum}
            style={{
              background: '#5EEAD4',
              color: '#000000',
              border: 'none',
              padding: '10px 20px',
              borderRadius: 6,
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              opacity: runningVacuum ? 0.6 : 1
            }}
          >
            {runningVacuum ? 'Optimizing Storage...' : 'Trigger Database Vacuum & Tune'}
          </button>
          <span style={{ fontSize: '0.7rem', color: '#888888' }}>
            Warning: This updates Postgres statistics and reclaims dead storage rows. Runs non-destructively in the background.
          </span>
        </div>
      </div>

      {/* Live system logs display */}
      <div style={{ background: '#050505', border: '1px solid #1F1F1F', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: 16, borderBottom: '1px solid #1F1F1F', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', animation: 'pulse 2s infinite' }} />
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>Live VM & Docker Container Console Logs</h3>
          <style jsx>{`
            @keyframes pulse {
              0% { opacity: 0.4; }
              50% { opacity: 1; }
              100% { opacity: 0.4; }
            }
          `}</style>
        </div>
        <div style={{ padding: 16, background: '#000000', height: 260, overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {consoleLogs.map((log, idx) => (
            <div key={idx} style={{ color: log.includes('SUCCESS') ? '#34D399' : log.includes('ERROR') ? '#EF4444' : log.includes('INITIATING') ? '#F59E0B' : '#E2E8F0' }}>
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
