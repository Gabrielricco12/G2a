import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'

// ESTILOS DO MANTINE (Sem isso, a tela fica quebrada)
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';

// O Tailwind já deve estar importado no seu index.css, então não mexemos lá.
import './index.css' 

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)