import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import RecognitionStudio from './RecognitionStudio'

const isRecognitionStudio = window.location.pathname === '/recognition-studio'
createRoot(document.getElementById('root')!).render(
  <StrictMode>{isRecognitionStudio ? <RecognitionStudio /> : <App />}</StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(error => console.error('MeloLegacy service worker registration failed:', error))
  })
}
