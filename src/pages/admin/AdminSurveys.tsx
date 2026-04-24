import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Plus, Trash2, Pencil, Users, ClipboardList, ArrowLeft, GripVertical, History,
} from "lucide-react";

type QuestionType = "short_text" | "long_text" | "single_choice" | "multiple_choice" | "yes_no";

interface Template {
  id: string;
  title: string;
  description: string | null;
  active: boolean;
  created_at: string;
}

interface Question {
  id: string;
  template_id: string;
  question_text: string;
  question_type: QuestionType;
  options: string[];
  required: boolean;
  position: number;
}

interface ClientProfile {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  user_id: string;
}

interface Assignment {
  id: string;
  template_id: string;
  client_profile_id: string;
  assigned_at: string;
}

const TYPE_LABELS: Record<QuestionType, string> = {
  short_text: "Short text",
  long_text: "Long text",
  single_choice: "Single choice",
  multiple_choice: "Multiple choice",
  yes_no: "Yes / No",
};

const formatAnswer = (q: Question, raw: unknown): string => {
  if (raw === null || raw === undefined || raw === "") return "—";
  if (q.question_type === "yes_no") return raw === true ? "Yes" : raw === false ? "No" : "—";
  if (q.question_type === "multiple_choice") {
    if (Array.isArray(raw)) return raw.length ? raw.join(", ") : "—";
    return String(raw);
  }
  return String(raw);
};

const clientName = (c: ClientProfile) =>
  c.full_name || [c.first_name, c.last_name].filter(Boolean).join(" ") || "Unnamed";

export default function AdminSurveys() {
  const [view, setView] = useState<"list" | "edit" | "responses">("list");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const loadTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("survey_templates")
      .select("id, title, description, active, created_at")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Failed to load surveys", description: error.message, variant: "destructive" });
    setTemplates(data ?? []);
    setLoading(false);
  };

  useEffect(() => { loadTemplates(); }, []);

  if (view === "edit" && activeTemplate) {
    return (
      <TemplateEditor
        template={activeTemplate}
        onBack={() => { setView("list"); setActiveTemplate(null); loadTemplates(); }}
        onOpenResponses={() => setView("responses")}
      />
    );
  }
  if (view === "responses" && activeTemplate) {
    return (
      <TemplateResponses
        template={activeTemplate}
        onBack={() => setView("edit")}
      />
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Surveys</h1>
          <p className="text-sm text-muted-foreground">Build surveys, assign them to clients, and review their answers.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />New Survey
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No surveys yet. Create your first survey to assign it to clients.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {templates.map((t) => (
            <Card
              key={t.id}
              className="cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => { setActiveTemplate(t); setView("edit"); }}
            >
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground truncate">{t.title}</h3>
                    {!t.active && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                  </div>
                  {t.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{t.description}</p>
                  )}
                </div>
                <Pencil className="h-4 w-4 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateSurveyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(t) => { setCreateOpen(false); setActiveTemplate(t); setView("edit"); }}
      />
    </div>
  );
}

function CreateSurveyDialog({
  open, onOpenChange, onCreated,
}: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: (t: Template) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const create = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("survey_templates")
      .insert({ title: title.trim(), description: description.trim() || null, created_by_user_id: user?.id })
      .select("id, title, description, active, created_at")
      .single();
    setSaving(false);
    if (error || !data) {
      toast({ title: "Failed", description: error?.message, variant: "destructive" });
      return;
    }
    setTitle(""); setDescription("");
    onCreated(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New Survey</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Onboarding questionnaire" />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={create} disabled={saving || !title.trim()}>Create</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TemplateEditor({
  template, onBack, onOpenResponses,
}: { template: Template; onBack: () => void; onOpenResponses: () => void }) {
  const [title, setTitle] = useState(template.title);
  const [description, setDescription] = useState(template.description ?? "");
  const [active, setActive] = useState(template.active);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingMeta, setSavingMeta] = useState(false);

  const load = async () => {
    setLoading(true);
    const [qRes, aRes, cRes] = await Promise.all([
      supabase.from("survey_questions").select("*").eq("template_id", template.id).order("position"),
      supabase.from("survey_assignments").select("id, template_id, client_profile_id, assigned_at").eq("template_id", template.id),
      // Only clients (exclude admins). We rely on RLS letting superadmin see all profiles.
      supabase.from("profiles").select("id, full_name, first_name, last_name, user_id").order("created_at", { ascending: false }),
    ]);
    setQuestions((qRes.data ?? []).map((q: any) => ({ ...q, options: Array.isArray(q.options) ? q.options : [] })));
    setAssignments(aRes.data ?? []);
    // Filter out admin profiles by checking user_roles
    const userIds = (cRes.data ?? []).map((p: any) => p.user_id);
    if (userIds.length) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);
      const adminUserIds = new Set((roles ?? []).filter((r: any) => r.role !== "client").map((r: any) => r.user_id));
      setClients((cRes.data ?? []).filter((p: any) => !adminUserIds.has(p.user_id)));
    } else {
      setClients([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [template.id]);

  const saveMeta = async () => {
    setSavingMeta(true);
    const { error } = await supabase
      .from("survey_templates")
      .update({ title: title.trim(), description: description.trim() || null, active })
      .eq("id", template.id);
    setSavingMeta(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Saved" });
  };

  const addQuestion = async () => {
    const nextPos = questions.length ? Math.max(...questions.map((q) => q.position)) + 1 : 0;
    const { data, error } = await supabase
      .from("survey_questions")
      .insert({
        template_id: template.id,
        question_text: "Untitled question",
        question_type: "short_text" as QuestionType,
        options: [],
        required: false,
        position: nextPos,
      })
      .select("*").single();
    if (error || !data) { toast({ title: "Failed", description: error?.message, variant: "destructive" }); return; }
    setQuestions((qs) => [...qs, { ...data, options: [] } as Question]);
  };

  const updateQuestion = async (q: Question, patch: Partial<Question>) => {
    const merged = { ...q, ...patch };
    setQuestions((qs) => qs.map((x) => (x.id === q.id ? merged : x)));
    const { error } = await supabase
      .from("survey_questions")
      .update({
        question_text: merged.question_text,
        question_type: merged.question_type,
        options: merged.options,
        required: merged.required,
        position: merged.position,
      })
      .eq("id", q.id);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
  };

  const deleteQuestion = async (q: Question) => {
    if (!confirm("Delete this question? Existing answers for it will also be removed.")) return;
    const { error } = await supabase.from("survey_questions").delete().eq("id", q.id);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    setQuestions((qs) => qs.filter((x) => x.id !== q.id));
  };

  const moveQuestion = async (q: Question, dir: -1 | 1) => {
    const sorted = [...questions].sort((a, b) => a.position - b.position);
    const idx = sorted.findIndex((x) => x.id === q.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx], b = sorted[swapIdx];
    await Promise.all([
      supabase.from("survey_questions").update({ position: b.position }).eq("id", a.id),
      supabase.from("survey_questions").update({ position: a.position }).eq("id", b.id),
    ]);
    setQuestions((qs) => qs.map((x) => x.id === a.id ? { ...x, position: b.position } : x.id === b.id ? { ...x, position: a.position } : x));
  };

  const assignedSet = useMemo(() => new Set(assignments.map((a) => a.client_profile_id)), [assignments]);

  const toggleAssign = async (clientProfileId: string, checked: boolean) => {
    if (checked) {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("survey_assignments")
        .insert({ template_id: template.id, client_profile_id: clientProfileId, assigned_by_user_id: user?.id })
        .select("id, template_id, client_profile_id, assigned_at").single();
      if (error || !data) { toast({ title: "Failed", description: error?.message, variant: "destructive" }); return; }
      setAssignments((xs) => [...xs, data]);
    } else {
      const target = assignments.find((a) => a.client_profile_id === clientProfileId);
      if (!target) return;
      if (!confirm("Remove this assignment? The client will lose access to this survey and their answers will be deleted.")) return;
      const { error } = await supabase.from("survey_assignments").delete().eq("id", target.id);
      if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
      setAssignments((xs) => xs.filter((a) => a.id !== target.id));
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto w-full space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back to surveys
        </Button>
        <Button variant="outline" size="sm" onClick={onOpenResponses}>
          <Users className="h-4 w-4 mr-2" />View responses ({assignments.length})
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Survey details</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={active} onCheckedChange={setActive} id="active" />
            <Label htmlFor="active" className="cursor-pointer">Active</Label>
          </div>
          <Button onClick={saveMeta} disabled={savingMeta}>Save details</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Questions</CardTitle>
          <Button size="sm" onClick={addQuestion}><Plus className="h-4 w-4 mr-1" />Add question</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> :
            questions.length === 0 ? <p className="text-sm text-muted-foreground">No questions yet.</p> :
            [...questions].sort((a, b) => a.position - b.position).map((q, i, arr) => (
              <QuestionEditor
                key={q.id}
                question={q}
                isFirst={i === 0}
                isLast={i === arr.length - 1}
                onChange={(patch) => updateQuestion(q, patch)}
                onDelete={() => deleteQuestion(q)}
                onMove={(d) => moveQuestion(q, d)}
              />
            ))
          }
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Assign to clients</CardTitle></CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <p className="text-sm text-muted-foreground">No clients found.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-auto">
              {clients.map((c) => (
                <label key={c.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer">
                  <Checkbox
                    checked={assignedSet.has(c.id)}
                    onCheckedChange={(v) => toggleAssign(c.id, v === true)}
                  />
                  <span className="text-sm">{clientName(c)}</span>
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function QuestionEditor({
  question, isFirst, isLast, onChange, onDelete, onMove,
}: {
  question: Question;
  isFirst: boolean;
  isLast: boolean;
  onChange: (patch: Partial<Question>) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const showOptions = question.question_type === "single_choice" || question.question_type === "multiple_choice";
  return (
    <div className="border border-border rounded-lg p-3 space-y-3 bg-card">
      <div className="flex items-start gap-2">
        <div className="flex flex-col">
          <Button variant="ghost" size="icon" className="h-6 w-6" disabled={isFirst} onClick={() => onMove(-1)}>↑</Button>
          <GripVertical className="h-4 w-4 text-muted-foreground mx-auto" />
          <Button variant="ghost" size="icon" className="h-6 w-6" disabled={isLast} onClick={() => onMove(1)}>↓</Button>
        </div>
        <div className="flex-1 space-y-2">
          <Input
            value={question.question_text}
            onChange={(e) => onChange({ question_text: e.target.value })}
            placeholder="Question text"
          />
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={question.question_type}
              onValueChange={(v: QuestionType) => {
                const patch: Partial<Question> = { question_type: v };
                if (v !== "single_choice" && v !== "multiple_choice") patch.options = [];
                onChange(patch);
              }}
            >
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => (
                  <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={question.required} onCheckedChange={(v) => onChange({ required: v === true })} />
              Required
            </label>
          </div>
          {showOptions && (
            <OptionsEditor
              options={question.options}
              onChange={(options) => onChange({ options })}
            />
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Delete">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

function OptionsEditor({ options, onChange }: { options: string[]; onChange: (opts: string[]) => void }) {
  const update = (i: number, v: string) => onChange(options.map((o, idx) => idx === i ? v : o));
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Options</Label>
      {options.map((opt, i) => (
        <div key={i} className="flex gap-2">
          <Input value={opt} onChange={(e) => update(i, e.target.value)} placeholder={`Option ${i + 1}`} />
          <Button variant="ghost" size="icon" onClick={() => onChange(options.filter((_, idx) => idx !== i))}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange([...options, ""])}>
        <Plus className="h-3 w-3 mr-1" />Add option
      </Button>
    </div>
  );
}

function TemplateResponses({ template, onBack }: { template: Template; onBack: () => void }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ClientProfile>>({});
  const [answersByAssignment, setAnswersByAssignment] = useState<Record<string, Record<string, unknown>>>({});
  const [loading, setLoading] = useState(true);
  const [historyFor, setHistoryFor] = useState<{ assignmentId: string; question: Question } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const qRes = await supabase.from("survey_questions").select("*").eq("template_id", template.id).order("position");
      const aRes = await supabase.from("survey_assignments").select("id, template_id, client_profile_id, assigned_at").eq("template_id", template.id);
      const qs = (qRes.data ?? []).map((q: any) => ({ ...q, options: Array.isArray(q.options) ? q.options : [] })) as Question[];
      const ass = (aRes.data ?? []) as Assignment[];

      let profMap: Record<string, ClientProfile> = {};
      let answersMap: Record<string, Record<string, unknown>> = {};
      if (ass.length) {
        const pIds = ass.map((a) => a.client_profile_id);
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, first_name, last_name, user_id")
          .in("id", pIds);
        profMap = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));

        const aIds = ass.map((a) => a.id);
        const { data: ans } = await supabase
          .from("survey_answers")
          .select("assignment_id, question_id, answer")
          .in("assignment_id", aIds);
        for (const row of (ans ?? []) as any[]) {
          answersMap[row.assignment_id] ??= {};
          answersMap[row.assignment_id][row.question_id] = row.answer;
        }
      }
      if (cancelled) return;
      setQuestions(qs); setAssignments(ass); setProfiles(profMap); setAnswersByAssignment(answersMap);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [template.id]);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto w-full space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-1" />Back to survey
      </Button>
      <div>
        <h2 className="text-xl font-bold text-foreground">{template.title} — Responses</h2>
        <p className="text-sm text-muted-foreground">{assignments.length} assigned client{assignments.length === 1 ? "" : "s"}</p>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> :
        assignments.length === 0 ? <p className="text-sm text-muted-foreground">Not assigned to any clients yet.</p> :
        <div className="space-y-4">
          {assignments.map((a) => {
            const prof = profiles[a.client_profile_id];
            const answers = answersByAssignment[a.id] ?? {};
            return (
              <Card key={a.id}>
                <CardHeader><CardTitle className="text-base">{prof ? clientName(prof) : "Unknown client"}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {questions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No questions in this survey.</p>
                  ) : questions.map((q) => (
                    <div key={q.id} className="border-l-2 border-border pl-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium text-muted-foreground">{q.question_text}</p>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs"
                          onClick={() => setHistoryFor({ assignmentId: a.id, question: q })}>
                          <History className="h-3 w-3 mr-1" />History
                        </Button>
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{formatAnswer(q, answers[q.id])}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      }

      <Dialog open={!!historyFor} onOpenChange={(v) => !v && setHistoryFor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Answer history</DialogTitle>
          </DialogHeader>
          {historyFor && <AnswerHistory assignmentId={historyFor.assignmentId} question={historyFor.question} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AnswerHistory({ assignmentId, question }: { assignmentId: string; question: Question }) {
  const [rows, setRows] = useState<{ id: string; previous_answer: unknown; changed_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("survey_answer_history")
        .select("id, previous_answer, changed_at")
        .eq("assignment_id", assignmentId)
        .eq("question_id", question.id)
        .order("changed_at", { ascending: false });
      setRows((data ?? []) as any);
      setLoading(false);
    })();
  }, [assignmentId, question.id]);

  return (
    <div className="space-y-2 max-h-96 overflow-auto">
      <p className="text-xs text-muted-foreground">{question.question_text}</p>
      {loading ? <p className="text-xs text-muted-foreground">Loading…</p> :
        rows.length === 0 ? <p className="text-xs text-muted-foreground">No previous versions — only the current answer exists.</p> :
        rows.map((r) => (
          <div key={r.id} className="border border-border rounded p-2">
            <p className="text-[10px] text-muted-foreground">{new Date(r.changed_at).toLocaleString()}</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{formatAnswer(question, r.previous_answer)}</p>
          </div>
        ))
      }
    </div>
  );
}
