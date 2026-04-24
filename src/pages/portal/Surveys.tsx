import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ClipboardList, ArrowLeft, Check } from "lucide-react";

type QuestionType = "short_text" | "long_text" | "single_choice" | "multiple_choice" | "yes_no";

interface Question {
  id: string;
  template_id: string;
  question_text: string;
  question_type: QuestionType;
  options: string[];
  required: boolean;
  position: number;
}

interface AssignmentRow {
  id: string;
  assigned_at: string;
  template: {
    id: string;
    title: string;
    description: string | null;
    active: boolean;
  };
}

export default function ClientSurveys() {
  const { user } = useAuth();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<AssignmentRow | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: prof } = await supabase
        .from("profiles").select("id").eq("user_id", user.id).maybeSingle();
      if (!prof) { setLoading(false); return; }
      setProfileId(prof.id);
      const { data, error } = await supabase
        .from("survey_assignments")
        .select("id, assigned_at, template:survey_templates(id, title, description, active)")
        .eq("client_profile_id", prof.id)
        .order("assigned_at", { ascending: false });
      if (error) toast({ title: "Failed to load surveys", description: error.message, variant: "destructive" });
      // Hide assignments where the template is inactive
      const rows = ((data ?? []) as any[])
        .filter((r) => r.template && r.template.active) as AssignmentRow[];
      setAssignments(rows);
      setLoading(false);
    })();
  }, [user]);

  if (active && profileId) {
    return <SurveyForm assignment={active} onBack={() => setActive(null)} />;
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Surveys</h1>
        <p className="text-sm text-muted-foreground">Surveys assigned to you. You can edit your answers anytime.</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : assignments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No surveys assigned to you yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {assignments.map((a) => (
            <Card key={a.id} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setActive(a)}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{a.template.title}</h3>
                  {a.template.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{a.template.description}</p>
                  )}
                </div>
                <Button variant="outline" size="sm">Open</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function SurveyForm({ assignment, onBack }: { assignment: AssignmentRow; onBack: () => void }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [answerIds, setAnswerIds] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [qRes, aRes] = await Promise.all([
        supabase.from("survey_questions").select("*").eq("template_id", assignment.template.id).order("position"),
        supabase.from("survey_answers").select("id, question_id, answer").eq("assignment_id", assignment.id),
      ]);
      const qs = (qRes.data ?? []).map((q: any) => ({ ...q, options: Array.isArray(q.options) ? q.options : [] })) as Question[];
      setQuestions(qs);
      const map: Record<string, unknown> = {};
      const idMap: Record<string, string> = {};
      for (const r of (aRes.data ?? []) as any[]) {
        map[r.question_id] = r.answer;
        idMap[r.question_id] = r.id;
      }
      setAnswers(map);
      setAnswerIds(idMap);
      setLoading(false);
    })();
  }, [assignment.id, assignment.template.id]);

  const saveAnswer = async (q: Question, value: unknown) => {
    setAnswers((a) => ({ ...a, [q.id]: value }));
    setSavingId(q.id);
    const existingId = answerIds[q.id];
    const { data: { user } } = await supabase.auth.getUser();
    if (existingId) {
      const { error } = await supabase
        .from("survey_answers")
        .update({ answer: value as any, updated_by_user_id: user?.id })
        .eq("id", existingId);
      if (error) {
        toast({ title: "Save failed", description: error.message, variant: "destructive" });
        setSavingId(null);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("survey_answers")
        .insert({ assignment_id: assignment.id, question_id: q.id, answer: value as any, updated_by_user_id: user?.id })
        .select("id").single();
      if (error || !data) {
        toast({ title: "Save failed", description: error?.message, variant: "destructive" });
        setSavingId(null);
        return;
      }
      setAnswerIds((m) => ({ ...m, [q.id]: data.id }));
    }
    setSavingId(null);
    setSavedId(q.id);
    setTimeout(() => setSavedId((s) => (s === q.id ? null : s)), 1500);
  };

  const sorted = useMemo(() => [...questions].sort((a, b) => a.position - b.position), [questions]);

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto w-full space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-1" />Back to surveys
      </Button>
      <div>
        <h1 className="text-2xl font-bold text-foreground">{assignment.template.title}</h1>
        {assignment.template.description && (
          <p className="text-sm text-muted-foreground mt-1">{assignment.template.description}</p>
        )}
        <p className="text-xs text-muted-foreground mt-2">Your answers are saved automatically. You can come back and edit them anytime.</p>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> :
        sorted.length === 0 ? <p className="text-sm text-muted-foreground">This survey has no questions yet.</p> :
        sorted.map((q) => (
          <Card key={q.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-start justify-between gap-2">
                <span>
                  {q.question_text}
                  {q.required && <span className="text-destructive ml-1">*</span>}
                </span>
                {savingId === q.id && <Badge variant="secondary" className="text-[10px]">Saving…</Badge>}
                {savedId === q.id && (
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    <Check className="h-3 w-3" />Saved
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AnswerInput question={q} value={answers[q.id]} onChange={(v) => saveAnswer(q, v)} />
            </CardContent>
          </Card>
        ))
      }
    </div>
  );
}

function AnswerInput({
  question, value, onChange,
}: { question: Question; value: unknown; onChange: (v: unknown) => void }) {
  if (question.question_type === "short_text") {
    return (
      <Input
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onChange(e.target.value)}
      />
    );
  }
  if (question.question_type === "long_text") {
    return (
      <Textarea
        rows={4}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onChange(e.target.value)}
      />
    );
  }
  if (question.question_type === "single_choice") {
    return (
      <RadioGroup value={(value as string) ?? ""} onValueChange={(v) => onChange(v)}>
        {question.options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <RadioGroupItem value={opt} id={`${question.id}-${i}`} />
            <Label htmlFor={`${question.id}-${i}`} className="cursor-pointer">{opt || `Option ${i + 1}`}</Label>
          </div>
        ))}
      </RadioGroup>
    );
  }
  if (question.question_type === "multiple_choice") {
    const selected: string[] = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div className="space-y-1.5">
        {question.options.map((opt, i) => {
          const checked = selected.includes(opt);
          return (
            <div key={i} className="flex items-center gap-2">
              <Checkbox
                id={`${question.id}-m-${i}`}
                checked={checked}
                onCheckedChange={(v) => {
                  const next = v === true ? [...selected, opt] : selected.filter((x) => x !== opt);
                  onChange(next);
                }}
              />
              <Label htmlFor={`${question.id}-m-${i}`} className="cursor-pointer">{opt || `Option ${i + 1}`}</Label>
            </div>
          );
        })}
      </div>
    );
  }
  if (question.question_type === "yes_no") {
    const v = value === true ? "yes" : value === false ? "no" : "";
    return (
      <RadioGroup value={v} onValueChange={(nv) => onChange(nv === "yes")}>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="yes" id={`${question.id}-yes`} />
          <Label htmlFor={`${question.id}-yes`} className="cursor-pointer">Yes</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="no" id={`${question.id}-no`} />
          <Label htmlFor={`${question.id}-no`} className="cursor-pointer">No</Label>
        </div>
      </RadioGroup>
    );
  }
  return null;
}
