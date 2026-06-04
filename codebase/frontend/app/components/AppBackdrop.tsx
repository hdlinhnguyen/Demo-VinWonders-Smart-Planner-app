/** Ảnh nền: public/images/vinwonders-backdrop.jpg (đổi file giữ nguyên tên) */
const LOCAL_BACKDROP = "/images/vinwonders-backdrop.jpg";

function resolveBackdropSrc(): string {
  const custom = process.env.NEXT_PUBLIC_BACKDROP_URL?.trim();
  if (!custom || custom === "local") return LOCAL_BACKDROP;
  return custom;
}

export default function AppBackdrop() {
  const src = resolveBackdropSrc();

  return (
    <div className="app-backdrop" aria-hidden>
      <div
        className="app-backdrop__photo"
        style={{ backgroundImage: `url("${src}")` }}
      />
      <div className="app-backdrop__glow app-backdrop__glow--sun" />
      <div className="app-backdrop__glow app-backdrop__glow--ocean" />
      <div className="app-backdrop__veil" />
    </div>
  );
}
