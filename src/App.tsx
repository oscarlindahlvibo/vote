import { useEffect, useState } from 'react';
import VotingPage from './pages/VotingPage';
import AdminPage from './pages/AdminPage';

export default function App() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  if (path === '/admin') return <AdminPage />;
  return <VotingPage />;
}
