import React, { useState, useEffect } from 'react';
import axios from "axios";
import { API_BASE } from '../api';
import AnimeCard from '../components/AnimeCard';

export default function Watchlist({ changePage, user, onLogout }) {
    useEffect(() => {
        const wabttn = document.getElementById("watchlist");
        if (wabttn) wabttn.classList.add('glow');
        // remove glow from other nav items
        const home = document.getElementById('home');
        const wishlist = document.getElementById('wishlist');
        if (home) home.classList.remove('glow');
        if (wishlist) wishlist.classList.remove('glow');
    }, []);
    const [anime, setAnime] = useState([]);
    const [searchQuery, setSearchQuery] = useState(""); 
    const [watchlistIds, setWatchlistIds] = useState([]);
    const [wishlistIds, setWishlistIds] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const wabttn = document.getElementById("watchlist");
    const handleSelect = async (id) => {
        try {
            const updated = watchlistIds.includes(id) ? watchlistIds.filter(i => i !== id) : [...watchlistIds, id];
            // update watchlist on server
            const resp = await axios.put(`${API_BASE}/api/users/${encodeURIComponent(user)}/watchlist`, { watchlist: updated });
            if (resp.status !== 200) {
                console.error('Failed to persist watchlist to server', resp.status);
            }
            setWatchlistIds(updated);

            // enforce exclusivity: if added to watchlist, remove from wishlist
            if (updated.includes(id) && wishlistIds.includes(id)) {
                const newWishlist = wishlistIds.filter(i => i !== id);
                try {
                    const r2 = await axios.put(`${API_BASE}/api/users/${encodeURIComponent(user)}/wishlist`, { wishlist: newWishlist });
                    if (r2.status !== 200) console.error('Failed to persist wishlist to server', r2.status);
                } catch (e) {
                    console.error('Error persisting wishlist to server', e);
                }
                setWishlistIds(newWishlist);
            }
        } catch (err) {
            console.error('Failed to update watchlist', err);
            const updated = watchlistIds.includes(id) ? watchlistIds.filter(i => i !== id) : [...watchlistIds, id];
            setWatchlistIds(updated);
        }
    };

    useEffect(() => {
        const fetchSavedAnime = async () => {
            if (!user) return;
            setIsLoading(true);
            try {
                const wlResp = await axios.get(`${API_BASE}/api/users/${encodeURIComponent(user)}/watchlist`);
                const savedIds = wlResp.status === 200 ? (wlResp.data.watchlist || []) : null;
                if (savedIds !== null) {
                    setWatchlistIds(savedIds);
                } else {
                    console.error('Failed to load watchlist from server, non-ok response', wlResp.status);
                    setWatchlistIds([]);
                }
                // also load wishlist ids to enforce exclusivity
                try {
                    const ws = await axios.get(`${API_BASE}/api/users/${encodeURIComponent(user)}/wishlist`);
                    const wids = ws.status === 200 ? (ws.data.wishlist || []) : null;
                    setWishlistIds(wids !== null ? wids : []);
                } catch (e) {
                    console.error('Failed to load wishlist from server', e);
                    setWishlistIds([]);
                }
                if (savedIds.length === 0) {
                    setAnime([]);
                    return;
                }

                const graphqlQuery = {
                    query: `
                        query ($ids: [Int]) {
                            Page(page: 1, perPage: 50) {
                                media(id_in: $ids, type: ANIME) {
                                    id
                                    title {
                                        romaji
                                        english
                                    }
                                    description
                                    coverImage {
                                        large
                                    }
                                }
                            }
                        }
                    `,
                    variables: {
                        ids: savedIds
                    }
                };

                const response = await axios.post(
                    "https://graphql.anilist.co",
                    graphqlQuery,
                    {
                        headers: {
                            "Content-Type": "application/json",
                            Accept: "application/json"
                        }
                    }
                );
                setAnime(response.data.data.Page.media || []);
            } catch (error) {
                console.error("Error fetching watchlist data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSavedAnime();
    }, [user]); 

    
    function changePg() {
        wabttn.classList.remove('glow');
        changePage(0);
    }

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
                {/* Left: Logo */}
                <div className="header-left">
                    <a href="/home" onClick={(e) => { e.preventDefault(); changePage(0); }}>
                        <img className="logo" src="./assets/Anidex.png" alt="AniDex Logo" height="50px"/>
                    </a>
                </div>

                {/* Center: Search */}
                <div className="header-center">
                    <input 
                        type="text" 
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)} 
                        placeholder="Search in watchlist..." 
                    />
                </div>

                {/* Right: Navigation + User */}
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
                <p className="Wat">My Watchlist</p>
                <div>
                    {anime.length === 0 ? (
                        <h5>Your watchlist is empty.</h5>
                    ) : filteredAnime.length === 0 ? (
                        <h5>No matching anime found.</h5>
                    ) : (
                        filteredAnime.map((item) => (
                            <AnimeCard
                                key={item.id}
                                item={item}
                                isInWatch={watchlistIds.includes(item.id)}
                                isInWish={wishlistIds.includes(item.id)}
                                onToggleWatch={handleSelect}
                                onToggleWish={async (id) => {
                                    // remove from wishlist when toggled here (enforce exclusivity)
                                    const updated = wishlistIds.includes(id) ? wishlistIds.filter(i => i !== id) : [...wishlistIds, id];
                                    try {
                                        const resp = await axios.put(`${API_BASE}/api/users/${encodeURIComponent(user)}/wishlist`, { wishlist: updated });
                                        if (resp.status !== 200) console.error('Failed to persist wishlist to server', resp.status);
                                    } catch (e) {
                                        console.error('Error persisting wishlist to server', e);
                                    }
                                    setWishlistIds(updated);
                                    // if added to wishlist, also remove from watchlist
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
                                titleClass={lengthCheck(item)}
                            />
                        ))
                    )}
                </div>
            </div>
        </>
    );
}
