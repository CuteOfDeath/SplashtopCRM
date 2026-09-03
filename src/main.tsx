import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// import CsvImportForm from './CsvImportForm'
import Dashboard from './dashboard'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Dashboard/>
    {/* <CsvImportForm/> */}
  </StrictMode>,
)
