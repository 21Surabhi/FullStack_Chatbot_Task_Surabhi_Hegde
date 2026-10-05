import { Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/admin" element={<Login />} />
      <Route path="/admin/dashboard" element={<Dashboard />} />
      <Route
        path="*"
        element={
          <main className="panel narrow">
            <h2>Page not found</h2>
            <a href="/">Go home</a>
          </main>
        }
      />
    </Routes>
  );
}