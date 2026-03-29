import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface AuditLog {
  id: string;
  action: string;
  table_name: string;
  record_id: string;
  details: string | null;
  created_at: string;
  user_id: string | null;
}

interface Profile {
  user_id: string;
  email: string;
  full_name: string;
}

interface AuditLogViewerProps {
  tableName: string;
  recordId: string;
  companyId: string | null;
}

export function AuditLogViewer({ tableName, recordId, companyId }: AuditLogViewerProps) {
  const [logs, setLogs] = useState<(AuditLog & { user?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      if (!recordId || !tableName) return;
      
      setLoading(true);
      
      // 1. Fetch logs
      let query = supabase
        .from("audit_logs")
        .select("*")
        .eq("table_name", tableName)
        .eq("record_id", recordId)
        .order("created_at", { ascending: false });
        
      if (companyId) {
        query = query.eq("company_id", companyId);
      }
        
      const { data: logsData, error: logsError } = await query;
        
      if (logsError || !logsData) {
        console.error("Erreur Audit Logs:", logsError);
        setLoading(false);
        return;
      }

      // 2. Extract unique user_ids
      const userIds = [...new Set(logsData.map(l => l.user_id).filter(Boolean))] as string[];
      
      // 3. Fetch corresponding profiles
      let profilesMap: Record<string, Profile> = {};
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, email, full_name")
          .in("user_id", userIds);
          
        if (profilesData) {
          profilesData.forEach(p => {
            profilesMap[p.user_id] = p as Profile;
          });
        }
      }

      // 4. Merge
      const mergedLogs = logsData.map(log => ({
        ...(log as AuditLog),
        user: log.user_id ? profilesMap[log.user_id] : undefined
      }));

      setLogs(mergedLogs);
      setLoading(false);
    }
    
    fetchLogs();
  }, [tableName, recordId, companyId]);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <Card className="shadow-none border-dashed bg-muted/20 h-full">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground h-full">
          <History className="h-8 w-8 mb-4 opacity-50" />
          <p>Aucun historique disponible pour cet enregistrement.</p>
        </CardContent>
      </Card>
    );
  }

  const getActionColor = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes("create") || act.includes("insert")) return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (act.includes("update") || act.includes("confirm") || act.includes("validate")) return "bg-blue-100 text-blue-800 border-blue-200";
    if (act.includes("delete") || act.includes("cancel")) return "bg-red-100 text-red-800 border-red-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getActionLabel = (action: string) => {
    return action.replace(/_/g, " ").toUpperCase();
  };

  return (
    <Card className="h-full flex flex-col border-0 rounded-none bg-transparent">
      <CardHeader className="py-3 px-4 bg-muted/30 border-b">
        <CardTitle className="text-sm flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          Historique des opérations ({logs.length})
        </CardTitle>
      </CardHeader>
      <ScrollArea className="flex-1">
        <CardContent className="p-0">
          <div className="divide-y relative">
            <div className="absolute left-6 top-0 bottom-0 w-px bg-border z-0 hidden sm:block"></div>
            
            {logs.map((log, index) => (
              <div key={log.id} className="p-4 flex gap-4 relative z-10 hover:bg-muted/50 transition-colors">
                <div className="hidden sm:flex flex-col items-center pt-1">
                  <div className={`h-3 w-3 rounded-full border-2 bg-background ${
                    index === 0 ? 'border-primary' : 'border-muted-foreground'
                  }`} />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-mono ${getActionColor(log.action)}`}>
                        {getActionLabel(log.action)}
                      </Badge>
                      <span className="text-xs font-medium text-foreground">
                        {log.user?.full_name || log.user?.email || "Système / Inconnu"}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {format(new Date(log.created_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                    </span>
                  </div>
                  {log.details && (
                    <p className="text-xs text-muted-foreground mt-1 border-l-2 pl-2 italic">
                      {log.details}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </ScrollArea>
    </Card>
  );
}
