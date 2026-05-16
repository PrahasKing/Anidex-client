import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../api';
import AnimeCard from '../components/AnimeCard';

export default function Wishlist({ changePage, user, onLogout }) {
    useEffect(() => {
        const wishlistBtn = document.getElementById('wishlist');
        if (wishlistBtn) wishlistBtn.classList.add('glow');
        const watchBtn = document.getElementById('watchlist');
        if (watchBtn) watchBtn.classList.remove('glow');
        const homeBtn = document.getElementById('home');
        if (homeBtn) homeBtn.classList.remove('glow');
    }, []);

    const [anime, setAnime] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [wishlistIds, setWishlistIds] = useState([]);
    const [watchlistIds, setWatchlistIds] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchWishlist = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const wlResp = await axios.get(`${API_BASE}/api/users/${encodeURIComponent(user)}/wishlist`);
            const savedIds = wlResp.status === 200 ? (wlResp.data.wishlist || []) : null;
            if (savedIds !== null) {
                setWishlistIds(savedIds);
            } else {
                console.error('Failed to load wishlist from server, non-ok response', wlResp.status);
                setWishlistIds([]);
            }
            // also load watchlist ids to enforce exclusivity
            try {
                const ws = await axios.get(`${API_BASE}/api/users/${encodeURIComponent(user)}/watchlist`);
                const wids = ws.status === 200 ? (ws.data.watchlist || []) : null;
                setWatchlistIds(wids !== null ? wids : []);
            } catch (e) {
                console.error('Failed to load watchlist from server', e);
                setWatchlistIds([]);
            }
            if ((savedIds || []).length === 0) {
                setAnime([]);
                return;
            }
            const graphqlQuery = {
                query: `
                    query ($ids: [Int]) {
                        Page(page: 1, perPage: 50) {
                            media(id_in: $ids, type: ANIME) {
                                id
                                title { romaji english }
                                description
                                coverImage { large }
                            }
                        }
                    }
                `,
                variables: { ids: savedIds }
            };

            const response = await axios.post('https://graphql.anilist.co', graphqlQuery, { headers: { 'Content-Type': 'application/json', Accept: 'application/json' } });
            setAnime(response.data.data.Page.media || []);
        } catch (err) {
            console.error('Failed to load wishlist', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchWishlist();
    }, [user]);

    const changePg = () => {
        changePage(0);
    }

    const toggleWishlist = async (id) => {
        try {
            const updated = wishlistIds.includes(id) ? wishlistIds.filter(i => i !== id) : [...wishlistIds, id];
            const resp = await axios.put(`${API_BASE}/api/users/${encodeURIComponent(user)}/wishlist`, { wishlist: updated });
            if (resp.status !== 200) console.error('Failed to persist wishlist to server', resp.status);
            setWishlistIds(updated);
            setAnime(prev => prev.filter(a => updated.includes(a.id)));
            } catch (err) {
            console.error('Failed to update wishlist', err);
            const updated = wishlistIds.includes(id) ? wishlistIds.filter(i => i !== id) : [...wishlistIds, id];
            setWishlistIds(updated);
        }
    };

    const filteredAnime = anime.filter((item) => {
        const titleEnglish = item.title.english?.toLowerCase() || "";
        const titleRomaji = item.title.romaji?.toLowerCase() || "";
        const query = searchQuery.toLowerCase();
        return titleEnglish.includes(query) || titleRomaji.includes(query);
    });

    function lengthCheck(item) {
        const englishTitle = item.title.english || "";
        const romajiTitle = item.title.romaji || "";
        if (englishTitle.length > 40 || romajiTitle.length > 40) {
          return "anime-title";
        }
        return "anime-title2";
      }

    return (
        <>
            <header className="Header">
                <div className="header-left">
                    <a href="/home" onClick={(e) => { e.preventDefault(); changePage(0); }}>
                        <img className="logo" src="./assets/Anidex.png" alt="AniDex Logo" height="50px"/>
                    </a>
                </div>

                <div className="header-center">
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search in wishlist..." />
                </div>

                <div className="header-right">
                    <nav className="navbar">
                        <button className="nav-btn" id="home" onClick={changePg}>Home</button>
                        <button className="nav-btn" id="watchlist" onClick={() => changePage(1)}>WatchList</button>
                        <button className="nav-btn" id="wishlist" onClick={() => changePage(2)}>Wishlist</button>
                    </nav>
                    <div className="user-pill">
                        <span className="user-name">{user}</span>
                        <button className="logout-btn" onClick={onLogout}>Logout</button>
                    </div>
                </div>
            </header>

            <div className="Container">
                <p className="Wat">My Wishlist</p>
                <div>
                    {isLoading ? (
                        <h5>Loading...</h5>
                    ) : anime.length === 0 ? (
                        <h5>Your wishlist is empty.</h5>
                    ) : filteredAnime.length === 0 ? (
                        <h5>No matching anime found.</h5>
                    ) : (
                        filteredAnime.map((item) => (
                            <AnimeCard
                                key={item.id}
                                item={item}
                                isInWatch={watchlistIds.includes(item.id)}
                                isInWish={wishlistIds.includes(item.id)}
                                onToggleWish={async (id) => {
                                    // toggle wishlist (and remove from watchlist if needed)
                                    const updated = wishlistIds.includes(id) ? wishlistIds.filter(i => i !== id) : [...wishlistIds, id];
                                    try {
                                        const resp = await axios.put(`${API_BASE}/api/users/${encodeURIComponent(user)}/wishlist`, { wishlist: updated });
                                        if (resp.status !== 200) console.error('Failed to persist wishlist to server', resp.status);
                                        } catch (e) {
                                            console.error('Error persisting wishlist to server', e);
                                        }
                                    setWishlistIds(updated);
                                    setAnime(prev => prev.filter(a => updated.includes(a.id)));
                                    // if added to wishlist, remove from watchlist
                                    if (updated.includes(id) && watchlistIds.includes(id)) {
                                        const newWatch = watchlistIds.filter(i => i !== id);
                                        try {
                                            const r2 = await axios.put(`${API_BASE}/api/users/${encodeURIComponent(user)}/watchlist`, { watchlist: newWatch });
                                            if (r2.status !== 200) console.error('Failed to persist watchlist to server', r2.status);
                                        } catch (e) {
                                            console.error('Error persisting watchlist to server', e);
                                        }
                                        setWatchlistIds(newWatch);
                                    }
                                }}
                                onToggleWatch={async (id) => {
                                    // toggle watchlist from wishlist page
                                    const updated = watchlistIds.includes(id) ? watchlistIds.filter(i => i !== id) : [...watchlistIds, id];
                                    try {
                                        const resp = await axios.put(`${API_BASE}/api/users/${encodeURIComponent(user)}/watchlist`, { watchlist: updated });
                                        if (resp.status !== 200) console.error('Failed to persist watchlist to server', resp.status);
                                    } catch (e) {
                                        console.error('Error persisting watchlist to server', e);
                                    }
                                    setWatchlistIds(updated);
                                    // if added to watchlist, remove from wishlist
                                    if (updated.includes(id) && wishlistIds.includes(id)) {
                                        const newW = wishlistIds.filter(i => i !== id);
                                        try {
                                            const r2 = await axios.put(`${API_BASE}/api/users/${encodeURIComponent(user)}/wishlist`, { wishlist: newW });
                                            if (r2.status !== 200) console.error('Failed to persist wishlist to server', r2.status);
                                        } catch (e) {
                                            console.error('Error persisting wishlist to server', e);
                                        }
                                        setWishlistIds(newW);
                                    }
                                }}
                                titleClass={lengthCheck(item)}
                            />
                        ))
                    )}
                </div>
            </div>
        </>
    );
}
