import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

window.addEventListener('unhandledrejection', (e) => {
  if (e.reason?.message?.includes('message channel closed')) e.preventDefault()
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
