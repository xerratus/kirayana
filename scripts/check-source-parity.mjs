import fs from 'node:fs'
import assert from 'node:assert/strict'
const source = '../solayana/apps/web/src/'
for (const file of ['canvasCamera.ts', 'canvasDepth.ts', 'canvasInspector.ts', 'CanvasWorkspace.css', 'canvasDetailListFilter.ts', 'CanvasSkillsDetails.tsx']) assert.equal(fs.readFileSync(`src/canvas/${file}`, 'utf8'), fs.readFileSync(source + file, 'utf8'), file)
assert.equal(fs.readFileSync('src/ui/solayana.css','utf8'),fs.readFileSync(source+'style.css','utf8'))
assert.equal(fs.readFileSync('src/ui/Controls.tsx','utf8'),fs.readFileSync(source+'ui/Controls.tsx','utf8'))
// Organizer deletion extends panel controls; source placement/drag geometry stays exact.
const detailSource = fs.readFileSync(source+'CanvasDetailWindow.tsx','utf8')
const detailLocal = fs.readFileSync('src/canvas/CanvasDetailWindow.tsx','utf8')
const geometry = value => value.slice(value.indexOf('  const windowRef ='), value.indexOf('  return <>'))
assert.equal(geometry(detailLocal), geometry(detailSource))
const workspace = fs.readFileSync(source+'CanvasWorkspace.tsx','utf8')
const start=workspace.indexOf('function shapeVertices'),end=workspace.indexOf('\nexport function CanvasWorkspace',start)
const drawing=fs.readFileSync('src/canvas/drawing.ts','utf8').replaceAll('export function ', 'function ')
assert.ok(drawing.includes(workspace.slice(start,end)))
const flyout=fs.readFileSync(source+'CanvasRightFlyout.tsx','utf8');const a=flyout.indexOf('export function CanvasFloatingFlyoutFrame'),b=flyout.indexOf('\nfunction FlyoutContent',a)
assert.ok(fs.readFileSync('src/canvas/CanvasFloatingFlyout.tsx','utf8').includes(flyout.slice(a,b)))
for (const file of ['ConfirmDialog.tsx','ConfirmationProvider.tsx','confirmationContext.ts','confirmationPolicy.ts']) assert.equal(fs.readFileSync(`src/ui/${file}`,'utf8'),fs.readFileSync(source+`ui/${file}`,'utf8'))
console.log('Source parity passed: camera, depth, placement, canvas styles, shared controls, detail window, drawing routines, and floating frame.')

const typeahead = fs.readFileSync(source+'PromptTypeahead.tsx','utf8')
assert.ok(fs.readFileSync('src/canvas/PromptTypeahead.tsx','utf8').includes(typeahead.slice(typeahead.indexOf('export function PromptTypeahead('))))
