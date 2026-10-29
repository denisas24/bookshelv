export default function Soon({ title, text }) {
  return (
    <div className="library">
      <header className="lib-head"><h1 className="lib-logo">{title}</h1></header>
      <div className="lib-empty"><p>{text}</p></div>
    </div>
  );
}
