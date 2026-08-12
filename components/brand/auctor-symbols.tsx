type SymbolName="command"|"agent"|"audit"|"portfolio"|"tasks"|"strategy"|"memory"|"notify"|"settings"|"policy"|"execution"|"research";
export function AuctorSymbol({name,className=""}:{name:SymbolName;className?:string}){return <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="square" strokeLinejoin="miter">{paths[name]}</svg>}
const paths:Record<SymbolName,React.ReactNode>={
command:<><path d="M3 6h12l6 6-6 6H3"/><path d="m8 9 3 3-3 3"/></>,
agent:<><path d="M5 19V8l7-4 7 4v11"/><path d="M8 19v-6h8v6M9 9h6"/></>,
audit:<><path d="M4 4v16h16"/><path d="m7 15 3-4 3 2 4-6"/><path d="M17 7h3v3"/></>,
portfolio:<><path d="M3 8h18v11H3zM8 8V5h8v3"/><path d="M3 12h18M10 12v3h4v-3"/></>,
tasks:<><path d="M4 6h3v3H4zM10 7h10M4 13h3v3H4zM10 14h10"/></>,
strategy:<><circle cx="6" cy="17" r="2"/><circle cx="12" cy="7" r="2"/><circle cx="19" cy="15" r="2"/><path d="m7 15 4-6m3 0 4 4M8 17h9"/></>,
memory:<><path d="M6 5h9l3 3v11H6z"/><path d="M9 5V2h9l3 3v11h-3M9 10h6M9 14h6"/></>,
notify:<><path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5zM10 20h4"/></>,
settings:<><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></>,
policy:<><path d="M4 6h16v12H4z"/><path d="M8 9h8v6H8zM12 6v3M12 15v3"/></>,
execution:<><path d="M3 12h13"/><path d="m12 7 5 5-5 5M17 7h4v10h-4"/></>,
research:<><circle cx="10" cy="10" r="6"/><path d="m14.5 14.5 5 5M7 10h6M10 7v6"/></>,
};
