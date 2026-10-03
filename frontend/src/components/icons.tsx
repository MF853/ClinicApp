const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const };

export function CalendarIcon() { return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 9h18" /><path d="M8 3v4M16 3v4" /></svg>; }
export function DocumentIcon() { return <svg {...common}><path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h6" /></svg>; }
export function SwapIcon() { return <svg {...common}><path d="M3 7h15m0 0-4-4m4 4-4 4" /><path d="M21 17H6m0 0 4 4m-4-4 4-4" /></svg>; }
export function BellIcon() { return <svg {...common}><path d="M6 10a6 6 0 0 1 12 0v4l2 3H4l2-3Z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>; }
export function ShieldIcon() { return <svg {...common}><path d="M12 3 5 6v5c0 5 3 8 7 9 4-1 7-4 7-9V6Z" /></svg>; }
export function ClockIcon() { return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>; }
export function GridIcon() { return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>; }
export function PeopleIcon() { return <svg {...common}><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="2.5" /><path d="M15 14.2c2.3.4 4 2.3 4 5.8" /></svg>; }
export function GearIcon() { return <svg {...common}><circle cx="12" cy="12" r="3.2" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></svg>; }