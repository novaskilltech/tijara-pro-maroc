import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Clock } from "lucide-react";
import {
  useDocumentTemplates,
  TEMPLATE_DOC_LABELS,
  type TemplateDocType,
  type DocumentTemplate,
} from "@/hooks/useDocumentTemplates";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const DOC_TYPES: TemplateDocType[] = [
  "demande_prix",
  "bc_fournisseur",
  "facture_fournisseur",
  "avoir_fournisseur",
  "devis_client",
  "bc_client",
  "facture_client",
];

const DOC_ICONS: Record<TemplateDocType, string> = {
  demande_prix: "📋",
  bc_fournisseur: "📦",
  facture_fournisseur: "🧾",
  avoir_fournisseur: "↩️",
  devis_client: "📄",
  bc_client: "📝",
  facture_client: "🧾",
};

export default function ConceptionPage() {
  const navigate = useNavigate();
  const { fetchTemplates } = useDocumentTemplates();
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await fetchTemplates();
      setTemplates(data);
      setLoading(false);
    })();
  }, [fetchTemplates]);

  const getTemplateForType = (type: TemplateDocType) =>
    templates.find((t) => t.document_type === type);

  return (
    <AppLayout title="Conception" subtitle="Personnalisez vos modèles de documents commerciaux">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {DOC_TYPES.map((type) => {
          const tpl = getTemplateForType(type);
          const status = (tpl as any)?.status || "draft";
          return (
            <Card
              key={type}
              className="group hover:shadow-lg transition-shadow duration-200 border-border"
            >
              <CardContent className="p-4 flex flex-col gap-3">
                {/* Preview thumbnail */}
                <div className="bg-muted/50 rounded-lg flex items-center justify-center h-32 border border-border relative overflow-hidden">
                  <div className="text-4xl opacity-60">{DOC_ICONS[type]}</div>
                  <div className="absolute inset-2 bg-background rounded shadow-sm border border-border/50 flex flex-col items-center p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-8 h-1 bg-primary/30 rounded mb-1" />
                    <div className="w-full h-1 bg-muted rounded mb-0.5" />
                    <div className="w-full h-1 bg-muted rounded mb-0.5" />
                    <div className="w-3/4 h-1 bg-muted rounded mb-1.5" />
                    <div className="w-full h-6 bg-muted/60 rounded mb-1" />
                    <div className="w-1/2 h-3 bg-primary/20 rounded ml-auto" />
                  </div>
                </div>

                {/* Info */}
                <div>
                  <h3 className="font-semibold text-sm text-foreground">
                    {TEMPLATE_DOC_LABELS[type]}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    {tpl ? (
                      <>
                        <Badge
                          variant={status === "published" ? "default" : "secondary"}
                          className="text-[10px]"
                        >
                          {status === "published" ? "Publié" : "Brouillon"}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          v{tpl.version}
                        </Badge>
                      </>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        Par défaut
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Meta */}
                {tpl && (
                  <div className="text-[11px] text-muted-foreground space-y-0.5">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(tpl.updated_at), "dd MMM yyyy HH:mm", { locale: fr })}
                    </div>
                  </div>
                )}

                {/* Action */}
                <Button
                  size="sm"
                  className="w-full mt-auto gap-1.5"
                  onClick={() => navigate(`/systeme/conception/${type}`)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Modifier
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppLayout>
  );
}
