export default function Logo({ className = "", size = "h-24 sm:h-28" }) {
  return (
    <div className={`flex items-center ${className}`} data-testid="brand-logo">
      <img src="/logo.png" alt="Telecanto pizza & pasta" className={`${size} w-auto object-contain`} />
    </div>
  );
}
