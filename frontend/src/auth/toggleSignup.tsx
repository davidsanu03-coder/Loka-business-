import React, { useState } from 'react';
import CustomerSignup from './customerSignup';
import SellerSignup from './sellerSignup';
import './auth.css';

const toggleSignup: React.FC = () => {
    const [signupType, setSignupType] = useState<'customer' | 'seller'>('customer');

    return (
        <div className="toggle-signup-page">
            <div className="toggle-signup-header pt-3 pb-3">
                <h2>Create an account</h2>

                <p>
                    Choose how you want to use LOKA.
                </p>

                <div className="signup-toggle">
                    <button
                        type="button"
                        className={`signup-toggle-option ${signupType === 'customer' ? 'active' : ''}`}
                        onClick={() => setSignupType('customer')}
                        aria-pressed={signupType === 'customer'}
                    >
                        Customer
                    </button>

                    <button
                        type="button"
                        className={`signup-toggle-option ${signupType === 'seller' ? 'active' : ''}`}
                        onClick={() => setSignupType('seller')}
                        aria-pressed={signupType === 'seller'}
                    >
                        Seller
                    </button>
                </div>
            </div>

            <div className="toggle-signup-content">
                {signupType === 'customer' ? (
                    <CustomerSignup />
                ) : (
                    <SellerSignup />
                )}
            </div>
        </div>
    );
};

export default toggleSignup;