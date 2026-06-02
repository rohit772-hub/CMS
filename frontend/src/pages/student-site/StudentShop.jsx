import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, Zap } from "lucide-react";
import api from "../../lib/api";
import { toast } from "sonner";
import BuyNowDialog from "../../components/student/BuyNowDialog";

export default function StudentShop() {
  const [products, setProducts] = useState([]);
  const [buyProduct, setBuyProduct] = useState(null);

  useEffect(() => {
    api.get("/student/site/products").then(({ data }) => setProducts(data.products || [])).catch(() => {});
  }, []);

  const addToCart = async (p) => {
    try {
      await api.post("/student/site/orders", { product_id: p.id, product_name: p.name, price: p.price });
      toast.success(`${p.name} added to cart`);
    } catch (_) { toast.error("Could not add to cart"); }
  };

  return (
    <div data-testid="student-shop">
      <h1 className="font-heading text-3xl md:text-4xl font-bold">Shop</h1>
      <p className="text-[var(--cms-muted)] mb-6">Robotics kits, drones and creative gear — curated for learners.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {products.map((p, i) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="cms-card overflow-hidden flex flex-col" data-testid={`shop-product-${p.id}`}>
            <div className="aspect-[5/3] bg-cover bg-center" style={{ backgroundImage: p.image ? `url(${typeof p.image === "string" ? p.image : p.image.url})` : "linear-gradient(135deg, #1c8e8a, #0d3b3f)" }} />
            <div className="p-5 flex-1 flex flex-col">
              <h3 className="font-heading text-lg font-semibold text-[var(--cms-teal-deep)]">{p.name}</h3>
              <p className="text-sm text-[var(--cms-muted)] mt-1 line-clamp-2 flex-1">{p.description || "Premium learning kit by Create Mind Studio."}</p>
              <div className="flex items-center justify-between mt-3">
                <p className="text-2xl font-bold text-[var(--cms-red)]">₹{p.price}</p>
                <span className={`cms-pill ${p.stock !== "out" ? "cms-chip-yellow" : "cms-chip-red"}`}>{p.stock === "out" ? "Out of stock" : "In stock"}</span>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => addToCart(p)} className="cms-btn-secondary flex-1 text-sm" data-testid={`shop-cart-${p.id}`}><ShoppingCart size={14} className="inline mr-1" /> Add to Cart</button>
                <button onClick={() => setBuyProduct(p)} disabled={p.stock === "out"} className="cms-btn-primary flex-1 text-sm disabled:opacity-50" data-testid={`shop-buy-${p.id}`}><Zap size={14} className="inline mr-1" /> Buy Now</button>
              </div>
            </div>
          </motion.div>
        ))}
        {!products.length && <p className="text-sm text-[var(--cms-muted)] col-span-full">No products listed yet.</p>}
      </div>

      <BuyNowDialog
        product={buyProduct}
        open={!!buyProduct}
        onOpenChange={(o) => !o && setBuyProduct(null)}
      />
    </div>
  );
}
