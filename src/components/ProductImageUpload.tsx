import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ProductImageUploadProps {
  productId?: string;
  imageUrl?: string | null;
  onImageChange: (url: string | null) => void;
}

export function ProductImageUpload({ productId, imageUrl, onImageChange }: ProductImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(imageUrl || null);

  // Sync preview with prop imageUrl when it changes
  useEffect(() => {
    setPreview(imageUrl || null);
  }, [imageUrl]);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Type non supporté", description: "Veuillez sélectionner une image.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Fichier trop volumineux", description: "Maximum 5 Mo.", variant: "destructive" });
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `products/${productId || crypto.randomUUID()}-${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from("company-assets").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Erreur upload", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("company-assets").getPublicUrl(path);
    setPreview(publicUrl);
    onImageChange(publicUrl);
    setUploading(false);
    toast({ title: "Image ajoutée" });
  }, [productId, onImageChange]);

  const handleRemove = () => {
    setPreview(null);
    onImageChange(null);
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">Image produit</p>
      {preview ? (
        <div className="relative w-36 h-36 rounded-lg border border-border overflow-hidden bg-muted group flex items-center justify-center">
          <img 
            src={preview} 
            alt="Produit" 
            className="max-w-full max-h-full object-contain"
            key={preview} // Force re-render if URL changes
            onError={(e) => {
              console.error("Image load error:", preview);
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity z-10"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-36 h-36 rounded-lg border-2 border-dashed border-border hover:border-primary/50 bg-muted/30 cursor-pointer transition-colors">
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <>
              <ImagePlus className="h-5 w-5 text-muted-foreground mb-1" />
              <span className="text-[10px] text-muted-foreground">Max 5 Mo</span>
            </>
          )}
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      )}
    </div>
  );
}
