import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './ui/motion.css'
import './ui/app-surface.css'
import { markSurface } from './ui/surface.js'
import App from './App.jsx'

// Before the first render, so a screen never paints once in the other theme.
markSurface(window.location.pathname)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
