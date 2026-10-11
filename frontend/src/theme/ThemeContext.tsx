import React, {
    createContext,
    useContext,
    useEffect,
    useState
} from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
    children
}) => {
    const [theme, setTheme] = useState<Theme>(() => {
        const savedTheme = localStorage.getItem('loka-theme');
        return savedTheme === 'light' ? 'light' : 'dark';
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('loka-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((currentTheme) =>
            currentTheme === 'dark' ? 'light' : 'dark'
        );
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);

    if (!context) {
        throw new Error('useTheme must be used inside ThemeProvider');
    }

    return context;
};