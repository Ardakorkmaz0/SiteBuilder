import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './ui/motion.css'
import './ui/app-surface.css'
import { markSurface } from './ui/surface.js'
import { installFocusRescue } from './ui/focusRescue.js'
import App from './App.jsx'

// Before the first render, so a screen never paints once in the other theme.
markSurface(window.location.pathname)
// A control disabled while its action runs gives the keyboard back afterwards.
installFocusRescue()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
