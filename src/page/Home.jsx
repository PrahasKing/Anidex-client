import React, { useState, useEffect, useRef } from 'react';
import axios from "axios";
import { API_BASE } from '../api';
import AnimeCard from '../components/AnimeCard';

function Home({ changePage, user, onLogout }) {
    useEffect(() => {
        const homebttn = document.getElementById("home");
        homebttn.classList.add('glow');
    }, []);

    const [c, setS] = useState(() => {
        return Number(localStorage.getItem('s')) || 0;
    });

    const [query, setQuery] = useState("");
    const [anime, setAnime] = useState([]);
    const [isDefault, setIsDefault] = useState(true); // Track if showing default content
    const [pageNumber, setPageNumber] = useState(1);
    const perPage = 40; // number of items to load per page
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const sentinelRef = useRef(null);

    // load next page and append results
    const loadMore = async () => {
        if (isLoading || !hasMore) return;
        const nextPage = pageNumber + 1;
        setIsLoading(true);
        const graphqlQuery = {
            query: `
                query ($page: Int, $perPage: Int, $search: String) {
                    Page(page: $page, perPage: $perPage) {
                        media(search: $search, type: ANIME, sort: TRENDING_DESC) {
                            id
                            title { romaji english }
                            description
                            coverImage { large }
                        }
                    }
                }
            `,
            variables: { page: nextPage, perPage, search: query.trim() || null }
        };

        try {
            const response = await axios.post(
                "https://graphql.anilist.co",
                graphqlQuery,
                { headers: { "Content-Type": "application/json", Accept: "application/json" } }
            );

            const media = (response.data.data.Page && response.data.data.Page.media) || [];
            if (media.length) {
                setAnime(prev => prev.concat(media));
                setPageNumber(nextPage);
                setHasMore(media.length === perPage);
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error("Error loading more anime:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Observe sentinel to trigger loading more when visible
    useEffect(() => {
        if (!sentinelRef.current) return;
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasMore && !isLoading) {
                loadMore();
            }
        }, { root: null, rootMargin: '300px' });

        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [sentinelRef, hasMore, isLoading, query, pageNumber]);
    const [watchlistIds, setWatchlistIds] = useState([]);
    const [wishlistIds, setWishlistIds] = useState([]);

    // Fetch trending anime when query is empty (default view)
    useEffect(() => {
        // fetch a single page (pageNumber) with optional search
        const fetchPage = async (page, search = null) => {
            setIsLoading(true);
            const graphqlQuery = {
                query: `
                    query ($page: Int, $perPage: Int, $search: String) {
                        Page(page: $page, perPage: $perPage) {
                            media(search: $search, type: ANIME, sort: TRENDING_DESC) {
                                id
                                title { romaji english }
                                description
                                coverImage { large }
                            }
                        }
                    }
                `,
                variables: { page, perPage, search }
            };

            try {
                const response = await axios.post(
                    "https://graphql.anilist.co",
                    graphqlQuery,
                    { headers: { "Content-Type": "application/json", Accept: "application/json" } }
                );

                const media = (response.data.data.Page && response.data.data.Page.media) || [];
                return media;
            } catch (error) {
                console.error("Error fetching trending anime:", error);
                return [];
            } finally {
                setIsLoading(false);
            }
        };

        // load first page on mount
        (async () => {
            const initial = await fetchPage(1, null);
            setAnime(initial);
            setPageNumber(1);
            setHasMore(initial.length === perPage);
            setIsDefault(true);
        })();
    }, []); // Runs once on mount

    // Search effect - only triggers when user types
    useEffect(() => {
        const searchAnime = async () => {
            if (!query.trim()) {
                // When search cleared, re-fetch first trending page
                const fetchPage = async (page, search = null) => {
                    setIsLoading(true);
                    const graphqlQuery = {
                        query: `
                            query ($page: Int, $perPage: Int, $search: String) {
                                Page(page: $page, perPage: $perPage) {
                                    media(search: $search, type: ANIME, sort: TRENDING_DESC) {
                                        id
                                        title { romaji english }
                                        description
                                        coverImage { large }
                                    }
                                }
                            }
                        `,
                        variables: { page, perPage, search }
                    };

                    try {
                        const response = await axios.post(
                            "https://graphql.anilist.co",
                            graphqlQuery,
                            { headers: { "Content-Type": "application/json", Accept: "application/json" } }
                        );

                        const media = (response.data.data.Page && response.data.data.Page.media) || [];
                        return media;
                    } catch (error) {
                        console.error("Error fetching trending anime:", error);
                        return [];
                    } finally {
                        setIsLoading(false);
                    }
                };

                (async () => {
                    const initial = await fetchPage(1, null);
                    setAnime(initial);
                    setPageNumber(1);
                    setHasMore(initial.length === perPage);
                    setIsDefault(true);
                })();

                return;
            }

            const graphqlQuery = {
                query: `
                    query ($page: Int, $perPage: Int, $search: String) {
                        Page(page: $page, perPage: $perPage) {
                            media(search: $search, type: ANIME) {
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
                    page: 1,
                    perPage,
                    search: query
                }
            };

            try {
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
                const media = response.data.data.Page.media || [];
                setAnime(media);
                setPageNumber(1);
                setHasMore(media.length === perPage);
                setIsDefault(false);
            } catch (error) {
                console.error("Error fetching anime:", error);
            }
        };

        searchAnime();
    }, [query]);

    // load current user's watchlist from API
    useEffect(() => {
        const loadWatchlist = async () => {
            if (!user) return;
                try {
                    const resp = await fetch(`${API_BASE}/api/users/${encodeURIComponent(user)}/watchlist`);
                    if (resp.ok) {
                        const data = await resp.json();
                        setWatchlistIds(data.watchlist || []);
                    } else {
                        console.error('Failed to load watchlist: non-ok response', resp.status);
                        setWatchlistIds([]);
                    }
                } catch (err) {
                    console.error('Failed to load watchlist', err);
                    setWatchlistIds([]);
                }
        };
        loadWatchlist();
    }, [user]);

    // load current user's wishlist from API
    useEffect(() => {
        const loadWishlist = async () => {
            if (!user) return;
            try {
                const resp = await fetch(`${API_BASE}/api/users/${encodeURIComponent(user)}/wishlist`);
                if (resp.ok) {
                    const data = await resp.json();
                    setWishlistIds(data.wishlist || []);
                } else {
                    console.error('Failed to load wishlist: non-ok response', resp.status);
                    setWishlistIds([]);
                }
            } catch (err) {
                console.error('Failed to load wishlist', err);
                setWishlistIds([]);
            }
        };
        loadWishlist();
    }, [user]);

    const handleSelect = (id) => {
        // update local state and persist to local API if user is logged in
        (async () => {
            try {
                const updatedIds = watchlistIds.includes(id) ? watchlistIds.filter(item => item !== id) : [...watchlistIds, id];
                if (user) {
                    await fetch(`${API_BASE}/api/users/${encodeURIComponent(user)}/watchlist`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ watchlist: updatedIds })
                    });
                }
                setWatchlistIds(updatedIds);
                const totalCount = updatedIds.length;
                localStorage.setItem('s', String(totalCount));
                setS(totalCount);
                // enforce exclusivity: if this id was added to watchlist, remove from wishlist
                if (updatedIds.includes(id) && wishlistIds.includes(id)) {
                    const newWishlist = wishlistIds.filter(i => i !== id);
                    if (user) {
                        try {
                            const resp = await fetch(`${API_BASE}/api/users/${encodeURIComponent(user)}/wishlist`, {
                                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wishlist: newWishlist })
                            });
                            if (!resp.ok) console.error('Failed to persist wishlist to server', resp.status);
                        } catch (e) {
                            console.error('Error persisting wishlist to server', e);
                        }
                    }
                    setWishlistIds(newWishlist);
                }
            } catch (err) {
                console.error('Failed to update watchlist', err);
            }
        })();
    };

    const toggleWishlist = async (id) => {
        try {
            const updated = wishlistIds.includes(id) ? wishlistIds.filter(i => i !== id) : [...wishlistIds, id];
                if (user) {
                const resp = await fetch(`${API_BASE}/api/users/${encodeURIComponent(user)}/wishlist`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ wishlist: updated })
                });
                if (!resp.ok) console.error('Failed to persist wishlist to server', resp.status);
                }
            setWishlistIds(updated);
            // also persist locally as a safety net
                // do not persist wishlist to localStorage; server is source-of-truth
            // enforce exclusivity: if added to wishlist, remove from watchlist
            if (updated.includes(id) && watchlistIds.includes(id)) {
                const newWatch = watchlistIds.filter(i => i !== id);
                if (user) {
                    try {
                        const resp2 = await fetch(`${API_BASE}/api/users/${encodeURIComponent(user)}/watchlist`, {
                            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ watchlist: newWatch })
                        });
                        if (!resp2.ok) console.error('Failed to persist watchlist to server', resp2.status);
                    } catch (e) {
                        console.error('Error persisting watchlist to server', e);
                    }
                }
                setWatchlistIds(newWatch);
            }
        } catch (err) {
            console.error('Failed to update wishlist', err);
            const updated = wishlistIds.includes(id) ? wishlistIds.filter(i => i !== id) : [...wishlistIds, id];
            setWishlistIds(updated);
        }
    };

    function changePg() {
        const homebttn = document.getElementById("home");
        if (homebttn) {
            homebttn.classList.remove('glow');
        }
        changePage(1);
    }

    function lengthCheck(item) {
        const englishTitle = item.title.english || "";
        const romajiTitle = item.title.romaji || "";
        if (englishTitle.length > 40 || romajiTitle.length > 40) {
            return "anime-title";
        }
        return "anime-title2";
    }

    return (
        <div>
            {/* ===== PROPER HEADER STRUCTURE ===== */}
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
                        id="myText" 
                        value={query} 
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search for an anime..." 
                    />
                </div>

                {/* Right: Navigation + User */}
                <div className="header-right">
                    <nav className="navbar">
                        <button className="nav-btn" id="home" onClick={() => changePage(0)}>Home</button>
                        <button className="nav-btn" id="watchlist" onClick={changePg}>WatchList</button>
                        <button className="nav-btn" id="wishlist" onClick={() => changePage(2)}>Wishlist</button>
                    </nav>
                    <div className="user-pill">
                        <span className="user-name">{user}</span>
                        <button className="logout-btn" onClick={onLogout}>Logout</button>
                    </div>
                </div>
            </header>

            <div className="Container">
                {/* Show section title based on state */}
                {isDefault && anime.length > 0 && (
                    <p className="Wat" style={{ marginBottom: '20px', fontSize: '24px', fontWeight: 'bold' }}>
                        🔥 Trending Now
                    </p>
                )}
                {!isDefault && query.trim() && (
                    <p className="Wat" style={{ marginBottom: '20px', fontSize: '20px' }}>
                        Search Results for "{query}"
                    </p>
                )}
                <div>
                    {anime.map((item) => (
                        <AnimeCard
                            key={item.id}
                            item={item}
                            isInWatch={watchlistIds.includes(item.id)}
                            isInWish={wishlistIds.includes(item.id)}
                            onToggleWatch={handleSelect}
                            onToggleWish={toggleWishlist}
                            titleClass={lengthCheck(item)}
                        />
                    ))}

                    <div ref={sentinelRef} style={{ height: 1 }} />
                    {isLoading && (
                        <div className="loading-more">
                            <div className="loading-spinner" aria-hidden="true" />
                            <p>Loading more...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Home;