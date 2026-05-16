import React from 'react';

export default function AnimeCard({ item, isInWatch, isInWish, onToggleWatch, onToggleWish, titleClass }) {
  return (
    <div className="animecard">
      <img src={item.coverImage?.large} width="250" height="350" alt={item.title?.english || item.title?.romaji} />
      <p className={titleClass}>{item.title?.english || item.title?.romaji}</p>
      <div className="card-actions">
        <button
          className={`watch-btn ${isInWatch ? 'saved' : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggleWatch(item.id); }}
        >
          {isInWatch ? 'Saved' : 'Watchlist'}
        </button>
        <button
          className={`wish-btn ${isInWish ? 'wishlisted' : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggleWish(item.id); }}
        >
          {isInWish ? 'Wishlisted' : 'Wishlist'}
        </button>
      </div>
    </div>
  );
}