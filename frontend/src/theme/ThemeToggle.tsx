import React from 'react';
import { useTheme } from './ThemeContext';
import './ThemeToggle.css';

const ThemeToggle: React.FC = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
            <span aria-hidden="true">
                {theme === 'dark' ? '☀' : '☾'}
            </span>
            <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>
    );
};

export default ThemeToggle;