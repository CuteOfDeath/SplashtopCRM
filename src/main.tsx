import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// import CsvImportForm from './CsvImportForm'
import Routing from './router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Routing/>
  </StrictMode>,
)
