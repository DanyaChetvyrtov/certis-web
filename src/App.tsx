import { AppRouter } from './app/AppRouter'
import { SessionProvider } from './features/auth/session/SessionContext'

function App() {
  return (
    <SessionProvider>
      <AppRouter />
    </SessionProvider>
  )
}

export default App
