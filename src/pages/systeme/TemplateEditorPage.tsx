import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Save, Copy, RotateCcw, Eye, GripVertical,
  EyeOff, Upload, Plus, Trash2, Send, Code,
} from "lucide-react";
import { toast } from "sonner";
import {
  useDocumentTemplates,
  TEMPLATE_DOC_LABELS,
  DYNAMIC_PLACEHOLDERS,
  getDefaultTemplate,
  type TemplateDocType,
  type TemplateConfig,
  type TemplateBlock,
  type DocumentTemplate,
  type TemplateStatus,
} from "@/hooks/useDocumentTemplates";
import { TemplatePreview } from "@/components/conception/TemplatePreview";
import { SourceCodeEditor } from "@/components/conception/SourceCodeEditor";
import { usePermissions } from "@/hooks/usePermissions";
export default function TemplateEditorPage() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const docType = type as TemplateDocType;
  const { fetchTemplate, saveTemplate, publishTemplate, saveAsCopy, restoreDefault, loading } = useDocumentTemplates();
  const { userRoles } = usePermissions();

  const [existingId, setExistingId] = useState<string | undefined>();
  const [config, setConfig] = useState<TemplateConfig>(getDefaultTemplate());
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>("logo");
  const [showPreview, setShowPreview] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [templateStatus, setTemplateStatus] = useState<TemplateStatus>("draft");
  const [viewMode, setViewMode] = useState<"visual" | "code">("visual");

  // Check if user is admin/super_admin
  const isAdmin = userRoles.some(ur => ur.role === "super_admin" || ur.role === "admin");

  useEffect(() => {
    (async () => {
      const tpl = await fetchTemplate(docType);
      if (tpl) {
        setConfig(tpl.template_json as unknown as TemplateConfig);
        setExistingId(tpl.id);
        setTemplateStatus((tpl as any).status || "draft");
      } else {
        setConfig(getDefaultTemplate());
        setExistingId(undefined);
        setTemplateStatus("draft");
      }
      setInitialized(true);
    })();
  }, [docType, fetchTemplate]);

  const selectedBlock = config.blocks.find((b) => b.id === selectedBlockId);

  const updateBlock = useCallback((blockId: string, updates: Partial<TemplateBlock>) => {
    setConfig((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.id === blockId ? { ...b, ...updates } : b
      ),
    }));
  }, []);

  const updateBlockStyle = useCallback((blockId: string, key: string, value: any) => {
    setConfig((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.id === blockId ? { ...b, styles: { ...b.styles, [key]: value } } : b
      ),
    }));
  }, []);

  const updateBlockField = useCallback((blockId: string, field: string, visible: boolean) => {
    setConfig((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.id === blockId ? { ...b, fields: { ...b.fields, [field]: visible } } : b
      ),
    }));
  }, []);

  const updateGlobalStyle = useCallback((key: string, value: any) => {
    setConfig((prev) => ({
      ...prev,
      globalStyles: { ...prev.globalStyles, [key]: value },
    }));
  }, []);

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    const from = result.source.index;
    const to = result.destination.index;
    if (from === to) return;

    setConfig((prev) => {
      // Only reorder non-footer blocks; footer stays last
      const nonFooter = [...prev.blocks].filter(b => b.type !== "footer").sort((a, b) => a.order - b.order);
      const footerBlock = prev.blocks.find(b => b.type === "footer");
      const [moved] = nonFooter.splice(from, 1);
      nonFooter.splice(to, 0, moved);
      const reordered = nonFooter.map((b, i) => ({ ...b, order: i }));
      if (footerBlock) reordered.push({ ...footerBlock, order: reordered.length });
      return { ...prev, blocks: reordered };
    });
  }, []);

  const addCustomTextBlock = useCallback(() => {
    setConfig((prev) => {
      const maxOrder = Math.max(...prev.blocks.map(b => b.order), -1);
      const newBlock: TemplateBlock = {
        id: `custom_text_${Date.now()}`,
        type: "custom_text",
        label: "Texte personnalisé",
        visible: true,
        order: maxOrder + 1,
        styles: { fontSize: 8, spacing: 10, alignment: "left" },
        customContent: "",
      };
      return { ...prev, blocks: [...prev.blocks, newBlock] };
    });
  }, []);

  const addEmptyBlock = useCallback(() => {
    setConfig((prev) => {
      const maxOrder = Math.max(...prev.blocks.map(b => b.order), -1);
      const newBlock: TemplateBlock = {
        id: `empty_${Date.now()}`,
        type: "empty",
        label: "Bloc vide",
        visible: true,
        order: maxOrder + 1,
        styles: { fontSize: 8, spacing: 40 },
      };
      return { ...prev, blocks: [...prev.blocks, newBlock] };
    });
  }, []);

  const removeBlock = useCallback((blockId: string) => {
    // Prevent deleting footer block
    const block = config.blocks.find(b => b.id === blockId);
    if (block?.type === "footer") return;
    setConfig((prev) => ({
      ...prev,
      blocks: prev.blocks.filter(b => b.id !== blockId).map((b, i) => ({ ...b, order: i })),
    }));
    if (selectedBlockId === blockId) setSelectedBlockId(null);
  }, [selectedBlockId, config.blocks]);

  const handleSave = async () => {
    const result = await saveTemplate(docType, config, existingId, "draft");
    if (result) {
      setExistingId(result.id);
      setTemplateStatus("draft");
    }
  };

  const handlePublish = async () => {
    const result = await publishTemplate(docType, config, existingId);
    if (result) {
      setExistingId(result.id);
      setTemplateStatus("published");
    }
  };

  const handleSaveAsCopy = async () => {
    const result = await saveAsCopy(docType, config);
    if (result) {
      setExistingId(result.id);
      setTemplateStatus("draft");
    }
  };

  const handleRestore = async () => {
    await restoreDefault(docType);
    setConfig(getDefaultTemplate());
    setExistingId(undefined);
    setTemplateStatus("draft");
    toast.success("Template par défaut restauré");
  };

  if (!initialized) {
    return (
      <AppLayout title="Chargement...">
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Chargement du template...
        </div>
      </AppLayout>
    );
  }

  const sortedBlocks = [...config.blocks].sort((a, b) => a.order - b.order);
  const draggableBlocks = sortedBlocks.filter(b => b.type !== "footer");
  const footerBlock = sortedBlocks.find(b => b.type === "footer");

  const FIELD_LABELS: Record<string, string> = {
    logo: "Logo", company_name: "Raison sociale", forme_juridique: "Forme juridique",
    address: "Adresse", phone: "Téléphone", email: "Email",
    date: "Date", due_date: "Date d'échéance", payment_terms: "Conditions de paiement",
    origin_ref: "Réf. origine",
    name: "Nom", ice: "ICE", rc: "RC", if_number: "IF",
    client_name: "Nom client", client_address: "Adresse client", client_ice: "ICE client", client_rc: "RC client", client_phone: "Tél. client", client_email: "Email client",
    ref: "Référence", description: "Désignation", qty: "Quantité", unit: "Unité",
    unit_price: "Prix unitaire", discount: "Remise", tva: "TVA",
    total_ht: "Total HT", total_ttc: "Total TTC", total_tva: "Total TVA",
    amount_paid: "Montant payé", remaining: "Solde restant",
    bank_name: "Banque", account_name: "Titulaire", rib: "RIB", swift: "SWIFT",
    patente: "Patente", capital: "Capital", cnss: "CNSS",
    bank: "Coordonnées bancaires", page_numbers: "Numérotation pages",
  };

  return (
    <AppLayout
      title={`Éditeur — ${TEMPLATE_DOC_LABELS[docType]}`}
      subtitle="Personnalisez la mise en page du document"
    >
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => navigate("/systeme/conception")} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Button>
        <Badge variant={templateStatus === "published" ? "default" : "secondary"} className="text-xs">
          {templateStatus === "published" ? "Publié" : "Brouillon"}
        </Badge>
        <div className="flex-1" />

        {/* View mode toggle — Code source visible only for admin */}
        {isAdmin && (
          <div className="flex items-center border rounded-md overflow-hidden">
            <Button
              variant={viewMode === "visual" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("visual")}
              className="rounded-none gap-1.5 h-8"
            >
              <Eye className="h-3.5 w-3.5" /> Vue visuelle
            </Button>
            <Button
              variant={viewMode === "code" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("code")}
              className="rounded-none gap-1.5 h-8"
            >
              <Code className="h-3.5 w-3.5" /> Code source
            </Button>
          </div>
        )}

        {viewMode === "visual" && (
          <>
            <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)} className="gap-1.5">
              <Eye className="h-4 w-4" /> {showPreview ? "Masquer aperçu" : "Aperçu"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleRestore} className="gap-1.5">
              <RotateCcw className="h-4 w-4" /> Restaurer défaut
            </Button>
            <Button variant="outline" size="sm" onClick={handleSaveAsCopy} disabled={loading} className="gap-1.5">
              <Copy className="h-4 w-4" /> Copie
            </Button>
            <Button variant="outline" size="sm" onClick={handleSave} disabled={loading} className="gap-1.5">
              <Save className="h-4 w-4" /> Brouillon
            </Button>
            <Button size="sm" onClick={handlePublish} disabled={loading} className="gap-1.5">
              <Send className="h-4 w-4" /> Publier
            </Button>
          </>
        )}
      </div>

      {viewMode === "code" ? (
        <SourceCodeEditor
          config={config}
          docType={docType}
          onSaveDraft={async (updatedConfig) => {
            const result = await saveTemplate(docType, updatedConfig, existingId, "draft");
            if (result) {
              setExistingId(result.id);
              setConfig(updatedConfig);
              setTemplateStatus("draft");
            }
          }}
          onPublish={async (updatedConfig) => {
            const result = await publishTemplate(docType, updatedConfig, existingId);
            if (result) {
              setExistingId(result.id);
              setConfig(updatedConfig);
              setTemplateStatus("published");
            }
          }}
          onPreview={(updatedConfig) => {
            setConfig(updatedConfig);
            setShowPreview(true);
            setViewMode("visual");
          }}
          loading={loading}
          templateStatus={templateStatus}
        />
      ) : showPreview ? (
        <TemplatePreview config={config} docType={docType} />
      ) : (
        <div className="grid grid-cols-12 gap-4" style={{ minHeight: "70vh" }}>
          {/* LEFT: Blocks list with DnD */}
          <div className="col-span-3">
            <Card className="p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-foreground">Blocs</h3>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={addCustomTextBlock} className="h-7 px-1.5 text-[10px] gap-1" title="Ajouter un bloc texte">
                    <Plus className="h-3.5 w-3.5" /> Texte
                  </Button>
                  <Button variant="ghost" size="sm" onClick={addEmptyBlock} className="h-7 px-1.5 text-[10px] gap-1" title="Ajouter un bloc vide">
                    <Plus className="h-3.5 w-3.5" /> Vide
                  </Button>
                </div>
              </div>
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="blocks">
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1">
                      {draggableBlocks.map((block, idx) => (
                        <Draggable key={block.id} draggableId={block.id} index={idx}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                                selectedBlockId === block.id
                                  ? "bg-primary/10 text-primary border border-primary/30"
                                  : "hover:bg-muted text-foreground"
                              } ${!block.visible ? "opacity-50" : ""} ${snapshot.isDragging ? "shadow-lg bg-background border border-primary/40" : ""}`}
                              onClick={() => setSelectedBlockId(block.id)}
                            >
                              <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
                              </div>
                              <span className="flex-1 truncate">{block.label}</span>
                              {!block.visible && <EyeOff className="h-3 w-3 text-muted-foreground" />}
                              <button
                                onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }}
                                className="p-0.5 hover:bg-destructive/10 rounded text-destructive"
                                title="Supprimer le bloc"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
              {/* Locked footer block */}
              {footerBlock && (
                <div
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs cursor-pointer transition-colors mt-1 border border-dashed border-muted-foreground/40 ${
                    selectedBlockId === footerBlock.id
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "hover:bg-muted text-foreground"
                  }`}
                  onClick={() => setSelectedBlockId(footerBlock.id)}
                >
                  <div className="text-muted-foreground/40" title="Bloc verrouillé">
                    <GripVertical className="h-3 w-3 shrink-0" />
                  </div>
                  <span className="flex-1 truncate">{footerBlock.label}</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0">🔒</Badge>
                </div>
              )}
            </Card>
          </div>

          {/* CENTER: A4 mini preview */}
          <div className="col-span-5">
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Aperçu A4</h3>
              <div
                className="mx-auto bg-background border border-border rounded shadow-sm overflow-hidden"
                style={{ width: "100%", maxWidth: 380, aspectRatio: "210/297" }}
              >
                <div
                  className="p-3 text-[6px] text-muted-foreground"
                  style={{ display: "flex", flexDirection: "column", height: "100%" }}
                >
                  <div className="space-y-1.5 flex-1">
                    {sortedBlocks.filter((b) => b.visible && b.type !== "footer").map((block) => (
                      <div
                        key={block.id}
                        className={`rounded px-1.5 py-1 border transition-colors cursor-pointer ${
                          selectedBlockId === block.id
                            ? "border-primary bg-primary/5"
                            : "border-transparent hover:border-border"
                        }`}
                        onClick={() => setSelectedBlockId(block.id)}
                      >
                        {block.type === "logo" && (
                          <div className="flex justify-between gap-1">
                            <div>
                              <div className="w-10 h-2.5 bg-primary/20 rounded mb-0.5" />
                              <div className="font-bold text-[6px]" style={{ color: config.globalStyles.secondaryColor }}>
                                {"{{company.name}}"}
                              </div>
                              <div className="text-[4px] text-muted-foreground">{"{{adresse...}}"}</div>
                            </div>
                            <div className="border border-border rounded overflow-hidden" style={{ minWidth: 55 }}>
                              <div className="text-[4px] font-bold px-0.5 py-0.5 text-white" style={{ backgroundColor: config.globalStyles.secondaryColor }}>CLIENT</div>
                              <div className="px-0.5 py-0.5 text-[4px] italic text-muted-foreground">{"{{client...}}"}</div>
                            </div>
                          </div>
                        )}
                        {block.type === "title" && (
                          <div
                            className="rounded px-1.5 py-0.5 text-center font-bold text-[7px]"
                            style={{
                              backgroundColor: block.styles.backgroundColor || config.globalStyles.secondaryColor,
                              color: block.styles.color || "#fff",
                            }}
                          >
                            {TEMPLATE_DOC_LABELS[docType]} — N° {"{{doc.number}}"}
                          </div>
                        )}
                        {block.type === "doc_info" && (
                          <div className="flex gap-1">
                            {["Date", "Échéance", "Conditions"].map((l) => (
                              <div key={l} className="flex-1 bg-muted/50 rounded px-1 py-0.5 border-l-2 border-primary/40">
                                <div className="text-[5px] font-semibold uppercase">{l}</div>
                                <div className="text-[5px] italic text-muted-foreground">{"{{...}}"}</div>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* party block type removed — client info is now in logo block */}
                        {block.type === "lines_table" && (
                          <div>
                            <div className="flex gap-0.5 rounded px-0.5 py-0.5 text-[5px] font-bold text-white" style={{ backgroundColor: config.globalStyles.secondaryColor }}>
                              {["Réf", "Désignation", "Qté", "PU", "HT"].map((h) => (
                                <div key={h} className="flex-1 text-center">{h}</div>
                              ))}
                            </div>
                            {[0, 1, 2].map((i) => (
                              <div key={i} className={`flex gap-0.5 px-0.5 py-0.5 text-[5px] italic text-muted-foreground ${i % 2 === 1 ? "bg-muted/30" : ""}`}>
                                {[1, 2, 3, 4, 5].map((j) => (
                                  <div key={j} className="flex-1 text-center">---</div>
                                ))}
                              </div>
                            ))}
                          </div>
                        )}
                        {block.type === "totals" && (
                          <div className="flex justify-end">
                            <div className="w-1/2 border border-border rounded overflow-hidden">
                              <div className="flex justify-between px-1 py-0.5 text-[5px] border-b border-border">
                                <span>Total HT</span><span className="italic">{"{{...}}"}</span>
                              </div>
                              <div className="flex justify-between px-1 py-0.5 text-[5px] font-bold text-white" style={{ backgroundColor: config.globalStyles.secondaryColor }}>
                                <span>Total TTC</span><span className="italic" style={{ color: config.globalStyles.primaryColor }}>{"{{...}}"}</span>
                              </div>
                            </div>
                          </div>
                        )}
                        {block.type === "notes" && (
                          <div className="border-l-2 pl-1 py-0.5 text-[5px] italic" style={{ borderColor: config.globalStyles.primaryColor, backgroundColor: `${config.globalStyles.primaryColor}10` }}>
                            {"{{notes}}"}
                          </div>
                        )}
                        {block.type === "bank" && (
                          <div className="bg-muted/30 rounded px-1 py-0.5 text-[5px] italic">
                            {"{{bank...}}"}
                          </div>
                        )}
                        {block.type === "custom_text" && (
                          <div className="text-[5px] italic text-muted-foreground px-1 py-0.5 bg-muted/20 rounded">
                            {block.customContent || "Texte personnalisé..."}
                          </div>
                        )}
                        {block.type === "empty" && (
                          <div className="py-2 border border-dashed border-muted-foreground/30 rounded text-center text-[5px] text-muted-foreground italic">
                            Bloc vide
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {/* Locked footer at bottom of A4 mini preview */}
                  {footerBlock && footerBlock.visible && (
                    <div
                      className={`rounded px-1.5 py-1 border transition-colors cursor-pointer mt-auto ${
                        selectedBlockId === footerBlock.id
                          ? "border-primary bg-primary/5"
                          : "border-transparent hover:border-border"
                      }`}
                      onClick={() => setSelectedBlockId(footerBlock.id)}
                    >
                      <div className="text-center text-[4px] border-t pt-1 italic" style={{ borderColor: config.globalStyles.primaryColor, color: "#7A919E" }}>
                        <div>{"{{company.name}}"} — {"{{forme_juridique}}"} au capital de {"{{capital}}"} MAD</div>
                        <div>Tél: {"{{phone}}"} | Email: {"{{email}}"}</div>
                        <div>ICE: {"{{ice}}"} | IF: {"{{if}}"} | RC: {"{{rc}}"}</div>
                        <div className="text-[3.5px]">Page X / Y</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* RIGHT: Properties panel */}
          <div className="col-span-4">
            <Card className="p-3">
              <ScrollArea className="h-[65vh]">
                {/* Global styles */}
                <h3 className="text-sm font-semibold text-foreground mb-2">Styles globaux</h3>
                <div className="space-y-3 mb-4">
                  <div>
                    <Label className="text-xs">Couleur principale</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        value={config.globalStyles.primaryColor}
                        onChange={(e) => updateGlobalStyle("primaryColor", e.target.value)}
                        className="h-8 w-10 rounded border cursor-pointer"
                      />
                      <Input
                        value={config.globalStyles.primaryColor}
                        onChange={(e) => updateGlobalStyle("primaryColor", e.target.value)}
                        className="h-8 text-xs flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Couleur secondaire</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        value={config.globalStyles.secondaryColor}
                        onChange={(e) => updateGlobalStyle("secondaryColor", e.target.value)}
                        className="h-8 w-10 rounded border cursor-pointer"
                      />
                      <Input
                        value={config.globalStyles.secondaryColor}
                        onChange={(e) => updateGlobalStyle("secondaryColor", e.target.value)}
                        className="h-8 text-xs flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Police</Label>
                    <Select value={config.globalStyles.fontFamily} onValueChange={(v) => updateGlobalStyle("fontFamily", v)}>
                      <SelectTrigger className="h-8 text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Segoe UI, Arial, sans-serif">Segoe UI</SelectItem>
                        <SelectItem value="Arial, Helvetica, sans-serif">Arial</SelectItem>
                        <SelectItem value="Georgia, serif">Georgia</SelectItem>
                        <SelectItem value="Courier New, monospace">Courier New</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator className="my-3" />

                {/* Placeholders dropdown */}
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-foreground mb-2">Champs dynamiques</h3>
                  <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-1">
                    {DYNAMIC_PLACEHOLDERS.map((ph) => (
                      <div key={ph.key} className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">{ph.label}</span>
                        <code className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono">{ph.key}</code>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator className="my-3" />

                {/* Block properties */}
                {selectedBlock ? (
                  <>
                    <h3 className="text-sm font-semibold text-foreground mb-2">
                      {selectedBlock.label}
                    </h3>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Visible</Label>
                        <Switch
                          checked={selectedBlock.visible}
                          onCheckedChange={(v) => updateBlock(selectedBlock.id, { visible: v })}
                        />
                      </div>

                      <div>
                        <Label className="text-xs">Taille de police ({selectedBlock.styles.fontSize || 9}px)</Label>
                        <Slider
                          value={[selectedBlock.styles.fontSize || 9]}
                          onValueChange={([v]) => updateBlockStyle(selectedBlock.id, "fontSize", v)}
                          min={6}
                          max={24}
                          step={1}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-xs">Espacement ({selectedBlock.styles.spacing || 10}px)</Label>
                        <Slider
                          value={[selectedBlock.styles.spacing || 10]}
                          onValueChange={([v]) => updateBlockStyle(selectedBlock.id, "spacing", v)}
                          min={0}
                          max={30}
                          step={1}
                          className="mt-1"
                        />
                      </div>


                      {selectedBlock.styles.color !== undefined && (
                        <div>
                          <Label className="text-xs">Couleur texte</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              type="color"
                              value={selectedBlock.styles.color}
                              onChange={(e) => updateBlockStyle(selectedBlock.id, "color", e.target.value)}
                              className="h-7 w-8 rounded border cursor-pointer"
                            />
                            <Input
                              value={selectedBlock.styles.color}
                              onChange={(e) => updateBlockStyle(selectedBlock.id, "color", e.target.value)}
                              className="h-7 text-xs flex-1"
                            />
                          </div>
                        </div>
                      )}

                      {selectedBlock.styles.backgroundColor !== undefined && (
                        <div>
                          <Label className="text-xs">Couleur fond</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              type="color"
                              value={selectedBlock.styles.backgroundColor}
                              onChange={(e) => updateBlockStyle(selectedBlock.id, "backgroundColor", e.target.value)}
                              className="h-7 w-8 rounded border cursor-pointer"
                            />
                            <Input
                              value={selectedBlock.styles.backgroundColor}
                              onChange={(e) => updateBlockStyle(selectedBlock.id, "backgroundColor", e.target.value)}
                              className="h-7 text-xs flex-1"
                            />
                          </div>
                        </div>
                      )}

                      {/* Alignment for custom_text */}
                      {selectedBlock.type === "custom_text" && (
                        <>
                          <div>
                            <Label className="text-xs">Alignement</Label>
                            <Select
                              value={selectedBlock.styles.alignment || "left"}
                              onValueChange={(v) => updateBlockStyle(selectedBlock.id, "alignment", v)}
                            >
                              <SelectTrigger className="h-8 text-xs mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="left">Gauche</SelectItem>
                                <SelectItem value="center">Centre</SelectItem>
                                <SelectItem value="right">Droite</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Contenu</Label>
                            <Textarea
                              value={selectedBlock.customContent || ""}
                              onChange={(e) => updateBlock(selectedBlock.id, { customContent: e.target.value })}
                              className="mt-1 text-xs min-h-[60px]"
                              placeholder="Saisissez votre texte ou utilisez des placeholders {{...}}"
                            />
                          </div>
                        </>
                      )}

                      {/* Field visibility toggles */}
                      {selectedBlock.fields && Object.keys(selectedBlock.fields).length > 0 && (
                        <>
                          <Separator className="my-2" />
                          <h4 className="text-xs font-semibold text-foreground">Champs visibles</h4>
                          <div className="space-y-1.5">
                            {Object.entries(selectedBlock.fields).map(([field, visible]) => (
                              <div key={field} className="flex items-center justify-between">
                                <Label className="text-[11px] text-muted-foreground">
                                  {FIELD_LABELS[field] || field}
                                </Label>
                                <Switch
                                  checked={visible as boolean}
                                  onCheckedChange={(v) => updateBlockField(selectedBlock.id, field, v)}
                                />
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Sélectionnez un bloc pour modifier ses propriétés
                  </p>
                )}
              </ScrollArea>
            </Card>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
