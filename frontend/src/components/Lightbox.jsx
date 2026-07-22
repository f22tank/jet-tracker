import { useEffect } from "react";
import { photoUrl } from "../api.js";

/** Full-size overlay for a spot's photos — always serves the original (photo.path,
 * under /originals/...), never a derivative. Arrow keys / on-screen buttons move
 * between the spot's photos, Escape closes. */
export default function Lightbox({ photos, index, onClose, onNavigate }) {
  const photo = photos[index];

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && photos.length > 1) onNavigate((index - 1 + photos.length) % photos.length);
      else if (e.key === "ArrowRight" && photos.length > 1) onNavigate((index + 1) % photos.length);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [index, photos.length, onClose, onNavigate]);

  if (!photo) return null;

  const src = photoUrl(photo.path);

  return (
    <div className="lightbox-backdrop" onClick={onClose}>
      <button type="button" className="lightbox-close" onClick={onClose} aria-label="Close">
        ×
      </button>

      {photos.length > 1 && (
        <button
          type="button"
          className="lightbox-nav lightbox-prev"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate((index - 1 + photos.length) % photos.length);
          }}
          aria-label="Previous photo"
        >
          ‹
        </button>
      )}

      <div className="lightbox-body" onClick={(e) => e.stopPropagation()}>
        <img src={src} alt="" className="lightbox-img" />
        <div className="lightbox-bar mono">
          <span className="lightbox-count">
            {index + 1} / {photos.length}
          </span>
          <a className="lightbox-download" href={src} download>
            ⭳ Download original
          </a>
        </div>
      </div>

      {photos.length > 1 && (
        <button
          type="button"
          className="lightbox-nav lightbox-next"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate((index + 1) % photos.length);
          }}
          aria-label="Next photo"
        >
          ›
        </button>
      )}
    </div>
  );
}
