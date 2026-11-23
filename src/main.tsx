import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfirmationProvider } from './ui/ConfirmationProvider'
import { brand } from './app/brand'
import { App } from './app/App'
import './ui/solayana.css'
import './canvas/CanvasWorkspace.css'
import './app/kirayana.css'
document.title = brand.name
createRoot(document.getElementById('root')!).render(<BrowserRouter><ConfirmationProvider><App /></ConfirmationProvider></BrowserRouter>)
