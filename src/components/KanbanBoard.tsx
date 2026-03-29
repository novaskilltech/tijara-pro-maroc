import { useState, useMemo } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────

export interface KanbanColumn {
  id: string;
  label: string;
  className: string; // badge/header color classes
}

export interface KanbanCard {
  id: string;
  status: string;
  title: string;        // document number
  subtitle?: string;    // customer/supplier name
  amount?: number;
  date?: string;
  dueDate?: string;
  badges?: { label: string; className: string }[];
  extra?: string;       // items count etc.
}

export interface KanbanTransition {
  from: string;
  to: string;
  requiresAdmin?: boolean;
  requiresReason?: boolean;
  action?: (itemId: string, reason?: string) => Promise<boolean | void>;
}

interface KanbanBoardProps {
  columns: KanbanColumn[];
  cards: KanbanCard[];
  transitions: KanbanTransition[];
  isAdmin: boolean;
  onCardClick?: (id: string) => void;
  currencySymbol?: string;
}

// ─── Component ────────────────────────────────────────────────────────

export function KanbanBoard({
  columns,
  cards,
  transitions,
  isAdmin,
  onCardClick,
  currencySymbol = "MAD",
}: KanbanBoardProps) {
  const [reasonDialog, setReasonDialog] = useState<{ itemId: string; from: string; to: string } | null>(null);
  const [reason, setReason] = useState("");
  const [processing, setProcessing] = useState(false);

  // Group cards by status
  const grouped = useMemo(() => {
    const map: Record<string, KanbanCard[]> = {};
    for (const col of columns) map[col.id] = [];
    for (const card of cards) {
      if (map[card.status]) map[card.status].push(card);
    }
    return map;
  }, [columns, cards]);

  // Column totals
  const columnTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const col of columns) {
      totals[col.id] = (grouped[col.id] || []).reduce((s, c) => s + (c.amount || 0), 0);
    }
    return totals;
  }, [columns, grouped]);

  const findTransition = (from: string, to: string) =>
    transitions.find((t) => t.from === from && t.to === to);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const from = result.source.droppableId;
    const to = result.destination.droppableId;
    if (from === to) return;

    const itemId = result.draggableId;
    const transition = findTransition(from, to);

    if (!transition) {
      toast({ title: "Transition non autorisée", description: `${from} → ${to}`, variant: "destructive" });
      return;
    }

    if (transition.requiresAdmin && !isAdmin) {
      toast({ title: "Action réservée", description: "Seul un administrateur peut effectuer cette transition.", variant: "destructive" });
      return;
    }

    if (transition.requiresReason) {
      setReasonDialog({ itemId, from, to });
      return;
    }

    await executeTransition(itemId, from, to);
  };

  const executeTransition = async (itemId: string, from: string, to: string, transitionReason?: string) => {
    const transition = findTransition(from, to);
    if (!transition) return;

    setProcessing(true);
    try {
      if (transition.action) {
        const result = await transition.action(itemId, transitionReason);
        if (result === false) {
          toast({ title: "Transition refusée", variant: "destructive" });
          return;
        }
      }

      // Audit log
      const { data: { user } } = await supabase.auth.getUser();
      await (supabase as any).from("audit_logs").insert({
        action: "kanban_status_change",
        table_name: "kanban",
        record_id: itemId,
        details: `Statut: ${from} → ${to}${transitionReason ? ` | Motif: ${transitionReason}` : ""}`,
        user_id: user?.id,
      });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleReasonConfirm = async () => {
    if (!reasonDialog || !reason.trim()) return;
    await executeTransition(reasonDialog.itemId, reasonDialog.from, reasonDialog.to, reason);
    setReasonDialog(null);
    setReason("");
  };

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4 min-h-[500px]" style={{ scrollbarWidth: "thin" }}>
          {columns.map((col) => {
            const colCards = grouped[col.id] || [];
            const total = columnTotals[col.id] || 0;

            return (
              <div key={col.id} className="flex-shrink-0 w-[280px] flex flex-col">
                {/* Column header */}
                <div className={`rounded-t-lg px-3 py-2.5 border border-b-0 ${col.className}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{col.label}</span>
                    <Badge variant="secondary" className="text-xs h-5 px-1.5 bg-card/60 text-foreground">
                      {colCards.length}
                    </Badge>
                  </div>
                  {total > 0 && (
                    <div className="text-xs mt-1 opacity-80 font-medium">
                      {total.toLocaleString("fr-MA")} {currencySymbol}
                    </div>
                  )}
                </div>

                {/* Droppable area */}
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 border border-t-0 rounded-b-lg p-2 space-y-2 transition-colors min-h-[120px] overflow-y-auto max-h-[calc(100vh-300px)] ${
                        snapshot.isDraggingOver
                          ? "bg-primary/5 border-primary/30"
                          : "bg-muted/30 border-border"
                      }`}
                    >
                      {colCards.map((card, idx) => (
                        <Draggable key={card.id} draggableId={card.id} index={idx}>
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              onClick={() => onCardClick?.(card.id)}
                              className={`bg-card rounded-lg border p-3 cursor-pointer transition-all hover:shadow-md ${
                                dragSnapshot.isDragging
                                  ? "shadow-lg ring-2 ring-primary/30 rotate-1"
                                  : "shadow-sm hover:border-primary/30"
                              }`}
                            >
                              {/* Card title */}
                              <div className="font-mono text-xs font-semibold text-foreground mb-1">
                                {card.title}
                              </div>

                              {/* Subtitle */}
                              {card.subtitle && (
                                <div className="text-sm text-foreground/80 font-medium truncate mb-1.5">
                                  {card.subtitle}
                                </div>
                              )}

                              {/* Amount */}
                              {card.amount !== undefined && card.amount > 0 && (
                                <div className="text-sm font-bold text-foreground">
                                  {card.amount.toLocaleString("fr-MA")} {currencySymbol}
                                </div>
                              )}

                              {/* Date row */}
                              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                                {card.date && <span>{card.date}</span>}
                                {card.extra && <span>{card.extra}</span>}
                              </div>

                              {/* Due date */}
                              {card.dueDate && (
                                <div className={`text-xs mt-1 ${
                                  new Date(card.dueDate) < new Date()
                                    ? "text-destructive font-semibold"
                                    : "text-muted-foreground"
                                }`}>
                                  Éch: {card.dueDate}
                                </div>
                              )}

                              {/* Badges */}
                              {card.badges && card.badges.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {card.badges.map((b, i) => (
                                    <Badge key={i} className={`text-[10px] px-1.5 py-0 h-4 ${b.className}`}>
                                      {b.label}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}

                      {colCards.length === 0 && !snapshot.isDraggingOver && (
                        <div className="text-center py-6 text-xs text-muted-foreground/60">
                          Aucun document
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Reason dialog */}
      <AlertDialog open={!!reasonDialog} onOpenChange={() => { setReasonDialog(null); setReason(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Motif requis</AlertDialogTitle>
            <AlertDialogDescription>Veuillez saisir un motif pour cette transition.</AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            placeholder="Motif..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            autoFocus
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleReasonConfirm} disabled={!reason.trim() || processing}>
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
