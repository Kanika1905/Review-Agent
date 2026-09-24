import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toast } from "sonner";
import { useRef, useState } from "react";
import {
  REVIEW_URL_PREFIX,
  analyzeWebsite,
  listMyBusinesses,
  deleteBusiness,
  saveBusiness,
  type BusinessRecord,
  type ReviewQuestion,
} from "@/lib/business.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/setup")({
  head: () => ({
    meta: [
      { title: "Google Review Agent" },
      {
        name: "description",
        content:
          "Analyze a business website, review the extracted details and questions, then publish the customer review page.",
      },
      { property: "og:title", content: "Business setup — Review Agent" },
      {
        property: "og:description",
        content: "Analyze a website and publish a tailored 60-second review page.",
      },
    ],
  }),
  component: SetupPage,
});

type Draft = {
  id?: string;
  website_url: string;
  name: string;
  logo_url: string;
  category: string;
  location: string;
  services: string;
  place_id: string;
  questions: ReviewQuestion[];
  published: boolean;
  slug?: string;
};

const emptyDraft: Draft = {
  website_url: "",
  name: "",
  logo_url: "",
  category: "",
  location: "",
  services: "",
  place_id: "",
  questions: [],
  published: false,
};

function toDraft(record: BusinessRecord): Draft {
  return {
    id: record.id,
    slug: record.slug,
    website_url: record.website_url ?? "",
    name: record.name,
    logo_url: record.logo_url ?? "",
    category: record.category ?? "",
    location: record.location ?? "",
    services: (record.services ?? []).join(", "),
    place_id: record.place_id ?? "",
    questions: record.questions ?? [],
    published: record.published,
  };
}

function SetupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchList = useServerFn(listMyBusinesses);
  const runAnalyze = useServerFn(analyzeWebsite);
  const runSave = useServerFn(saveBusiness);
  const runDelete = useServerFn(deleteBusiness);


  const [url, setUrl] = useState("");
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const questionInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const businesses = useQuery({ queryKey: ["businesses"], queryFn: () => fetchList({}) });

  const analyzeMutation = useMutation({
    mutationFn: (value: string) => runAnalyze({ data: { url: value } }),
    onSuccess: (result) => {
      setDraft({
        website_url: result.website_url,
        name: result.name ?? "",
        logo_url: result.logo_url ?? "",
        category: result.category ?? "",
        location: result.location ?? "",
        services: (result.services ?? []).join(", "),
        place_id: result.place_id ?? "",
        questions: result.questions ?? [],
        published: false,
      });
      toast.success("Website analyzed. Check the details before publishing.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Analysis failed."),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: { publish: boolean }) =>
      runSave({
        data: {
          ...(draft.id ? { id: draft.id } : {}),
          website_url: draft.website_url,
          name: draft.name,
          logo_url: draft.logo_url,
          category: draft.category,
          location: draft.location,
          services: draft.services
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          place_id: draft.place_id,
          questions: draft.questions,
          published: payload.publish,
        },
      }),
    onSuccess: (saved) => {
      setDraft(toDraft(saved));
      queryClient.invalidateQueries({ queryKey: ["businesses"] });
      toast.success(saved.published ? "Review page published." : "Draft saved.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => runDelete({ data: { id } }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["businesses"] });
      if (draft.id === id) setDraft(emptyDraft);
      setPendingDelete(null);
      toast.success("Business deleted.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not delete."),
  });

  function requestDelete(id: string, name: string) {
    setPendingDelete({ id, name });
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  function updateQuestion(index: number, patch: Partial<ReviewQuestion>) {
    setDraft((d) => ({
      ...d,
      questions: d.questions.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    }));
  }

  const reviewUrl = draft.place_id.trim() ? `${REVIEW_URL_PREFIX}${draft.place_id.trim()}` : "";
  const hasDraft = Boolean(draft.name || draft.website_url);

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground md:py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <span className="text-sm font-semibold">RA</span>
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">
              Review Agent · Admin
            </span>
          </div>
          <button
            onClick={signOut}
            className="rounded-lg bg-card px-3 py-2 text-xs font-semibold ring-1 ring-border"
          >
            Sign out
          </button>
        </div>

        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Step 2 · Business setup
        </p>
        <h1 className="mt-2 max-w-[30ch] text-balance font-display text-3xl font-semibold tracking-tight">
          Analyze a website, then confirm what we extract
        </h1>

        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="space-y-4">
            <div className="rounded-3xl bg-card p-6 ring-1 ring-border">
              <label className="mb-1.5 block text-sm font-medium" htmlFor="url">
                Business website URL
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://yourbusiness.com"
                  className="w-full rounded-xl border-0 bg-background px-4 py-3 text-sm ring-1 ring-inset ring-border focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  disabled={!url.trim() || analyzeMutation.isPending}
                  onClick={() => analyzeMutation.mutate(url.trim())}
                  className="shrink-0 rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {analyzeMutation.isPending ? "Analyzing…" : "Analyze website"}
                </button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                The agent reads the public site and drafts the business profile below for your
                review.
              </p>
            </div>

            <div className="rounded-3xl bg-card p-6 ring-1 ring-border">
              <h2 className="text-sm font-semibold">Google review setup</h2>
              <div className="mt-3 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Google Place ID
                  </label>
                  <input
                    value={draft.place_id}
                    onChange={(e) => setDraft({ ...draft, place_id: e.target.value })}
                    placeholder="ChIJ…"
                    className="w-full rounded-xl border-0 bg-background px-3.5 py-2.5 text-xs font-medium ring-1 ring-inset ring-border focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Review URL
                  </label>
                  <input
                    readOnly
                    value={reviewUrl}
                    placeholder="Add a Place ID to build the review link"
                    className="w-full truncate rounded-xl border-0 bg-background px-3.5 py-2.5 text-xs text-muted-foreground ring-1 ring-inset ring-border"
                  />
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground/80">
                If we can't match the Place ID automatically, paste it in to unlock posting.
              </p>
            </div>

            {businesses.data && businesses.data.length > 0 && (
              <div className="rounded-3xl bg-card p-6 ring-1 ring-border">
                <h2 className="text-sm font-semibold">Your businesses</h2>
                <ul className="mt-3 space-y-2">
                  {businesses.data.map((b) => (
                    <li key={b.id} className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => setDraft(toDraft(b))}
                        className="truncate text-left text-sm font-medium hover:text-primary"
                      >
                        {b.name || "Untitled"}
                      </button>
                      {/* {b.published ? (
                        <a
                          href={`/r/${b.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 rounded-full bg-background px-2.5 py-1 text-[11px] font-semibold text-primary ring-1 ring-border"
                        >
                          Open page
                        </a>
                      ) : (
                        <span className="shrink-0 text-[11px] text-muted-foreground">Draft</span>
                      )} */}
                      <div className="flex shrink-0 items-center gap-1.5">
                        {b.published ? (

                          <a href={`/r/${b.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full bg-background px-2.5 py-1 text-[11px] font-semibold text-primary ring-1 ring-border"
                          >
                            Open page
                          </a>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">Draft</span>
                        )}
                        <button
                          type="button"
                          onClick={() => requestDelete(b.id, b.name)}
                          disabled={deleteMutation.isPending}
                          aria-label={`Delete ${b.name || "business"}`}
                          className="grid size-6 place-items-center rounded-full text-muted-foreground ring-1 ring-border transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="size-3.5"
                          >
                            <path d="M3 6h18" />
                            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                          </svg>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="rounded-3xl bg-card p-6 ring-1 ring-border">
            {!hasDraft ? (
              <p className="text-sm text-muted-foreground">
                Analyze a website to see the business details, or pick one of your saved businesses
                to edit it.
              </p>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  {draft.logo_url ? (
                    <img
                      src={draft.logo_url}
                      alt={`${draft.name} logo`}
                      className="size-14 shrink-0 rounded-2xl object-cover ring-1 ring-border"
                    />
                  ) : (
                    <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sun to-ember text-xs font-semibold text-primary-foreground">
                      {(draft.name || "?").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <input
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      placeholder="Business name"
                      className="w-full bg-transparent font-display text-lg font-semibold tracking-tight focus:outline-none"
                    />
                    <p className="truncate text-xs text-muted-foreground">
                      {[draft.category, draft.location].filter(Boolean).join(" · ") ||
                        "Add a category and location"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground">
                      Category
                    </label>
                    <input
                      value={draft.category}
                      onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                      className="mt-1 w-full rounded-lg border-0 bg-background px-3 py-2 text-sm ring-1 ring-inset ring-border focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground">
                      Location
                    </label>
                    <input
                      value={draft.location}
                      onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                      className="mt-1 w-full rounded-lg border-0 bg-background px-3 py-2 text-sm ring-1 ring-inset ring-border focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-xs font-medium text-muted-foreground">
                    Services
                  </label>
                  <input
                    value={draft.services}
                    onChange={(e) => setDraft({ ...draft, services: e.target.value })}
                    placeholder="Separate with commas"
                    className="mt-1 w-full rounded-lg border-0 bg-background px-3 py-2 text-sm ring-1 ring-inset ring-border focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="mt-3">
                  <label className="block text-xs font-medium text-muted-foreground">
                    Logo image link
                  </label>
                  <input
                    value={draft.logo_url}
                    onChange={(e) => setDraft({ ...draft, logo_url: e.target.value })}
                    className="mt-1 w-full rounded-lg border-0 bg-background px-3 py-2 text-sm ring-1 ring-inset ring-border focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="mt-6 space-y-3">
                  {draft.questions.map((q, index) => (
                    <div key={q.id} className="rounded-2xl bg-background p-4 ring-1 ring-border">
                      <div className="flex items-center gap-2">
                       <input
                         ref={(el) => {
                           questionInputRefs.current[index] = el;
                         }}
                         value={q.question}
                         onChange={(e) => updateQuestion(index, { question: e.target.value })}
                         className="w-full bg-transparent text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-ring rounded-md px-1 -mx-1"
                       />
                       <button
                         type="button"
                         onClick={() => questionInputRefs.current[index]?.focus()}
                         aria-label="Edit question"
                         className="grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground ring-1 ring-border transition-colors hover:bg-primary/10 hover:text-primary"
                       >
                         <svg
                           xmlns="http://www.w3.org/2000/svg"
                           viewBox="0 0 24 24"
                           fill="none"
                           stroke="currentColor"
                           strokeWidth="2"
                           strokeLinecap="round"
                           strokeLinejoin="round"
                           className="size-3.5"
                         >
                           <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                         </svg>
                       </button>
                     </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {q.keywords.map((keyword, kIndex) => (
                          <button
                            key={`${q.id}-${kIndex}`}
                            type="button"
                            onClick={() =>
                              updateQuestion(index, {
                                keywords: q.keywords.filter((_, i) => i !== kIndex),
                              })
                            }
                            title="Remove keyword"
                            className="chip-snap rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                          >
                            {keyword} ×
                          </button>
                        ))}
                        <input
                          placeholder="add keyword"
                          onKeyDown={(e) => {
                            if (e.key !== "Enter") return;
                            e.preventDefault();
                            const value = e.currentTarget.value.trim();
                            if (!value) return;
                            updateQuestion(index, { keywords: [...q.keywords, value] });
                            e.currentTarget.value = "";
                          }}
                          className="w-32 rounded-full bg-card px-4 py-2 text-sm ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        questions: [
                          ...d.questions,
                          { id: `q${d.questions.length + 1}-${Date.now()}`, question: "", keywords: [] },
                        ],
                      }))
                    }
                    className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    + Add a question
                  </button>
                  <p className="text-xs text-muted-foreground">
                    Customers always also get “Overall experience” with a free text box.
                  </p>
                </div>

                <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    disabled={saveMutation.isPending || !draft.name.trim()}
                    onClick={() => saveMutation.mutate({ publish: false })}
                    className="flex-1 rounded-xl bg-background py-3.5 text-sm font-semibold ring-1 ring-border disabled:opacity-60"
                  >
                    Save draft
                  </button>
                  <button
                    type="button"
                    disabled={saveMutation.isPending || !draft.name.trim()}
                    onClick={() => saveMutation.mutate({ publish: true })}
                    className="flex-1 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground ring-1 ring-inset ring-primary/30 transition-colors hover:bg-accent disabled:opacity-60"
                  >
                    Confirm &amp; publish
                  </button>
                </div>

                {draft.published && draft.slug && (
                  <div className="mt-4 rounded-2xl bg-background p-4 ring-1 ring-border">
                    <p className="text-xs font-semibold">Shareable customer review link</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">/r/{draft.slug}</p>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={async () => {
                          const link = `${window.location.origin}/r/${draft.slug}`;
                          try {
                            if (navigator.share) {
                              await navigator.share({ title: draft.name, url: link });
                              return;
                            }
                            await navigator.clipboard.writeText(link);
                            toast.success("Review page link copied.");
                          } catch {
                            toast.error("Could not copy the link.");
                          }
                        }}
                        className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground"
                      >
                        Share review page
                      </button>
                      <a
                        href={`/r/${draft.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 rounded-xl bg-card py-3 text-center text-sm font-semibold ring-1 ring-border"
                      >
                        Open page
                      </a>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div >
      </div >
      {pendingDelete && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-3xl bg-card p-6 ring-1 ring-border">
            <h2 className="font-display text-lg font-semibold tracking-tight">
              Delete "{pendingDelete.name || "this business"}"?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This can't be undone. The review page and all its questions will be permanently
              removed.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                disabled={deleteMutation.isPending}
                className="flex-1 rounded-xl bg-background py-3 text-sm font-semibold ring-1 ring-border disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(pendingDelete.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
 