import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './router'
import { AuthProvider } from './hooks/useAuth'
import { AuthGate } from './AuthGate'
import CostBotWidget from './components/costbot/CostBotWidget'
import GlobalDialogProvider from './components/base/GlobalDialogProvider'

function App() {
  return (
    <AuthProvider>
      <GlobalDialogProvider />
      <BrowserRouter basename={__BASE_PATH__}>
        <AuthGate>
          <AppRoutes />
          <CostBotWidget />
        </AuthGate>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App
