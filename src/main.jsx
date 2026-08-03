import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx';
import { BrowserRouter } from "react-router-dom";
import { AuthContextProvider } from "./AuthContext";
import './App.scss';
import './pages.scss';
import { PriceContextProvider } from './PriceContext.jsx';
import { CurrencyProvider } from './CurrencyContext';


createRoot(document.getElementById('root')).render(
  <StrictMode>
  <AuthContextProvider>
    <PriceContextProvider>
      <BrowserRouter>
      <CurrencyProvider>
        <App />
      </CurrencyProvider>
      </BrowserRouter>
    </PriceContextProvider>
  </AuthContextProvider>
  </StrictMode>,
)
