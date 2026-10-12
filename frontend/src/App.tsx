// import { useState } from 'react';
// import CustomerSignup from './auth/customerSignup';
// import SellerSignup from './auth/sellerSignup';
// import './App.css';

// function App() {
// const [page, setPage] = useState<'customer' | 'seller'>('customer');

// return (
//   <>
//     <div
//       style={{
//       position: 'fixed',
//       top: 12,
//       right: 12,
//       zIndex: 10,
//       display: 'flex',
//       gap: 8,
//       }}
//       className="auth-preview-buttons"
//     >
//       <button type="button" onClick={() => setPage('customer')}>
//         Customer signup 
//       </button>

//       <button type="button" onClick={() => setPage('seller')}>
//         Seller signup 
//       </button> 
//     </div>

//     {page === 'customer' ? <CustomerSignup /> : <SellerSignup />}
//   </>

// );
// }

// export default App;


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