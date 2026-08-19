import React, { useState, useEffect } from 'react'
import { checkHealth } from './api'

export type NavTab = 'analyze' | 'tumor-guide' | 'explainability' | 'documentation'

interface SidebarProps {
  activeTab: NavTab
  setActiveTab: (tab: NavTab) => void
  isDark: boolean
  setIsDark: React.Dispatch<React.SetStateAction<boolean>>
  sessionCount: number
  onOpenSessionHistory: () => void
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  isDark,
  setIsDark,
  sessionCount,
  onOpenSessionHistory,
}: SidebarProps) {
  const [brandHovered, setBrandHovered] = useState(false)
  const [brandActive, setBrandActive] = useState(false)
  const [historyHovered, setHistoryHovered] = useState(false)
  const [historyActive, setHistoryActive] = useState(false)
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    let mounted = true
    const ping = async () => {
      const res = await checkHealth()
      if (mounted) {
        setIsOnline(res !== null && res.status === 'healthy')
      }
    }
    ping()
    const interval = setInterval(ping, 10000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  const colors = {
    bg: isDark ? '#0d131f' : '#ffffff',
    border: isDark ? '#1e2a3a' : '#cbd5e1',
    textMain: isDark ? '#f1f5f9' : '#0f172a',
    textMuted: isDark ? '#94a3b8' : '#475569',
    primary: isDark ? '#00d4ff' : '#0066cc',
    activeBg: isDark ? 'rgba(0, 212, 255, 0.12)' : 'rgba(0, 102, 204, 0.1)',
    hoverBg: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
  }

  const navItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'analyze',
      label: 'Analyze Scan',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="22" y1="12" x2="18" y2="12" />
          <line x1="6" y1="12" x2="2" y2="12" />
          <line x1="12" y1="6" x2="12" y2="2" />
          <line x1="12" y1="22" x2="12" y2="18" />
        </svg>
      ),
    },
    {
      id: 'tumor-guide',
      label: 'Tumor Types',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
          <path d="M6 6h10" />
          <path d="M6 10h10" />
        </svg>
      ),
    },
    {
      id: 'explainability',
      label: 'Explainability (XAI)',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12h5l3 8 4-16 3 8h5" />
        </svg>
      ),
    },
    {
      id: 'documentation',
      label: 'Documentation & Safety',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
    },
  ]

  return (
    <aside
      style={{
        width: 260,
        minWidth: 260,
        height: '100vh',
        position: 'sticky',
        top: 0,
        background: colors.bg,
        borderRight: `1px solid ${colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '20px 14px',
        zIndex: 40,
        fontFamily: "'DM Sans', sans-serif",
        transition: 'background 0.35s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div>
        {/* Brand Home Trigger */}
        <div
          onClick={() => setActiveTab('analyze')}
          onMouseEnter={() => setBrandHovered(true)}
          onMouseLeave={() => {
            setBrandHovered(false)
            setBrandActive(false)
          }}
          onMouseDown={() => setBrandActive(true)}
          onMouseUp={() => setBrandActive(false)}
          title="Go to Analyze Scan"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px',
            borderRadius: 10,
            marginBottom: 16,
            cursor: 'pointer',
            transform: brandActive ? 'scale(0.96)' : brandHovered ? 'translateY(-1.5px)' : 'none',
            background: brandHovered ? colors.hoverBg : 'transparent',
            transition: 'transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s ease',
            userSelect: 'none',
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: isDark ? 'rgba(0, 212, 255, 0.15)' : 'rgba(0, 102, 204, 0.12)',
              border: `1.5px solid ${colors.primary}66`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: brandHovered ? `0 0 12px ${colors.primary}44` : 'none',
              transition: 'box-shadow 0.25s ease',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke={colors.primary} strokeWidth="1.4" fill="none" />
              <path
                d="M7 2.5C7 2.5 5 4.5 5 6.5C5 8 6 9 7 9C8 9 9 8 9 6.5C9 4.5 7 2.5 7 2.5Z"
                stroke={colors.primary}
                strokeWidth="1.2"
                fill={`${colors.primary}25`}
              />
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em', color: colors.textMain }}>
              BrainTumor<span style={{ color: colors.primary }}>Vision</span>
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                color: colors.textMuted,
                letterSpacing: '0.08em',
              }}
            >
              EFFICIENTNET-B0 · 99.52% ACC
            </div>
          </div>
        </div>

        {/* Api Status Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            background: isDark ? '#080c14' : '#f1f5fb',
            borderRadius: 8,
            border: `1px solid ${colors.border}`,
            marginBottom: 20,
            transition: 'background 0.3s ease, border-color 0.3s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: isOnline ? '#10b981' : '#f59e0b',
                boxShadow: isOnline ? '0 0 8px #10b981' : '0 0 8px #f59e0b',
                animation: 'pulseDot 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              }}
            />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, color: colors.textMain }}>
              {isOnline ? 'API ONLINE' : 'API OFFLINE'}
            </span>
          </div>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: colors.textMuted }}>
            {isOnline ? 'healthy' : 'offline'}
          </span>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {navItems.map((item) => {
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  padding: '11px 12px',
                  borderRadius: 8,
                  border: isActive ? `1.5px solid ${colors.primary}55` : '1.5px solid transparent',
                  background: isActive ? colors.activeBg : 'transparent',
                  color: isActive ? colors.primary : colors.textMuted,
                  cursor: 'pointer',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: 13,
                  transform: isActive ? 'translateX(3px)' : 'none',
                  boxShadow: isActive ? `0 2px 10px ${colors.primary}18` : 'none',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  textAlign: 'left',
                  outline: 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = colors.hoverBg
                    e.currentTarget.style.color = colors.textMain
                    e.currentTarget.style.transform = 'translateX(2px)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = colors.textMuted
                    e.currentTarget.style.transform = 'none'
                  }
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.97)'
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = isActive ? 'translateX(3px)' : 'none'
                }}
              >
                <span
                  style={{
                    color: isActive ? colors.primary : colors.textMuted,
                    display: 'flex',
                    transition: 'color 0.2s ease, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    transform: isActive ? 'scale(1.08)' : 'scale(1)',
                  }}
                >
                  {item.icon}
                </span>
                <span style={{ flex: 1 }}>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Footer Section */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          borderTop: `1px solid ${colors.border}`,
          paddingTop: 16,
          transition: 'border-color 0.3s ease',
        }}
      >
        {/* Session Drawer Trigger */}
        <button
          onClick={onOpenSessionHistory}
          onMouseEnter={() => setHistoryHovered(true)}
          onMouseLeave={() => {
            setHistoryHovered(false)
            setHistoryActive(false)
          }}
          onMouseDown={() => setHistoryActive(true)}
          onMouseUp={() => setHistoryActive(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            borderRadius: 8,
            border: `1.5px solid ${sessionCount > 0 ? colors.primary + '55' : colors.border}`,
            background: sessionCount > 0 ? (isDark ? '#141e2e' : '#e2eafc') : 'transparent',
            color: sessionCount > 0 ? colors.primary : colors.textMuted,
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: "'JetBrains Mono', monospace",
            transform: historyActive ? 'scale(0.97)' : historyHovered ? 'translateY(-1px)' : 'none',
            boxShadow: historyHovered && sessionCount > 0 ? `0 4px 12px ${colors.primary}22` : 'none',
            transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="8" r="6.5" />
              <polyline points="8,4.5 8,8 10.5,9.5" />
            </svg>
            <span>SESSION CACHE</span>
          </div>
          <span
            style={{
              padding: '1px 7px',
              borderRadius: 10,
              fontSize: 10,
              fontWeight: 700,
              background: sessionCount > 0 ? colors.primary : colors.border,
              color: sessionCount > 0 ? (isDark ? '#080c14' : '#ffffff') : colors.textMuted,
              transition: 'background 0.25s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
              transform: historyHovered ? 'scale(1.08)' : 'scale(1)',
            }}
          >
            {sessionCount}
          </span>
        </button>

        {/* Theme Switcher Toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '7px 12px',
            borderRadius: 8,
            background: isDark ? '#080c14' : '#f1f5fb',
            border: `1px solid ${colors.border}`,
            transition: 'background 0.3s ease, border-color 0.3s ease',
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>
            {isDark ? 'DARK THEME' : 'LIGHT THEME'}
          </span>
          <button
            onClick={() => setIsDark((prev) => !prev)}
            title="Toggle color theme"
            style={{
              width: 40,
              height: 22,
              borderRadius: 11,
              border: `1px solid ${colors.border}`,
              background: isDark ? '#1a2540' : '#cbd5e1',
              cursor: 'pointer',
              position: 'relative',
              padding: 0,
              outline: 'none',
              transition: 'background 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 2,
                left: isDark ? 20 : 2,
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: isDark ? '#00d4ff' : '#d97706',
                boxShadow: isDark ? '0 0 8px #00d4ff' : '0 0 8px rgba(217, 119, 6, 0.5)',
                transition: 'left 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.25s ease',
              }}
            />
          </button>
        </div>
      </div>
    </aside>
  )
}