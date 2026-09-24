export default function Logo({ className = "", size = "h-20" }) {
  return (
    <div className={`flex items-center ${className}`} data-testid="brand-logo">
      <img src="/logo.png" alt="Telecanto pizza & pasta" className={`${size} w-auto object-contain`} />
    </div>
  );
}
