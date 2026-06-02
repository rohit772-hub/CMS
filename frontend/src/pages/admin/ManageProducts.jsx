import React from "react";
import { Badge } from "../../components/ui/badge";
import ResourceManager from "../../components/admin/ResourceManager";
import { fmtDate } from "../../lib/resources";

export default function ManageProducts() {
  return (
    <ResourceManager
      kind="products"
      eyebrow="Store"
      title="Products"
      subtitle="Kits, bundles and merchandise sold in the student Shop."
      excelHint="Columns: name, description, price, stock, category, sku"
      fields={[
        { key: "name", label: "Product Name", type: "text", required: true },
        { key: "category", label: "Category", type: "select", placeholder: "Pick category",
          options: [
            { value: "Robotics", label: "Robotics" },
            { value: "Electronics", label: "Electronics" },
            { value: "Books", label: "Books" },
            { value: "Merch", label: "Merch" },
            { value: "Other", label: "Other" },
          ] },
        { key: "sku", label: "SKU", type: "text", placeholder: "e.g. RBT-101" },
        { key: "price", label: "Price (₹)", type: "number", required: true },
        { key: "stock", label: "Stock", type: "select", options: [
          { value: "in", label: "In stock" },
          { value: "low", label: "Low" },
          { value: "out", label: "Out of stock" },
        ] },
        { key: "image", label: "Product Image", type: "image" },
        { key: "description", label: "Description", type: "textarea", span: 2 },
      ]}
      columns={[
        { key: "image", label: "Image", render: (r) => {
          const url = typeof r.image === "string" ? r.image : r.image?.url;
          return url ? <img src={url} alt="" loading="lazy" className="w-12 h-12 rounded-lg object-cover border border-white/10" /> : <span className="text-[#64748B]">—</span>;
        }},
        { key: "name", label: "Product" },
        { key: "category", label: "Category" },
        { key: "sku", label: "SKU" },
        { key: "price", label: "Price", render: (r) => <span className="text-cyan-200">₹ {r.price ?? 0}</span> },
        { key: "stock", label: "Stock", render: (r) => (
          <Badge variant="outline" className={r.stock === "out" ? "border-red-400/40 text-red-300 bg-red-500/10" : r.stock === "low" ? "border-amber-400/40 text-amber-200 bg-amber-500/10" : "border-emerald-400/40 text-emerald-300 bg-emerald-500/10"}>
            {r.stock || "in"}
          </Badge>
        )},
        { key: "created_at", label: "Added", render: (r) => fmtDate(r.created_at) },
      ]}
      downloadable
      viewable
      filters={[
        { key: "category", label: "Category", options: ["Robotics","Electronics","Books","Merch","Other"].map((v) => ({ value: v, label: v })) },
        { key: "stock", label: "Stock", options: [{ value:"in", label:"In stock" },{ value:"low", label:"Low" },{ value:"out", label:"Out of stock" }] },
      ]}
    />
  );
}
