import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './auth/login';
import ToggleSignup from './auth/ToggleSignup';
import { ThemeProvider } from './theme/ThemeContext';
import './theme/theme.css';

function App() {
    return (
        <ThemeProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup/customer" element={<ToggleSignup />} />
              <Route path="/signup/seller" element={<ToggleSignup />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </BrowserRouter>
        </ThemeProvider>
    );
}

export default App;