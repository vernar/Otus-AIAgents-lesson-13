import { HashRouter, Routes, Route } from 'react-router-dom';
import { LmContext, useLmModels } from './hooks/useLmModels.js';
import NavBar from './components/NavBar.jsx';
import GraphPage from './pages/GraphPage.jsx';
import ArticleListPage from './pages/ArticleListPage.jsx';
import AddArticlePage from './pages/AddArticlePage.jsx';
import BulkAddPage from './pages/BulkAddPage.jsx';
import ArticleDetailPage from './pages/ArticleDetailPage.jsx';

export default function App() {
  const lm = useLmModels();

  return (
    <LmContext.Provider value={lm}>
      <HashRouter>
        <div style={{ display: 'flex', height: '100vh', background: '#0a0f1c', fontFamily: 'Inter, system-ui, sans-serif' }}>
          <NavBar />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Routes>
              <Route path="/" element={<GraphPage />} />
              <Route path="/list" element={<ArticleListPage />} />
              <Route path="/add" element={<AddArticlePage />} />
              <Route path="/bulk" element={<BulkAddPage />} />
              <Route path="/articles/:id" element={<ArticleDetailPage />} />
            </Routes>
          </div>
        </div>
      </HashRouter>
    </LmContext.Provider>
  );
}
