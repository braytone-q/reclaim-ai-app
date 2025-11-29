import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import LandingPage from './pages/landing';
import LoginPage from './pages/login';
import RegisterPage from './pages/register';
import Dashboard from './pages/dashboard';
import Settings from './pages/Settings';
import OnboardingPage from './pages/onboarding';
import Header from './components/Header';
import { Toaster } from 'sonner';


function App() {
  return (
    <Router>
      <AuthProvider>
        <Header />
        <main>
          <Routes>
            <Route path='/' element={<LandingPage />} />
            <Route path='/login' element={<LoginPage />} />
            <Route path='/register' element={<RegisterPage />} />
            <Route path='/dashboard' element={<Dashboard />} />
            <Route path='/settings' element={<Settings />} />
            <Route path='/onboarding' element={<OnboardingPage />} />
          </Routes>
        </main>
        <Toaster richColors />
      </AuthProvider>
    </Router>
  );
}


export default App;
