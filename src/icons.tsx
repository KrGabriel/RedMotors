import type {ReactNode} from 'react';
const I:Record<string,ReactNode>={
 chat:<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.5A8 8 0 1 1 21 12z"/>,
 ig:<><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6"/></>,
 pin:<><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></>,
 trash:<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>,
 star:<polygon points="12 3 14.6 9 21 9.6 16.2 13.8 17.6 20 12 16.7 6.4 20 7.8 13.8 3 9.6 9.4 9"/>,
 menu:<path d="M4 7h16M4 12h16M4 17h16"/>, x:<path d="M6 6l12 12M18 6L6 18"/>,
 left:<path d="M15 6l-6 6 6 6"/>, right:<path d="M9 6l6 6-6 6"/>};
export const Icon=({n,size=18}:{n:string;size?:number})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{I[n]}</svg>;
