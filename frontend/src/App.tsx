import { BrowserRouter, Routes, Route, Navigate, Router } from 'react-router-dom';

// home
import Home from './pages/Home';

// auth
import Login from './auth/login';
import ToggleSignup from './auth/toggleSignup';
import { ThemeProvider } from './theme/ThemeContext';

// theme css
import './theme/theme.css';

// customer
import CustomerDashboard from './customer/dashboard/CustomerDashboard';
import CustomerCart from './customer/CustomerCart';
import CustomerDiscover from './customer/CustomerDiscover';
import CustomerMessages from './customer/CustomerMessages';
import CustomerOrders from './customer/CustomerOrders';
import CustomerProfile from './customer/CustomerProfile';
import CustomerSettings from './customer/CustomerSettings';
import CustomerHelp from './customer/CustomerHelp';

// seller
import SellerDashboard from './seller/dashboard/SellerDashboard';

function App() {
    return (
        <ThemeProvider>
          <BrowserRouter>
            <Routes>
              {/* public home */}
              <Route path='/' element={<Home />} />

              {/* auth */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup/customer" element={<ToggleSignup />} />
              <Route path="/signup/seller" element={<ToggleSignup />} />

              {/* theme */}
              <Route path="*" element={<Navigate to="/login" replace />} />

              {/* customer */}
              <Route path='/dashboard/customer' element={<CustomerDashboard />} />
              <Route path='/customer/cart' element={<CustomerCart />} />
              <Route path='/customer/discover' element={<CustomerDiscover />} />
              <Route path='/customer/messages' element={<CustomerMessages />} />
              <Route path='/customer/oders' element={<CustomerOrders />} />
              <Route path='/customer/profile' element={<CustomerProfile />} />
              <Route path='/customer/settings' element={<CustomerSettings />} />
              <Route path='/customer/help' element={<CustomerHelp />} />

              {/* seller */}
              <Route path='/dashboard/seller' element={<SellerDashboard />} />
            </Routes>
          </BrowserRouter>
        </ThemeProvider>
    );
}

export default App;