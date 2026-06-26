import { useEffect, useState } from "react";
import { Download, BookOpen, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { formatBytes } from "@/lib/documents";

interface Guidebook {
  id: string;
  title: string;
  description: string | null;
  file_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
}

const Guidebooks = () => {
  const [items, setItems] = useState<Guidebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("guidebooks")
        .select("id, title, description, file_path, file_name, file_size, mime_type, created_at")
        .order("created_at", { ascending: false });
      if (!error && data) setItems(data as Guidebook[]);
      setLoading(false);
    })();
  }, []);

  const handleDownload = async (g: Guidebook) => {
    setDownloadingId(g.id);
    try {
      const { data, error } = await supabase.storage.from("guidebooks").download(g.file_path);
      if (error || !data) throw error || new Error("Download failed");
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = g.file_name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error(err);
      toast({ title: "Download failed", description: "Please try again later.", variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };

  if (!loading && items.length === 0) return null;

  return (
    <section id="guidebooks" className="py-20 bg-muted/30 border-t border-border">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center mb-10">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2 text-center">Guidebooks</h2>
          <div className="w-16 h-1 bg-primary mx-auto mb-4 rounded-full" />
          <p className="text-center text-muted-foreground text-sm max-w-2xl">
            Free resources to help you navigate life, business, and bureaucracy in Portugal. Download and read at your own pace.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {items.map((g) => (
              <Card key={g.id} className="flex flex-col hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center mb-2">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{g.title}</CardTitle>
                  {g.description && <CardDescription>{g.description}</CardDescription>}
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-xs text-muted-foreground">
                    {g.file_name} {g.file_size ? `• ${formatBytes(g.file_size)}` : ""}
                  </p>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    onClick={() => handleDownload(g)}
                    disabled={downloadingId === g.id}
                  >
                    {downloadingId === g.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Download
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Guidebooks;
