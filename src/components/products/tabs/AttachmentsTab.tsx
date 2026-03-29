import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { useProductImages, useProductFiles } from "@/hooks/useProducts";
import { Upload, Trash2, Download, FileText, ImagePlus, X } from "lucide-react";

interface AttachmentsTabProps {
  productId: string;
}

export function AttachmentsTab({ productId }: AttachmentsTabProps) {
  const { images, addImage, deleteImage } = useProductImages(productId);
  const { files, addFile, deleteFile } = useProductFiles(productId);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    for (let i = 0; i < fileList.length; i++) {
      await addImage(productId, fileList[i]);
    }
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    for (let i = 0; i < fileList.length; i++) {
      await addFile(productId, fileList[i]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  return (
    <div className="space-y-8">
      {/* Images Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold">Images du produit</h3>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => imageInputRef.current?.click()}>
            <ImagePlus className="h-4 w-4" /> Ajouter des images
          </Button>
          <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
        </div>
        {images.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-lg">
            <ImagePlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucune image. Cliquez pour en ajouter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {images.map((img) => (
              <div key={img.id} className="relative group rounded-lg border border-border overflow-hidden aspect-square bg-muted">
                <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => deleteImage(img.id)}
                  className="absolute top-1.5 right-1.5 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
                {img.is_primary && (
                  <span className="absolute bottom-1.5 left-1.5 text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                    Principale
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Files Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold">Documents & fichiers</h3>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" /> Ajouter un fichier
          </Button>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} />
        </div>
        {files.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-lg">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucun fichier joint.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((f) => (
              <div key={f.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{f.file_name}</p>
                    <p className="text-xs text-muted-foreground">{formatSize(f.file_size)} • {new Date(f.created_at).toLocaleDateString("fr-FR")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                    <a href={f.file_url} target="_blank" rel="noopener noreferrer"><Download className="h-3.5 w-3.5" /></a>
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteFile(f.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
