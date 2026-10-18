import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './app/App'
import { I18nProvider } from './shared/i18n'
import './styles.css'

createRoot(document.getElementById('root')!).render(<StrictMode><I18nProvider><BrowserRouter><App /></BrowserRouter></I18nProvider></StrictMode>)
