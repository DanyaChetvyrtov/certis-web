import { AppRouter } from './app/AppRouter'
import { SessionProvider } from './features/auth/session/SessionProvider'
import { ThemeProvider } from './features/settings/ThemeProvider'

function App() {
  return (
    <ThemeProvider>
      <SessionProvider>
        <AppRouter />
      </SessionProvider>
    </ThemeProvider>
  )
}

export default App
