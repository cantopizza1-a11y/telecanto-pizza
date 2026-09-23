import { Plus, Heart } from "lucide-react";
import { formatEuro } from "@/lib/api";

export default function ProductCard({ product, onOpen, isFav, onToggleFav }) {
  return (
    <button data-testid={`product-card-${product.id}`} onClick={() => onOpen(product)}
      className="text-left bg-white rounded-2xl border border-slate-200 p-3 flex gap-3 card-hover w-full">
      <div className="flex-1 min-w-0">
        <div className="font-display font-bold text-slate-900 text-base line-clamp-1">{product.name}</div>
        {product.description && <div className="text-sm text-slate-500 line-clamp-2 mt-1">{product.description}</div>}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-brand font-display font-black text-lg">{formatEuro(product.price)}</span>
        </div>
      </div>
      <div className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0">
        {product.image ? (
          <img src={product.image} alt={product.name} loading="lazy"
            className="w-full h-full rounded-xl object-cover bg-slate-100" />
        ) : (
          <div className="w-full h-full rounded-xl bg-slate-100 flex items-center justify-center text-slate-300 font-display font-bold">T</div>
        )}
        <span onClick={(e) => { e.stopPropagation(); onOpen(product); }}
          className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-brand hover-brand text-white flex items-center justify-center shadow-lg cursor-pointer"
          data-testid={`product-add-${product.id}`}>
          <Plus className="w-5 h-5" />
        </span>
        {onToggleFav && (
          <button onClick={(e) => { e.stopPropagation(); onToggleFav(product.id); }}
            data-testid={`product-fav-${product.id}`}
            className="absolute top-1 right-1 w-8 h-8 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-sm">
            <Heart className={`w-4 h-4 ${isFav ? "fill-brand text-brand" : "text-slate-400"}`} />
          </button>
        )}
      </div>
    </button>
  );
}
