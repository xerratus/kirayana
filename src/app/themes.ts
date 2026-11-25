export type ThemeId = 'original' | 'linen' | 'garden' | 'seaside' | 'lavender' | 'fireside'
type Palette = {bg:string;sidebar:string;panel:string;raised:string;hover:string;border:string;text:string;muted:string;subtle:string;accent:string;strong:string;accentBg:string;danger:string}
export type Theme = {id:ThemeId;name:string;description:string;mode:'light'|'dark';palette:Palette;canvas:{base:string;center:string;middle:string;dots:string;fan:string}}
export const themes:Theme[] = [
 {id:'original',name:'Midnight',description:'Deep blues for a focused evening',mode:'dark',palette:{bg:'#0c0e15',sidebar:'#10121b',panel:'#151824',raised:'#1b1f2d',hover:'#212536',border:'#292d3c',text:'#f1f2f8',muted:'#9398aa',subtle:'#656b80',accent:'#75a9ff',strong:'#478cef',accentBg:'#1b2d4a',danger:'#ff929c'},canvas:{base:'#0b1220',center:'#142a44',middle:'#0f1d31',dots:'#6d9dcb',fan:'#080b12'}},
 {id:'linen',name:'Linen',description:'Warm paper, soft ink, a quieter day',mode:'light',palette:{bg:'#f6f2e9',sidebar:'#fffcf5',panel:'#fffcf5',raised:'#f2ece0',hover:'#eee5d6',border:'#d8cebd',text:'#332f29',muted:'#706556',subtle:'#857968',accent:'#916035',strong:'#79502d',accentBg:'#eee0ca',danger:'#ae3845'},canvas:{base:'#f2eddf',center:'#fffdf7',middle:'#f7f2e7',dots:'#9b876a',fan:'#bcaa8b'}},
 {id:'garden',name:'Garden',description:'Fresh greens and room to breathe',mode:'light',palette:{bg:'#edf3ed',sidebar:'#f9fcf7',panel:'#f9fcf7',raised:'#e8f0e5',hover:'#e0ebdc',border:'#c4d3be',text:'#28392d',muted:'#596e5b',subtle:'#728270',accent:'#39704e',strong:'#2c5d3e',accentBg:'#dcebdc',danger:'#ad3c49'},canvas:{base:'#e8f0e5',center:'#fafcf6',middle:'#f0f5ea',dots:'#708d69',fan:'#9bb591'}},
 {id:'seaside',name:'Seaside',description:'Clear blue, bright and easygoing',mode:'light',palette:{bg:'#edf5f7',sidebar:'#fbfefe',panel:'#fbfefe',raised:'#e6f0f3',hover:'#dcebef',border:'#bfd3da',text:'#233b49',muted:'#55707d',subtle:'#728791',accent:'#226b8b',strong:'#185772',accentBg:'#dceef4',danger:'#ad3b51'},canvas:{base:'#e7f1f5',center:'#fcffff',middle:'#eff8fa',dots:'#6797aa',fan:'#9bbfca'}},
 {id:'lavender',name:'Lavender',description:'Soft lilac with a little imagination',mode:'light',palette:{bg:'#f2eef7',sidebar:'#fdfaff',panel:'#fdfaff',raised:'#eee7f4',hover:'#e7ddef',border:'#d1c3df',text:'#3c304c',muted:'#70607f',subtle:'#8b7c98',accent:'#775395',strong:'#62417d',accentBg:'#e9ddf3',danger:'#ab3b58'},canvas:{base:'#eee7f6',center:'#fffaff',middle:'#f7f0fc',dots:'#9a7cb3',fan:'#b5a0c9'}},
 {id:'fireside',name:'Fireside',description:'A cozy evening in warm charcoal',mode:'dark',palette:{bg:'#201b19',sidebar:'#29211e',panel:'#302723',raised:'#3a302a',hover:'#46372f',border:'#59483c',text:'#f6ecdf',muted:'#c3ac96',subtle:'#a48c79',accent:'#efb777',strong:'#bd8042',accentBg:'#503b28',danger:'#f19791'},canvas:{base:'#201b19',center:'#493324',middle:'#30251f',dots:'#c49a72',fan:'#17120f'}},
]
const preferenceKey='kirayana-theme'
export function getTheme(id:unknown):Theme {return themes.find(theme=>theme.id===id)??themes[0]}
export function readTheme():Theme {try{return getTheme(localStorage.getItem(preferenceKey))}catch{return themes[0]}}
export function applyTheme(theme:Theme) {
 const root=document.documentElement,p=theme.palette
 root.dataset.theme=theme.mode;root.dataset.kirayanaTheme=theme.id;root.style.colorScheme=theme.mode
 const tokens:Record<string,string>={bg:p.bg,sidebar:p.sidebar,panel:p.panel,'panel-2':p.raised,hover:p.hover,border:p.border,text:p.text,muted:p.muted,subtle:p.subtle,accent:p.accent,'accent-strong':p.strong,'accent-bg':p.accentBg,danger:p.danger,'nav-selected':p.hover,'nav-hover':p.raised,'ui-primary':p.strong,'ui-primary-text':theme.id==='fireside' ? p.bg : '#ffffff','ui-primary-hover':theme.id==='original' ? '#3178dc' : p.accent,'ui-danger':p.danger,'ui-border-strong':p.subtle,'ui-success':theme.mode==='light' ? '#28754b' : '#7fdfb3','ui-warning':theme.mode==='light' ? '#906013' : '#f0bc72','ui-danger-bg':theme.mode==='light' ? '#fae8e9' : '#3a202b','ui-danger-border':p.danger,'ui-danger-hover':theme.mode==='light' ? '#993345' : '#924451','ui-toggle-off':theme.id==='original' ? '#374151' : p.subtle,shadow:theme.mode==='light' ? '0 10px 35px #20265012' : '0 10px 35px #0002'}
 for(const [name,value]of Object.entries(tokens))root.style.setProperty(`--${name}`,value)
}
export function saveTheme(theme:Theme) {try{localStorage.setItem(preferenceKey,theme.id)}catch{/* Theme still works when browser preferences are unavailable. */}}
/** Preserve stored orb colors; only make small orb text legible on light surfaces. */
export function orbLabelColor(color:string,theme:Theme) {
 if(theme.mode==='dark')return color
 const ink=theme.palette.text
 return '#'+[1,3,5].map(offset=>Math.round(parseInt(color.slice(offset,offset+2),16)*.3+parseInt(ink.slice(offset,offset+2),16)*.7).toString(16).padStart(2,'0')).join('')
}
