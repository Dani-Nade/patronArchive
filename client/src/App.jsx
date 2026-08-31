import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Header from './components/layout/Header.jsx';
import ChatWidget from './components/chat/ChatWidget.jsx';
import { useAuth } from './lib/auth.jsx';
import HomePage         from './pages/HomePage.jsx';
import BuildsPage       from './pages/BuildsPage.jsx';
import CreateBuildPage  from './pages/CreateBuildPage.jsx';
import PublishPage      from './pages/PublishPage.jsx';
import BuildPage        from './pages/BuildPage.jsx';
import LoginPage        from './pages/LoginPage.jsx';
import RegisterPage     from './pages/RegisterPage.jsx';
import ProfilePage      from './pages/ProfilePage.jsx';
import UserProfilePage  from './pages/UserProfilePage.jsx';
import ForumsPage       from './pages/ForumsPage.jsx';
import ForumThreadPage  from './pages/ForumThreadPage.jsx';
import CreateThreadPage from './pages/CreateThreadPage.jsx';
import HeroesPage       from './pages/HeroesPage.jsx';
import HeroDetailPage   from './pages/HeroDetailPage.jsx';
import AdminLayout      from './pages/admin/AdminLayout.jsx';
import AdminDashboard   from './pages/admin/AdminDashboard.jsx';
import AdminUsers       from './pages/admin/AdminUsers.jsx';
import AdminReports     from './pages/admin/AdminReports.jsx';
import AdminItems       from './pages/admin/AdminItems.jsx';
import AdminHealth      from './pages/admin/AdminHealth.jsx';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!user) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  return children;
}

export default function App() {
  return (
    <div className="bg-neutral-950 text-neutral-50 min-h-screen flex flex-col">
      <Header />
      <div className="flex-1">
        <Routes>
          <Route path="/"                element={<HomePage />} />
          <Route path="/builds"          element={<BuildsPage />} />
          <Route path="/builds/create"   element={<ProtectedRoute><CreateBuildPage /></ProtectedRoute>} />
          <Route path="/builds/publish"  element={<ProtectedRoute><PublishPage /></ProtectedRoute>} />
          <Route path="/builds/:id"      element={<BuildPage />} />
          <Route path="/login"           element={<LoginPage />} />
          <Route path="/register"        element={<RegisterPage />} />
          <Route path="/profile"         element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/users/:id"       element={<UserProfilePage />} />
          <Route path="/forums"          element={<ForumsPage />} />
          <Route path="/forums/create"   element={<ProtectedRoute><CreateThreadPage /></ProtectedRoute>} />
          <Route path="/forums/:id"      element={<ForumThreadPage />} />
          <Route path="/heroes"          element={<HeroesPage />} />
          <Route path="/heroes/:name"    element={<HeroDetailPage />} />
          <Route path="/admin"           element={<AdminLayout />}>
            <Route index                 element={<AdminDashboard />} />
            <Route path="users"          element={<AdminUsers />} />
            <Route path="reports"        element={<AdminReports />} />
            <Route path="items"          element={<AdminItems />} />
            <Route path="health"         element={<AdminHealth />} />
          </Route>
        </Routes>
      </div>
      <ChatWidget />
    </div>
  );
}
