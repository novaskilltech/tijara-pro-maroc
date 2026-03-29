import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useCompany } from "@/hooks/useCompany";

export interface Product {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  category_id: string | null;   // FK to product_categories
  unit: string;
  purchase_unit: string;
  purchase_price: number;
  sale_price: number;
  tva_rate: number;
  min_stock: number;
  is_active: boolean;
  image_url: string | null;
  barcode: string | null;
  product_type: string;
  can_be_sold: boolean;
  can_be_purchased: boolean;
  weight: number;
  company_id?: string | null;
}

export interface ProductAttribute {
  id: string;
  name: string;
  display_type: string;
  values: ProductAttributeValue[];
}

export interface ProductAttributeValue {
  id: string;
  attribute_id: string;
  value: string;
  color_hex: string | null;
  sort_order: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string | null;
  barcode: string | null;
  sale_price: number | null;
  purchase_price: number | null;
  weight: number;
  image_url: string | null;
  is_active: boolean;
  attribute_values: { attribute_name: string; value: string; color_hex?: string | null }[];
}

export interface ProductImage {
  id: string;
  product_id: string;
  variant_id: string | null;
  image_url: string;
  is_primary: boolean;
  sort_order: number;
}

export interface ProductFile {
  id: string;
  product_id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.id ?? null;

  const fetchProducts = useCallback(async () => {
    if (!companyId) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    
    setLoading(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    setProducts(data as any[] || []); // Keeping manual cast for now as local Product interface might differ slightly
  }, [companyId]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const createProduct = async (record: Partial<Product>) => {
    const { data, error } = await supabase
      .from("products")
      .insert({ ...record, company_id: companyId } as any)
      .select()
      .single();
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return null;
    }
    toast({ title: "Produit créé" });
    await fetchProducts();
    return data;
  };

  const updateProduct = async (id: string, record: Partial<Product>) => {
    const { error } = await supabase
      .from("products")
      .update(record as any)
      .eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Produit mis à jour" });
    await fetchProducts();
    return true;
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Produit supprimé" });
    await fetchProducts();
    return true;
  };

  return { products, loading, fetchProducts, createProduct, updateProduct, deleteProduct };
}

export function useProductAttributes() {
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);

  const fetchAttributes = useCallback(async () => {
    const { data: attrs } = await supabase
      .from("product_attributes")
      .select("*")
      .order("name");
    if (!attrs) return;

    const { data: vals } = await supabase
      .from("product_attribute_values")
      .select("*")
      .order("sort_order");

    const result: ProductAttribute[] = (attrs || []).map((a: any) => ({
      ...a,
      values: (vals || []).filter((v: any) => v.attribute_id === a.id),
    }));
    setAttributes(result);
  }, []);

  useEffect(() => { fetchAttributes(); }, [fetchAttributes]);

  const createAttribute = async (name: string, display_type: string) => {
    const { data, error } = await supabase
      .from("product_attributes")
      .insert({ name, display_type })
      .select()
      .single();
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return null;
    }
    await fetchAttributes();
    return data;
  };

  const addAttributeValue = async (attribute_id: string, value: string, color_hex?: string) => {
    const { error } = await supabase
      .from("product_attribute_values")
      .insert({ attribute_id, value, color_hex: color_hex || null } as any);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    await fetchAttributes();
    return true;
  };

  const deleteAttributeValue = async (id: string) => {
    const { error } = await supabase
      .from("product_attribute_values")
      .delete()
      .eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    await fetchAttributes();
    return true;
  };

  return { attributes, fetchAttributes, createAttribute, addAttributeValue, deleteAttributeValue };
}

export function useProductVariants(productId: string | null) {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(false);
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.id ?? null;

  const fetchVariants = useCallback(async () => {
    if (!productId) { setVariants([]); return; }
    setLoading(true);
    const { data: vars } = await supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", productId)
      .order("created_at");

    if (!vars || vars.length === 0) { setVariants([]); setLoading(false); return; }

    const variantIds = vars.map((v: any) => v.id);
    const { data: attrValues } = await supabase
      .from("variant_attribute_values")
      .select("*, product_attributes(name), product_attribute_values(value, color_hex)")
      .in("variant_id", variantIds);

    const result: ProductVariant[] = vars.map((v: any) => ({
      ...v,
      attribute_values: (attrValues || [])
        .filter((av: any) => av.variant_id === v.id)
        .map((av: any) => ({
          attribute_name: av.product_attributes?.name || "",
          value: av.product_attribute_values?.value || "",
          color_hex: av.product_attribute_values?.color_hex,
        })),
    }));
    setVariants(result);
    setLoading(false);
  }, [productId]);

  useEffect(() => { fetchVariants(); }, [fetchVariants]);

  const generateVariants = async (
    pid: string,
    attributeLines: { attribute_id: string; value_ids: string[] }[]
  ) => {
    if (attributeLines.length === 0) return;

    // Build all combinations (cartesian product)
    const combinations: { attribute_id: string; value_id: string }[][] = attributeLines.reduce(
      (acc: any[][], line) => {
        if (acc.length === 0) {
          return line.value_ids.map((vid) => [{ attribute_id: line.attribute_id, value_id: vid }]);
        }
        const result: any[][] = [];
        acc.forEach((combo) => {
          line.value_ids.forEach((vid) => {
            result.push([...combo, { attribute_id: line.attribute_id, value_id: vid }]);
          });
        });
        return result;
      },
      [] as any[][]
    );

    // Fetch existing variants to avoid duplicates
    const { data: existingVars } = await supabase
      .from("product_variants")
      .select("id")
      .eq("product_id", pid);
    const existingIds = (existingVars || []).map((v: any) => v.id);
    let existingCombos: string[] = [];
    if (existingIds.length > 0) {
      const { data: existingLinks } = await supabase
        .from("variant_attribute_values")
        .select("variant_id, value_id")
        .in("variant_id", existingIds);
      // Build a signature per variant: sorted value_ids joined
      const variantSigs: Record<string, string[]> = {};
      (existingLinks || []).forEach((l: any) => {
        if (!variantSigs[l.variant_id]) variantSigs[l.variant_id] = [];
        variantSigs[l.variant_id].push(l.value_id);
      });
      existingCombos = Object.values(variantSigs).map((ids) => [...ids].sort().join("|"));
    }

    let created = 0;
    for (const combo of combinations) {
      const sig = combo.map((c) => c.value_id).sort().join("|");
      if (existingCombos.includes(sig)) continue; // skip duplicate

      const { data: variant, error } = await supabase
        .from("product_variants")
        .insert({ product_id: pid, company_id: companyId } as any)
        .select()
        .single();
      if (error || !variant) continue;

      const links = combo.map((c) => ({
        variant_id: variant.id,
        attribute_id: c.attribute_id,
        value_id: c.value_id,
        company_id: companyId,
      }));
      await supabase.from("variant_attribute_values").insert(links as any);
      created++;
    }

    if (created > 0) {
      toast({ title: `${created} variante(s) générée(s)` });
    } else {
      toast({ title: "Aucune nouvelle combinaison", description: "Toutes les variantes existent déjà." });
    }
    await fetchVariants();
  };

  const updateVariant = async (id: string, record: Partial<ProductVariant>) => {
    const { attribute_values, ...dbRecord } = record as any;
    const { error } = await supabase.from("product_variants").update(dbRecord).eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    await fetchVariants();
    return true;
  };

  const deleteVariant = async (id: string) => {
    // variant_attribute_values will cascade delete
    const { error } = await supabase.from("product_variants").delete().eq("id", id);
    if (error) {
      if (error.message?.includes("foreign key") || error.message?.includes("constraint")) {
        toast({ title: "Suppression impossible", description: "Cette variante est liée à des transactions. Désactivez-la à la place.", variant: "destructive" });
        return false;
      }
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Variante supprimée" });
    await fetchVariants();
    return true;
  };

  return { variants, loading, fetchVariants, generateVariants, updateVariant, deleteVariant };
}

export function useProductImages(productId: string | null) {
  const [images, setImages] = useState<ProductImage[]>([]);

  const fetchImages = useCallback(async () => {
    if (!productId) { setImages([]); return; }
    const { data } = await supabase
      .from("product_images")
      .select("*")
      .eq("product_id", productId)
      .order("sort_order");
    setImages(data as any[] || []);
  }, [productId]);

  useEffect(() => { fetchImages(); }, [fetchImages]);

  const addImage = async (productId: string, file: File, variantId?: string) => {
    const ext = file.name.split(".").pop();
    const path = `products/${productId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("company-assets").upload(path, file, { upsert: true });
    if (uploadErr) {
      toast({ title: "Erreur upload", description: uploadErr.message, variant: "destructive" });
      return null;
    }
    const { data: { publicUrl } } = supabase.storage.from("company-assets").getPublicUrl(path);
    const { error } = await supabase.from("product_images").insert({
      product_id: productId,
      variant_id: variantId || null,
      image_url: publicUrl,
      is_primary: images.length === 0,
    } as any);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return null;
    }
    await fetchImages();
    return publicUrl;
  };

  const deleteImage = async (id: string) => {
    const { error } = await supabase.from("product_images").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    await fetchImages();
    return true;
  };

  return { images, fetchImages, addImage, deleteImage };
}

export function useProductFiles(productId: string | null) {
  const [files, setFiles] = useState<ProductFile[]>([]);

  const fetchFiles = useCallback(async () => {
    if (!productId) { setFiles([]); return; }
    const { data } = await supabase
      .from("product_files")
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });
    setFiles(data as any[] || []);
  }, [productId]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const addFile = async (productId: string, file: File) => {
    const path = `products/${productId}/files/${crypto.randomUUID()}-${file.name}`;
    const { error: uploadErr } = await supabase.storage.from("company-assets").upload(path, file);
    if (uploadErr) {
      toast({ title: "Erreur upload", description: uploadErr.message, variant: "destructive" });
      return false;
    }
    const { data: { publicUrl } } = supabase.storage.from("company-assets").getPublicUrl(path);
    const { error } = await supabase.from("product_files").insert({
      product_id: productId,
      file_name: file.name,
      file_url: publicUrl,
      file_type: file.type,
      file_size: file.size,
    } as any);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Fichier ajouté" });
    await fetchFiles();
    return true;
  };

  const deleteFile = async (id: string) => {
    const { error } = await supabase.from("product_files").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Fichier supprimé" });
    await fetchFiles();
    return true;
  };

  return { files, fetchFiles, addFile, deleteFile };
}
