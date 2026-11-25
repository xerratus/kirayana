import {expect,it} from 'vitest'
import {getTheme,orbLabelColor,themes} from './themes'
const luminance=(hex:string)=>{
 const [r,g,b]=[1,3,5].map(offset=>{const value=parseInt(hex.slice(offset,offset+2),16)/255;return value<=.04045 ? value/12.92 : ((value+.055)/1.055)**2.4})
 return .2126*r+.7152*g+.0722*b
}
const contrast=(a:string,b:string)=>{const values=[luminance(a),luminance(b)].sort((a,b)=>b-a);return (values[0]+.05)/(values[1]+.05)}
it('keeps normal text and muted labels readable in every theme',()=>{
 for(const theme of themes){
  expect(contrast(theme.palette.text,theme.palette.panel),theme.name).toBeGreaterThanOrEqual(4.5)
  expect(contrast(theme.palette.muted,theme.palette.panel),theme.name).toBeGreaterThanOrEqual(4.5)
  expect(contrast(theme.palette.text,theme.canvas.base),theme.name).toBeGreaterThanOrEqual(4.5)
 }
})
it('preserves original orb text colors and makes light-theme fan labels readable without changing stored colors',()=>{
 const color='#cfca6f'
 expect(orbLabelColor(color,getTheme('original'))).toBe(color)
 for(const theme of themes.filter(theme=>theme.mode==='light'))expect(contrast(orbLabelColor(color,theme),theme.palette.panel),theme.name).toBeGreaterThanOrEqual(4.5)
 expect(getTheme('unknown').id).toBe('original')
})
