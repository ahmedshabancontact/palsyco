import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import OverviewPage from './pages/OverviewPage';
import Channels from './pages/Channels';
import Voice from './pages/Voice';
import Members from './pages/Members';
import Polls from './pages/Polls';
import Comments from './pages/Comments';
import Login from './pages/Login';
import Register from './pages/Register';
import AuthCallback from './pages/AuthCallback';
import Account from './pages/Account';
import Admin from './pages/Admin';
import Setup from './pages/Setup';
import { Privacy, Terms } from './pages/Legal';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/overview" element={<OverviewPage />} />
            <Route path="/channels" element={<Channels />} />
            <Route path="/voice" element={<Voice />} />
            <Route path="/members" element={<Members />} />
            <Route path="/polls" element={<Polls />} />
            <Route path="/comments" element={<Comments />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="/setup" element={<Setup />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
