// Nur echte Coverbilder; ohne Bild eine ruhige Fläche, nie ein erzeugtes Cover.
export default function BookCover({ url, title, size = 'sm', reading = false }) {
  return (
    <span className={`book-cover ${size}`} aria-hidden="true">
      {url ? <img src={url} alt="" loading="lazy" /> : null}
      {reading && <span className="ribbon" />}
      <span className="sr-only">{title}</span>
    </span>
  );
}
