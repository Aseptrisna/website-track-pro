import { useState, useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Lock body scroll while sidebar is open on mobile
  useEffect(() => {
    const body = document.body;
    if (sidebarOpen) {
      body.style.overflow = 'hidden';
      body.style.touchAction = 'none';
    } else {
      body.style.overflow = '';
      body.style.touchAction = '';
    }
    return () => {
      body.style.overflow = '';
      body.style.touchAction = '';
    };
  }, [sidebarOpen]);

  // ── Swipe gesture detection ──────────────────────────────────────────────
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const edgeSwipe = useRef(false);     // touch started from the left edge

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    // Swipe-to-open: only track touches that start within 24px of the left edge
    edgeSwipe.current = e.touches[0].clientX < 24 && !sidebarOpen;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    const isHorizontal = dy < 80;

    // Swipe right from left edge → open
    if (edgeSwipe.current && dx > 60 && isHorizontal) {
      setSidebarOpen(true);
    }

    // Swipe left anywhere when sidebar is open → close
    if (sidebarOpen && dx < -60 && isHorizontal) {
      setSidebarOpen(false);
    }

    edgeSwipe.current = false;
  };

  return (
    <div
      className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-900"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Overlay — always rendered, fade in/out so no jarring pop */}
      <div
        className={[
          'fixed inset-0 z-[900] bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden',
          sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      <Sidebar
        open={sidebarOpen}
        collapsed={collapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNavbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
