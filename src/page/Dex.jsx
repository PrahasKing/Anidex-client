import { useState, useEffect } from 'react'
import Home from './Home.jsx'
import Watchlist from './Watchlist.jsx'
import Wishlist from './Wishlist.jsx'
import Login from './Login.jsx'

export default function Dex() {
    const [s, setP] = useState(0);
    const [user, setUser] = useState(() => {
        return localStorage.getItem('currentUser') || null;
    });

    // Check for existing session on mount
    useEffect(() => {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) setUser(savedUser);
    }, []);

    const handleLogin = (username) => {
        setUser(username);
    };

    const handleLogout = () => {
        localStorage.removeItem('currentUser');
        setUser(null);
        setP(0); // Reset to home page
        location.reload();
        try { history.pushState({}, '', '/home'); } catch (e) { /* ignore */ }
        location.reload();
    };

    // Not logged in → show login page
    if (!user) {
        return <Login onLogin={handleLogin} />;
    }

    // URL-based navigation mapping
    const pathToPage = (path) => {
        const p = path.replace(/\/$/, ''); // strip trailing slash
        if (p === '' || p === '/' || p === '/home') return 0;
        if (p === '/watchlist') return 1;
        if (p === '/wishlist') return 2;
        return 0;
    };

    useEffect(() => {
        // On mount, initialize from URL
        const page = pathToPage(window.location.pathname);
        setP(page);

        // popstate handler for back/forward
        const onPop = () => setP(pathToPage(window.location.pathname));
        window.addEventListener('popstate', onPop);
        return () => window.removeEventListener('popstate', onPop);
    }, []);

    // navigation function: update state and push URL
    const navigateTo = (page) => {
        setP(page);
        const to = page === 0 ? '/home' : page === 1 ? '/watchlist' : '/wishlist';
        try { history.pushState({}, '', to); } catch (e) { /* ignore */ }
    };

    // Logged in → show Home or other pages (pass `navigateTo` so pages update URL)
    if (s === 1) {
        return <Watchlist changePage={navigateTo} user={user} onLogout={handleLogout} />;
    }

    if (s === 2) {
        return <Wishlist changePage={navigateTo} user={user} onLogout={handleLogout} />;
    }

    return <Home changePage={navigateTo} user={user} onLogout={handleLogout} />;
}