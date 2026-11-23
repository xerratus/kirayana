import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './app/App'
import './ui/solayana.css'
import './canvas/CanvasWorkspace.css'
import './app/kirayana.css'
createRoot(document.getElementById('root')!).render(<BrowserRouter><App /></BrowserRouter>)
