import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, Send, Eye, RotateCcw, AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";
import {
  DYNAMIC_PLACEHOLDERS,
  type TemplateConfig,
  type TemplateDocType,
  TEMPLATE_DOC_LABELS,
} from "@/hooks/useDocumentTemplates";

interface SourceCodeEditorProps {
  config: TemplateConfig;
  docType: TemplateDocType;
  onSaveDraft: (config: TemplateConfig) => Promise<void>;
  onPublish: (config: TemplateConfig) => Promise<void>;
  onPreview: (config: TemplateConfig) => void;
  loading: boolean;
  templateStatus: string;
}

/** Generate default HTML from block-based config for initial code view */
function generateHtmlFromConfig(config: TemplateConfig, docType: TemplateDocType): string {
  const g = config.globalStyles;
  const sorted = [...config.blocks].sort((a, b) => a.order - b.order).filter(b => b.visible);
  const contentBlocks = sorted.filter(b => b.type !== "footer");
  const footerBlock = sorted.find(b => b.type === "footer");

  let html = `<div id="page-content">\n`;

  for (const block of contentBlocks) {
    const mb = block.styles.spacing || 10;

    if (block.type === "logo") {
      html += `  <!-- Bloc: Logo & Société + Client -->\n`;
      html += `  <div style="margin-bottom:${mb}px; display:flex; justify-content:space-between; border-bottom:2.5px solid ${g.primaryColor}; padding-bottom:12px">\n`;
      html += `    <div>\n`;
      html += `      <img src="{{company.logo_url}}" style="max-height:55px; max-width:160px; object-fit:contain; margin-bottom:4px" />\n`;
      html += `      <div style="font-size:${block.styles.fontSize || 13}px; font-weight:700; color:${g.secondaryColor}">{{company.name}}</div>\n`;
      html += `      <div style="font-size:7.5px; color:#4A6070">{{company.address}}</div>\n`;
      html += `      <div style="font-size:7.5px; color:#4A6070">Tél: {{company.phone}}</div>\n`;
      html += `      <div style="font-size:7.5px; color:#4A6070">{{company.email}}</div>\n`;
      html += `    </div>\n`;
      html += `    <div style="border:1px solid #D4E2E9; border-radius:5px; overflow:hidden; min-width:200px">\n`;
      html += `      <div style="background:${g.secondaryColor}; padding:5px 10px">\n`;
      html += `        <span style="font-size:7.5px; color:#fff; font-weight:700; letter-spacing:.8px">CLIENT / FOURNISSEUR</span>\n`;
      html += `      </div>\n`;
      html += `      <div style="padding:9px 10px; min-height:55px">\n`;
      html += `        <div style="font-size:9.5px; font-weight:700; color:${g.secondaryColor}">{{partner.name}}</div>\n`;
      html += `        <div style="font-size:7.5px; color:#4A6070">{{partner.address}}</div>\n`;
      html += `        <div style="font-size:7.5px; color:${g.primaryColor}; font-weight:700">ICE: {{partner.ice}}</div>\n`;
      html += `      </div>\n`;
      html += `    </div>\n`;
      html += `  </div>\n\n`;
    }

    if (block.type === "title") {
      html += `  <!-- Bloc: Titre -->\n`;
      html += `  <div style="margin-bottom:${mb}px; background:${block.styles.backgroundColor || g.secondaryColor}; border-radius:4px; padding:9px 16px; display:flex; justify-content:space-between; align-items:center">\n`;
      html += `    <span style="font-size:${block.styles.fontSize || 16}px; font-weight:700; color:${block.styles.color || "#fff"}; letter-spacing:1.5px">${TEMPLATE_DOC_LABELS[docType].toUpperCase()} — N° {{doc.number}}</span>\n`;
      html += `    <div style="font-size:8px; color:#B0C8D8">Date: {{doc.date}}</div>\n`;
      html += `  </div>\n\n`;
    }

    if (block.type === "doc_info") {
      html += `  <!-- Bloc: Informations document -->\n`;
      html += `  <div style="margin-bottom:${mb}px; display:flex; gap:8px">\n`;
      html += `    <div style="flex:1; background:#EBF8FD; border-radius:4px; padding:6px 8px; border-left:3px solid ${g.primaryColor}">\n`;
      html += `      <div style="font-size:7px; font-weight:700; color:#4A6070; text-transform:uppercase">Date</div>\n`;
      html += `      <div style="font-size:8.5px; font-weight:700">{{doc.date}}</div>\n`;
      html += `    </div>\n`;
      html += `    <div style="flex:1; background:#EBF8FD; border-radius:4px; padding:6px 8px; border-left:3px solid ${g.primaryColor}">\n`;
      html += `      <div style="font-size:7px; font-weight:700; color:#4A6070; text-transform:uppercase">Échéance</div>\n`;
      html += `      <div style="font-size:8.5px; font-weight:700">{{doc.due_date}}</div>\n`;
      html += `    </div>\n`;
      html += `  </div>\n\n`;
    }

    if (block.type === "lines_table") {
      html += `  <!-- Bloc: Tableau des lignes -->\n`;
      html += `  <table style="width:100%; border-collapse:collapse; margin-bottom:${mb}px">\n`;
      html += `    <thead>\n`;
      html += `      <tr style="background:${g.secondaryColor}">\n`;
      html += `        <th style="color:#fff; font-size:7.5px; font-weight:700; padding:6px 5px; text-align:center">Réf.</th>\n`;
      html += `        <th style="color:#fff; font-size:7.5px; font-weight:700; padding:6px 5px; text-align:left">Désignation</th>\n`;
      html += `        <th style="color:#fff; font-size:7.5px; font-weight:700; padding:6px 5px; text-align:center">Qté</th>\n`;
      html += `        <th style="color:#fff; font-size:7.5px; font-weight:700; padding:6px 5px; text-align:right">P.U.</th>\n`;
      html += `        <th style="color:#fff; font-size:7.5px; font-weight:700; padding:6px 5px; text-align:center">TVA</th>\n`;
      html += `        <th style="color:#fff; font-size:7.5px; font-weight:700; padding:6px 5px; text-align:right">Total HT</th>\n`;
      html += `        <th style="color:#fff; font-size:7.5px; font-weight:700; padding:6px 5px; text-align:right">Total TTC</th>\n`;
      html += `      </tr>\n`;
      html += `    </thead>\n`;
      html += `    <tbody>\n`;
      html += `      <!-- {{#each lines}} -->\n`;
      html += `      <tr style="border-bottom:1px solid #D4E2E9">\n`;
      html += `        <td style="padding:5px; font-size:8px; text-align:center">{{line.ref}}</td>\n`;
      html += `        <td style="padding:5px; font-size:8px">{{line.description}}</td>\n`;
      html += `        <td style="padding:5px; font-size:8px; text-align:center">{{line.quantity}}</td>\n`;
      html += `        <td style="padding:5px; font-size:8px; text-align:right">{{line.unit_price}}</td>\n`;
      html += `        <td style="padding:5px; font-size:8px; text-align:center">{{line.tva_rate}}%</td>\n`;
      html += `        <td style="padding:5px; font-size:8px; text-align:right; font-weight:600">{{line.total_ht}}</td>\n`;
      html += `        <td style="padding:5px; font-size:8px; text-align:right; font-weight:600">{{line.total_ttc}}</td>\n`;
      html += `      </tr>\n`;
      html += `      <!-- {{/each}} -->\n`;
      html += `    </tbody>\n`;
      html += `  </table>\n\n`;
    }

    if (block.type === "totals") {
      html += `  <!-- Bloc: Totaux -->\n`;
      html += `  <div style="margin-bottom:${mb}px; display:flex; justify-content:flex-end">\n`;
      html += `    <table style="width:210px; border:1px solid #D4E2E9; border-radius:5px; overflow:hidden; border-collapse:collapse">\n`;
      html += `      <tr style="border-bottom:1px solid #D4E2E9"><td style="font-size:8px; color:#4A6070; padding:5px 10px">Total HT</td><td style="font-size:8px; font-weight:700; text-align:right; padding:5px 10px">{{totals.ht}} MAD</td></tr>\n`;
      html += `      <tr style="border-bottom:1px solid #D4E2E9"><td style="font-size:8px; color:#4A6070; padding:5px 10px">Total TVA</td><td style="font-size:8px; font-weight:700; text-align:right; padding:5px 10px">{{totals.tva}} MAD</td></tr>\n`;
      html += `      <tr style="background:${g.secondaryColor}"><td style="font-size:10px; font-weight:700; color:#fff; padding:8px 10px">Total TTC</td><td style="font-size:10px; font-weight:700; color:${g.primaryColor}; text-align:right; padding:8px 10px">{{totals.ttc}} MAD</td></tr>\n`;
      html += `    </table>\n`;
      html += `  </div>\n\n`;
    }

    if (block.type === "notes") {
      html += `  <!-- Bloc: Notes -->\n`;
      html += `  <div style="margin-bottom:${mb}px; border-left:3px solid ${g.primaryColor}; background:${g.primaryColor}10; padding:7px 9px; border-radius:3px">\n`;
      html += `    <div style="font-size:7.5px; font-weight:700; color:#4A6070; text-transform:uppercase; margin-bottom:2px">Notes</div>\n`;
      html += `    <div style="font-size:8px; line-height:1.4">{{notes}}</div>\n`;
      html += `  </div>\n\n`;
    }

    if (block.type === "bank") {
      html += `  <!-- Bloc: Coordonnées bancaires -->\n`;
      html += `  <div style="margin-bottom:${mb}px; background:#EBF8FD; border-radius:3px; padding:6px 8px">\n`;
      html += `    <div style="font-size:7px; font-weight:700; color:${g.secondaryColor}; text-transform:uppercase; margin-bottom:3px">Coordonnées bancaires</div>\n`;
      html += `    <div style="font-size:7px"><span style="color:#4A6070; display:inline-block; width:55px">Banque</span>{{bank.name}}</div>\n`;
      html += `    <div style="font-size:7px"><span style="color:#4A6070; display:inline-block; width:55px">RIB</span>{{bank.rib}}</div>\n`;
      html += `    <div style="font-size:7px"><span style="color:#4A6070; display:inline-block; width:55px">SWIFT</span>{{bank.swift}}</div>\n`;
      html += `  </div>\n\n`;
    }

    if (block.type === "custom_text") {
      html += `  <!-- Bloc: Texte personnalisé -->\n`;
      html += `  <div style="margin-bottom:${mb}px; font-size:${block.styles.fontSize || 8}px; text-align:${block.styles.alignment || "left"}; color:${block.styles.color || "#1A2B3C"}">${block.customContent || ""}</div>\n\n`;
    }

    if (block.type === "empty") {
      html += `  <!-- Bloc: Espace vide -->\n`;
      html += `  <div style="margin-bottom:${mb}px; min-height:${block.styles.spacing || 40}px"></div>\n\n`;
    }
  }

  html += `</div>\n`;

  if (footerBlock) {
    html += `\n<!-- Pied de page (position fixe en impression) -->\n`;
    html += `<div id="page-footer">\n`;
    html += `  <div style="border-top:1.5px solid ${g.primaryColor}; padding-top:6px; font-size:6.5px; color:#7A919E; line-height:1.7; display:flex; justify-content:space-between">\n`;
    html += `    <div style="flex:1; text-align:left">\n`;
    html += `      <div style="font-weight:700; color:${g.secondaryColor}; font-size:7px">{{company.name}} — {{forme_juridique}}</div>\n`;
    html += `      <div>Tél: {{company.phone}}</div>\n`;
    html += `      <div>{{company.email}}</div>\n`;
    html += `    </div>\n`;
    html += `    <div style="flex:1; text-align:center">\n`;
    html += `      <div>ICE: {{company.ice}}</div>\n`;
    html += `      <div>IF: {{company.if}}</div>\n`;
    html += `      <div>RC: {{company.rc}}</div>\n`;
    html += `    </div>\n`;
    html += `    <div style="flex:1; text-align:right">\n`;
    html += `      <div style="font-weight:600">{{bank.name}}</div>\n`;
    html += `      <div>RIB: {{bank.rib}}</div>\n`;
    html += `    </div>\n`;
    html += `  </div>\n`;
    html += `</div>\n`;
  }

  return html;
}

function generateCssFromConfig(config: TemplateConfig): string {
  const g = config.globalStyles;
  return `@page { size: A4; margin: 12mm 15mm 24mm 15mm; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: ${g.fontFamily};
  font-size: ${g.bodyFontSize}px;
  color: #1A2B3C;
  line-height: 1.45;
  background: #fff;
}

#page-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 0 15mm;
  background: #fff;
}

#page-content {
  padding-bottom: 55px;
}

@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  #page-footer { position: fixed; bottom: 0; }
  @page { margin-bottom: 20mm; }
}`;
}

function validateHtml(html: string): string | null {
  // Basic validation: check for unmatched tags
  const openTags: string[] = [];
  const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*\/?>/g;
  const selfClosing = new Set(["img", "br", "hr", "input", "meta", "link", "area", "base", "col", "embed", "source", "track", "wbr"]);
  let match;

  while ((match = tagRegex.exec(html)) !== null) {
    const fullTag = match[0];
    const tagName = match[1].toLowerCase();

    if (selfClosing.has(tagName) || fullTag.endsWith("/>")) continue;

    if (fullTag.startsWith("</")) {
      if (openTags.length === 0 || openTags[openTags.length - 1] !== tagName) {
        return `Balise fermante </${tagName}> inattendue ou mal positionnée.`;
      }
      openTags.pop();
    } else if (!fullTag.startsWith("<!--")) {
      openTags.push(tagName);
    }
  }

  if (openTags.length > 0) {
    return `Balise(s) non fermée(s) : <${openTags.join(">, <")}>`;
  }

  return null;
}

export function SourceCodeEditor({
  config,
  docType,
  onSaveDraft,
  onPublish,
  onPreview,
  loading,
  templateStatus,
}: SourceCodeEditorProps) {
  const [htmlCode, setHtmlCode] = useState(() =>
    config.customHtml || generateHtmlFromConfig(config, docType)
  );
  const [cssCode, setCssCode] = useState(() =>
    config.customCss || generateCssFromConfig(config)
  );
  const [showCodePreview, setShowCodePreview] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const htmlRef = useRef<HTMLTextAreaElement>(null);
  const cssRef = useRef<HTMLTextAreaElement>(null);

  // Sync when config changes from visual editor
  useEffect(() => {
    if (!config.isCustomCode) {
      setHtmlCode(generateHtmlFromConfig(config, docType));
      setCssCode(generateCssFromConfig(config));
    }
  }, [config.blocks, config.globalStyles, config.isCustomCode, docType]);

  const buildConfigWithCode = useCallback((): TemplateConfig => {
    return {
      ...config,
      isCustomCode: true,
      customHtml: htmlCode,
      customCss: cssCode,
    };
  }, [config, htmlCode, cssCode]);

  const validate = useCallback((): boolean => {
    const error = validateHtml(htmlCode);
    if (error) {
      setValidationError(error);
      toast.error("Le code du modèle contient une erreur. Veuillez corriger avant publication.");
      return false;
    }
    setValidationError(null);
    return true;
  }, [htmlCode]);

  const handleSaveDraft = async () => {
    if (!validate()) return;
    await onSaveDraft(buildConfigWithCode());
  };

  const handlePublish = async () => {
    if (!validate()) return;
    await onPublish(buildConfigWithCode());
  };

  const handlePreview = () => {
    if (!validate()) return;
    onPreview(buildConfigWithCode());
  };

  const handleRestoreFromVisual = () => {
    setHtmlCode(generateHtmlFromConfig(config, docType));
    setCssCode(generateCssFromConfig(config));
    setValidationError(null);
    toast.success("Code restauré depuis la vue visuelle");
  };

  const lineCount = (text: string) => text.split("\n").length;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={templateStatus === "published" ? "default" : "secondary"} className="text-xs">
          {templateStatus === "published" ? "Publié" : "Brouillon"}
        </Badge>
        <Badge variant="outline" className="text-xs gap-1">
          <Info className="h-3 w-3" /> Mode code source
        </Badge>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={handleRestoreFromVisual} className="gap-1.5">
          <RotateCcw className="h-4 w-4" /> Restaurer visuel
        </Button>
        <Button variant="outline" size="sm" onClick={handlePreview} className="gap-1.5">
          <Eye className="h-4 w-4" /> Aperçu
        </Button>
        <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={loading} className="gap-1.5">
          <Save className="h-4 w-4" /> Enregistrer brouillon
        </Button>
        <Button size="sm" onClick={handlePublish} disabled={loading} className="gap-1.5">
          <Send className="h-4 w-4" /> Publier
        </Button>
      </div>

      {validationError && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {showCodePreview ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Aperçu du code</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowCodePreview(false)}>
              Retour à l'éditeur
            </Button>
          </div>
          <Card className="p-0 overflow-hidden">
            <iframe
              srcDoc={`<!DOCTYPE html><html><head><style>${cssCode}</style></head><body>${htmlCode}</body></html>`}
              className="w-full border-0"
              style={{ height: 842, maxWidth: 595, margin: "0 auto", display: "block" }}
              title="Aperçu template"
              sandbox="allow-same-origin"
            />
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-4">
          {/* Code editor area */}
          <div className="col-span-9">
            <Tabs defaultValue="html">
              <TabsList>
                <TabsTrigger value="html">HTML</TabsTrigger>
                <TabsTrigger value="css">CSS</TabsTrigger>
              </TabsList>
              <TabsContent value="html">
                <Card className="p-0 overflow-hidden">
                  <div className="flex bg-muted/50 border-b px-3 py-1.5 text-xs text-muted-foreground">
                    <span>HTML — {lineCount(htmlCode)} lignes</span>
                  </div>
                  <div className="relative">
                    {/* Line numbers */}
                    <div className="absolute left-0 top-0 bottom-0 w-10 bg-muted/30 border-r text-right pr-2 pt-3 select-none pointer-events-none overflow-hidden" style={{ fontFamily: "monospace", fontSize: 12, lineHeight: "1.5", color: "hsl(var(--muted-foreground))" }}>
                      {Array.from({ length: lineCount(htmlCode) }, (_, i) => (
                        <div key={i}>{i + 1}</div>
                      ))}
                    </div>
                    <textarea
                      ref={htmlRef}
                      value={htmlCode}
                      onChange={(e) => { setHtmlCode(e.target.value); setValidationError(null); }}
                      className="w-full min-h-[500px] p-3 pl-12 font-mono text-xs bg-background text-foreground resize-y outline-none border-0"
                      style={{ lineHeight: "1.5", tabSize: 2 }}
                      spellCheck={false}
                      wrap="off"
                    />
                  </div>
                </Card>
              </TabsContent>
              <TabsContent value="css">
                <Card className="p-0 overflow-hidden">
                  <div className="flex bg-muted/50 border-b px-3 py-1.5 text-xs text-muted-foreground">
                    <span>CSS — {lineCount(cssCode)} lignes</span>
                  </div>
                  <div className="relative">
                    <div className="absolute left-0 top-0 bottom-0 w-10 bg-muted/30 border-r text-right pr-2 pt-3 select-none pointer-events-none overflow-hidden" style={{ fontFamily: "monospace", fontSize: 12, lineHeight: "1.5", color: "hsl(var(--muted-foreground))" }}>
                      {Array.from({ length: lineCount(cssCode) }, (_, i) => (
                        <div key={i}>{i + 1}</div>
                      ))}
                    </div>
                    <textarea
                      ref={cssRef}
                      value={cssCode}
                      onChange={(e) => { setCssCode(e.target.value); setValidationError(null); }}
                      className="w-full min-h-[500px] p-3 pl-12 font-mono text-xs bg-background text-foreground resize-y outline-none border-0"
                      style={{ lineHeight: "1.5", tabSize: 2 }}
                      spellCheck={false}
                      wrap="off"
                    />
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right panel: placeholders reference */}
          <div className="col-span-3">
            <Card className="p-3">
              <ScrollArea className="h-[550px]">
                <h3 className="text-sm font-semibold text-foreground mb-2">Champs dynamiques</h3>
                <p className="text-[11px] text-muted-foreground mb-3">
                  Utilisez ces placeholders dans votre HTML. Ils seront remplacés par les données réelles lors de l'impression.
                </p>
                <div className="space-y-1.5">
                  {DYNAMIC_PLACEHOLDERS.map((ph) => (
                    <div key={ph.key} className="flex items-center justify-between gap-1">
                      <span className="text-[10px] text-muted-foreground truncate">{ph.label}</span>
                      <code
                        className="bg-muted px-1.5 py-0.5 rounded text-[9px] font-mono cursor-pointer hover:bg-primary/10 transition-colors shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(ph.key);
                          toast.success(`${ph.key} copié`);
                        }}
                        title="Cliquer pour copier"
                      >
                        {ph.key}
                      </code>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-2 rounded bg-muted/50 border text-[10px] text-muted-foreground space-y-1">
                  <div className="font-semibold text-foreground">Boucle de lignes :</div>
                  <code className="block bg-background rounded p-1.5 text-[9px]">
                    {"<!-- {{#each lines}} -->"}<br />
                    {"  <tr>...</tr>"}<br />
                    {"<!-- {{/each}} -->"}
                  </code>
                </div>

                <div className="mt-4 p-2 rounded bg-muted/50 border text-[10px] text-muted-foreground space-y-1">
                  <div className="font-semibold text-foreground">Structure requise :</div>
                  <ul className="list-disc pl-3 space-y-0.5">
                    <li><code>#page-content</code> — contenu principal</li>
                    <li><code>#page-footer</code> — pied de page fixe</li>
                  </ul>
                </div>
              </ScrollArea>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
