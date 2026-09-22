import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Shell from './components/Shell';
import { Loading } from './components/ui';
import { useAuth } from './lib/auth';
import Home from './pages/Home';

const P = {
  Programs: lazy(() => import('./pages/Programs')), Program: lazy(() => import('./pages/Program')), Lesson: lazy(() => import('./pages/Lesson')), Quiz: lazy(() => import('./pages/Quiz')),
  IdeLauncher: lazy(() => import('./pages/IdeLauncher')), Ide: lazy(() => import('./pages/Ide')), Dashboard: lazy(() => import('./pages/Dashboard')),
  Community: lazy(() => import('./pages/Community')), Shop: lazy(() => import('./pages/Shop')), Workspace: lazy(() => import('./pages/Workspace')),
  Law: lazy(() => import('./pages/Law')), LawExplorer: lazy(() => import('./pages/LawExplorer')), AiModels: lazy(() => import('./pages/AiModels')),
  Pricing: lazy(() => import('./pages/Pricing')), Schedule: lazy(() => import('./pages/Schedule')), Checkout: lazy(() => import('./pages/Checkout')),
  Badges: lazy(() => import('./pages/Badges')), Badge: lazy(() => import('./pages/Badge')), TrackDesigner: lazy(() => import('./pages/TrackDesigner')),
  Courses: lazy(() => import('./pages/Courses')), Course: lazy(() => import('./pages/Course')), Blog: lazy(() => import('./pages/Blog')), BlogPost: lazy(() => import('./pages/BlogPost')),
  Builder: lazy(() => import('./pages/Builder')), Podcast: lazy(() => import('./pages/Podcast')), SignIn: lazy(() => import('./pages/SignIn')), GetStarted: lazy(() => import('./pages/GetStarted')),
  Verify: lazy(() => import('./pages/Verify')), Admin: lazy(() => import('./pages/Admin')), Company: lazy(() => import('./pages/Company'))
};

function Protected({ children, roles }: { children: JSX.Element; roles?: string[] }) {
  const { user, ready } = useAuth(); const loc = useLocation();
  if (!ready) return <Loading />;
  if (!user) return <Navigate to={`/signin?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  if (roles && !roles.some((r) => user.roles.includes(r as any))) return <Navigate to="/dashboard" replace />;
  return children;
}
function ScrollTop() { const { pathname } = useLocation(); useEffect(() => { window.scrollTo(0, 0); }, [pathname]); return null; }

export default function App() {
  return (
    <Shell>
      <ScrollTop />
      <Suspense fallback={<div className="wrap section"><Loading /></div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/programs" element={<P.Programs />} />
          <Route path="/programs/:code" element={<P.Program />} />
          <Route path="/learn/:program/:lesson" element={<P.Lesson />} />
          <Route path="/quiz/:slug" element={<Protected><P.Quiz /></Protected>} />
          <Route path="/ide" element={<P.IdeLauncher />} />
          <Route path="/ide/:language" element={<P.Ide />} />
          <Route path="/ide/:language/:slug" element={<P.Ide />} />
          <Route path="/dashboard" element={<Protected><P.Dashboard /></Protected>} />
          <Route path="/dashboard/:tab" element={<Protected><P.Dashboard /></Protected>} />
          <Route path="/community" element={<P.Community />} />
          <Route path="/shop" element={<P.Shop />} />
          <Route path="/workspace" element={<Protected><P.Workspace /></Protected>} />
          <Route path="/workspace/:id" element={<Protected><P.Workspace /></Protected>} />
          <Route path="/law" element={<P.Law />} />
          <Route path="/law/explorer" element={<P.LawExplorer />} />
          <Route path="/ai" element={<P.AiModels />} />
          <Route path="/pricing" element={<P.Pricing />} />
          <Route path="/schedule" element={<P.Schedule />} />
          <Route path="/checkout/:sku" element={<Protected><P.Checkout /></Protected>} />
          <Route path="/badges" element={<P.Badges />} />
          <Route path="/badges/:code" element={<P.Badge />} />
          <Route path="/track-designer" element={<P.TrackDesigner />} />
          <Route path="/courses" element={<P.Courses />} />
          <Route path="/courses/:slug" element={<P.Course />} />
          <Route path="/blog" element={<P.Blog />} />
          <Route path="/blog/:slug" element={<P.BlogPost />} />
          <Route path="/builder" element={<P.Builder />} />
          <Route path="/podcast" element={<P.Podcast />} />
          <Route path="/podcast/:slug" element={<P.Podcast />} />
          <Route path="/signin" element={<P.SignIn />} />
          <Route path="/get-started" element={<P.GetStarted />} />
          <Route path="/verify/:id" element={<P.Verify />} />
          <Route path="/admin" element={<Protected roles={['admin', 'instructor']}><P.Admin /></Protected>} />
          <Route path="/admin/:tab" element={<Protected roles={['admin', 'instructor']}><P.Admin /></Protected>} />
          <Route path="/company/:page" element={<P.Company />} />
          <Route path="*" element={<div className="wrap section"><h1>404</h1><p className="lead">That page does not exist. <a className="link" href="/">Back to Home</a></p></div>} />
        </Routes>
      </Suspense>
    </Shell>
  );
}
