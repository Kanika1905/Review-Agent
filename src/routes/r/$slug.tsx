// import { createFileRoute, Link } from "@tanstack/react-router";
// import { useServerFn } from "@tanstack/react-start";
// import { useMutation } from "@tanstack/react-query";
// import { useMemo, useState } from "react";
// import { toast } from "sonner";

// import { getPublishedBusiness } from "@/lib/business.functions";
// import { generateReviews, type ReviewOption } from "@/lib/reviews.functions";

// export const Route = createFileRoute("/r/$slug")({
//   loader: ({ params }) => getPublishedBusiness({ data: { slug: params.slug } }),
//   head: ({ loaderData }) => {
//     if (!loaderData) {
//       return {
//         meta: [
//           { title: "Review page unavailable" },
//           { name: "robots", content: "noindex" },
//         ],
//       };
//     }
//     const title = `Leave a review for ${loaderData.name}`;
//     const description = `Share your experience with ${loaderData.name} in under 60 seconds and post it to Google.`;
//     return {
//       meta: [
//         { title },
//         { name: "description", content: description },
//         { property: "og:title", content: title },
//         { property: "og:description", content: description },
//         { property: "og:type", content: "website" },
//         { name: "twitter:card", content: "summary_large_image" },
//       ],
//     };
//   },
//   errorComponent: () => <Unavailable />,
//   notFoundComponent: () => <Unavailable />,
//   component: CustomerReviewPage,
// });

// function Unavailable() {
//   return (
//     <main className="grid min-h-screen place-items-center bg-background px-6 text-center text-foreground">
//       <div>
//         <h1 className="font-display text-2xl font-semibold tracking-tight">
//           This review page isn’t available
//         </h1>
//         <p className="mt-2 text-sm text-muted-foreground">
//           The link may be out of date or the page hasn’t been published yet.
//         </p>
//       </div>
//     </main>
//   );
// }

// function CustomerReviewPage() {
//   const business = Route.useLoaderData();
//   const { slug } = Route.useParams();
//   const runGenerate = useServerFn(generateReviews);

//   const [picked, setPicked] = useState<Record<string, string[]>>({});
//   const [ownWords, setOwnWords] = useState("");
//   const [options, setOptions] = useState<ReviewOption[]>([]);
//   const [reviewUrl, setReviewUrl] = useState<string | null>(null);
//   const [copiedId, setCopiedId] = useState<string | null>(null);

//   const questions = useMemo(() => business?.questions ?? [], [business]);

//   const generate = useMutation({
//     mutationFn: () =>
//       runGenerate({
//         data: {
//           slug,
//           selections: questions.map((q) => ({
//             question: q.question,
//             keywords: picked[q.id] ?? [],
//           })),
//           ownWords,
//         },
//       }),
//     onSuccess: (result) => {
//       setOptions(result.options);
//       setReviewUrl(result.reviewUrl ?? null);
//     },
//     onError: (error) =>
//       toast.error(error instanceof Error ? error.message : "Could not write your review."),
//   });

//   if (!business) return <Unavailable />;

//   function toggle(questionId: string, keyword: string) {
//     setPicked((prev) => {
//       const current = prev[questionId] ?? [];
//       return {
//         ...prev,
//         [questionId]: current.includes(keyword)
//           ? current.filter((k) => k !== keyword)
//           : [...current, keyword],
//       };
//     });
//   }

//   async function copy(option: ReviewOption) {
//     try {
//       await navigator.clipboard.writeText(option.text);
//       setCopiedId(option.id);
//       toast.success("Review copied. Paste it on Google.");
//       setTimeout(() => setCopiedId(null), 2000);
//     } catch {
//       toast.error("Copy didn’t work. Select the text and copy it manually.");
//     }
//   }

//   async function shareThisPage() {
//     const url = window.location.href;
//     try {
//       if (navigator.share) {
//         await navigator.share({ title: `Review ${business?.name ?? ""}`, url });
//         return;
//       }
//       await navigator.clipboard.writeText(url);
//       toast.success("Review page link copied.");
//     } catch {
//       /* user dismissed the share sheet */
//     }
//   }

//   const hasSelection =
//     ownWords.trim().length > 0 || Object.values(picked).some((list) => list.length > 0);

//   return (
//     <main className="min-h-screen bg-background px-4 py-8 text-foreground">
//       <div className="mx-auto max-w-xl">
//         <header className="flex items-center gap-3">
//           {business.logo_url ? (
//             <img
//               src={business.logo_url}
//               alt={`${business.name} logo`}
//               className="size-14 shrink-0 rounded-2xl object-cover ring-1 ring-border"
//             />
//           ) : (
//             <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sun to-ember font-display text-lg font-semibold text-primary-foreground">
//               {business.name.slice(0, 1).toUpperCase()}
//             </div>
//           )}
//           <div className="min-w-0 flex-1">
//             <h1 className="truncate font-display text-xl font-semibold tracking-tight">
//               {business.name}
//             </h1>
//             <p className="truncate text-xs text-muted-foreground">
//               {[business.category, business.location].filter(Boolean).join(" · ")}
//             </p>
//           </div>
//           <button
//             type="button"
//             onClick={shareThisPage}
//             className="shrink-0 rounded-full bg-card px-3 py-2 text-[11px] font-semibold text-primary ring-1 ring-border"
//           >
//             Share
//           </button>
//         </header>

//         <p className="mt-6 text-balance font-display text-2xl font-medium leading-snug">
//           Share your experience in under 60 seconds
//         </p>
//         <p className="mt-2 text-sm text-muted-foreground">
//           Tap the words that match your visit. We’ll turn them into a review you can post.
//         </p>

//         <div className="mt-6 space-y-4">
//           {questions.map((q) => (
//             <section key={q.id} className="rounded-3xl bg-card p-5 ring-1 ring-border">
//               <h2 className="text-sm font-semibold">{q.question}</h2>
//               <div className="mt-3 flex flex-wrap gap-2">
//                 {q.keywords.map((keyword) => {
//                   const active = (picked[q.id] ?? []).includes(keyword);
//                   return (
//                     <button
//                       key={keyword}
//                       type="button"
//                       onClick={() => toggle(q.id, keyword)}
//                       className={`chip-snap rounded-full px-4 py-2 text-sm font-semibold ${
//                         active
//                           ? "bg-primary text-primary-foreground"
//                           : "bg-background text-foreground ring-1 ring-border"
//                       }`}
//                     >
//                       {keyword}
//                     </button>
//                   );
//                 })}
//               </div>
//             </section>
//           ))}

//           <section className="rounded-3xl bg-card p-5 ring-1 ring-border">
//             <h2 className="text-sm font-semibold">Anything in your own words?</h2>
//             <textarea
//               value={ownWords}
//               onChange={(e) => setOwnWords(e.target.value)}
//               rows={3}
//               maxLength={2000}
//               placeholder="Optional — a detail or two makes it feel like you."
//               className="mt-3 w-full resize-none rounded-2xl border-0 bg-background px-4 py-3 text-sm ring-1 ring-inset ring-border focus:outline-none focus:ring-2 focus:ring-ring"
//             />
//           </section>
//         </div>

//         <button
//           type="button"
//           disabled={!hasSelection || generate.isPending}
//           onClick={() => generate.mutate()}
//           className="mt-5 w-full rounded-2xl bg-primary py-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-accent disabled:opacity-60"
//         >
//           {generate.isPending ? "Writing your review…" : "Generate my review"}
//         </button>

//         {options.length > 0 && (
//           <div className="mt-8 space-y-3">
//             <h2 className="font-display text-lg font-semibold tracking-tight">
//               Pick the one that sounds like you
//             </h2>
//             {options.map((option) => (
//               <article
//                 key={option.id}
//                 className="review-card rounded-3xl bg-card p-5 ring-1 ring-border"
//               >
//                 <div className="flex items-center justify-between gap-2">
//                   <span className="rounded-full bg-background px-2.5 py-1 text-[11px] font-semibold text-primary ring-1 ring-border">
//                     {option.length}
//                   </span>
//                   <span className="text-[11px] text-muted-foreground">{option.hint}</span>
//                 </div>
//                 <p className="mt-3 text-sm leading-relaxed">{option.text}</p>
//                 <div className="mt-4 flex flex-col gap-2 sm:flex-row">
//                   <button
//                     type="button"
//                     onClick={() => copy(option)}
//                     className="flex-1 rounded-xl bg-background py-3 text-sm font-semibold ring-1 ring-border"
//                   >
//                     {copiedId === option.id ? "Copied" : "Copy"}
//                   </button>
//                   {reviewUrl && (
//                     <a
//                       href={reviewUrl}
//                       target="_blank"
//                       rel="noreferrer"
//                       onClick={() => copy(option)}
//                       className="flex-1 rounded-xl bg-primary py-3 text-center text-sm font-semibold text-primary-foreground"
//                     >
//                       Post on Google
//                     </a>
//                   )}
//                 </div>
//               </article>
//             ))}
//             <p className="text-xs text-muted-foreground">
//               Nothing is posted for you — paste the review into Google and submit it yourself.
//             </p>
//           </div>
//         )}

//         <p className="mt-10 text-center text-[11px] text-muted-foreground/70">
//           <Link to="/" className="hover:underline">
//             Powered by Review Agent
//           </Link>
//         </p>
//       </div>
//     </main>
//   );
// }
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { getPublishedBusiness } from "@/lib/business.functions";
import { generateReviews, type ReviewOption } from "@/lib/reviews.functions";

export const Route = createFileRoute("/r/$slug")({
  loader: ({ params }) => getPublishedBusiness({ data: { slug: params.slug } }),
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Review page unavailable" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const title = `Leave a review for ${loaderData.name}`;
    const description = `Share your experience with ${loaderData.name} in under 60 seconds and post it to Google.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  errorComponent: () => <Unavailable />,
  notFoundComponent: () => <Unavailable />,
  component: CustomerReviewPage,
});

function Unavailable() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-6 text-center text-foreground">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          This review page isn’t available
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The link may be out of date or the page hasn’t been published yet.
        </p>
      </div>
    </main>
  );
}

// TODO: replace with real aggregate fields once you add them to `businesses`
// (e.g. reviews_helped_count, avg_completion_seconds, avg_rating).
const PLACEHOLDER_STATS = {
  reviewsHelped: "1,200+",
  avgTime: "under 60s",
  rating: "4.9",
};

function CustomerReviewPage() {
  const business = Route.useLoaderData();
  const { slug } = Route.useParams();
  const runGenerate = useServerFn(generateReviews);

  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [ownWords, setOwnWords] = useState("");
  const [options, setOptions] = useState<ReviewOption[]>([]);
  const [reviewUrl, setReviewUrl] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const questions = useMemo(() => business?.questions ?? [], [business]);

  const generate = useMutation({
    mutationFn: () =>
      runGenerate({
        data: {
          slug,
          selections: questions.map((q) => ({
            question: q.question,
            keywords: picked[q.id] ?? [],
          })),
          ownWords,
        },
      }),
    onSuccess: (result) => {
      setOptions(result.options);
      setReviewUrl(result.reviewUrl ?? null);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not write your review."),
  });

  if (!business) return <Unavailable />;

  function toggle(questionId: string, keyword: string) {
    setPicked((prev) => {
      const current = prev[questionId] ?? [];
      return {
        ...prev,
        [questionId]: current.includes(keyword)
          ? current.filter((k) => k !== keyword)
          : [...current, keyword],
      };
    });
  }

  async function copy(option: ReviewOption) {
    try {
      await navigator.clipboard.writeText(option.text);
      setCopiedId(option.id);
      toast.success("Review copied. Paste it on Google.");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Copy didn’t work. Select the text and copy it manually.");
    }
  }

  async function shareThisPage() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Review ${business?.name ?? ""}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Review page link copied.");
    } catch {
      /* user dismissed the share sheet */
    }
  }

  const hasSelection =
    ownWords.trim().length > 0 || Object.values(picked).some((list) => list.length > 0);

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <div className="bg-[#0b1e33] px-4 pb-20 pt-14 text-center text-white">
        <div className="mx-auto max-w-xl">
          {business.logo_url ? (
            <img
              src={business.logo_url}
              alt={`${business.name} logo`}
              className="mx-auto size-20 rounded-3xl bg-white object-cover p-2 shadow-lg"
            />
          ) : (
            <div className="mx-auto grid size-20 place-items-center rounded-3xl bg-white font-display text-2xl font-semibold text-[#0b1e33] shadow-lg">
              {business.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight">
            {business.name}
          </h1>
          {business.location && (
            <p className="mt-1 text-sm text-white/60">{business.location}</p>
          )}
          <p className="mx-auto mt-5 max-w-sm text-balance text-sm text-white/80">
            Loved your visit? Share an honest Google review in{" "}
            <span className="font-semibold text-[#ff8a4c]">under 60 seconds</span>.
          </p>
        </div>
      </div>

      <div className="mx-auto -mt-12 max-w-xl px-4 pb-12">
        {/* Stats row */}
        <div className="grid grid-cols-3 divide-x divide-border rounded-3xl bg-card px-2 py-5 text-center shadow-lg ring-1 ring-border">
          <div>
            <p className="font-display text-xl font-semibold">{PLACEHOLDER_STATS.reviewsHelped}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Reviews helped</p>
          </div>
          <div>
            <p className="font-display text-xl font-semibold">{PLACEHOLDER_STATS.avgTime}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Avg. time</p>
          </div>
          <div>
            <p className="font-display text-xl font-semibold">{PLACEHOLDER_STATS.rating}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Rating</p>
          </div>
        </div>

        {/* Dynamic questions as numbered steps */}
        <div className="mt-6 space-y-6">
          {questions.map((q, index) => (
            <section key={q.id}>
              <div className="flex items-center gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#0b1e33] text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <h2 className="font-display text-lg font-semibold tracking-tight">
                  {q.question}
                </h2>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 pl-10">
                {q.keywords.map((keyword) => {
                  const active = (picked[q.id] ?? []).includes(keyword);
                  return (
                    <button
                      key={keyword}
                      type="button"
                      onClick={() => toggle(q.id, keyword)}
                      className={`chip-snap rounded-full px-4 py-2 text-sm font-semibold ring-1 transition-colors ${
                        active
                          ? "bg-[#0b1e33] text-white ring-[#0b1e33]"
                          : "bg-card text-foreground ring-border"
                      }`}
                    >
                      {keyword}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}

          {/* Free text step */}
          <section>
            <div className="flex items-center gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#0b1e33] text-xs font-semibold text-white">
                {questions.length + 1}
              </span>
              <h2 className="font-display text-lg font-semibold tracking-tight">
                Anything specific to mention? <span className="text-sm font-normal text-muted-foreground">(optional)</span>
              </h2>
            </div>
            <div className="mt-3 pl-10">
              <textarea
                value={ownWords}
                onChange={(e) => setOwnWords(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="e.g. a detail or two that made your visit feel like you"
                className="w-full resize-none rounded-2xl border-0 bg-card px-4 py-3 text-sm ring-1 ring-inset ring-border focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </section>
        </div>

        {/* Generate button */}
        <button
          type="button"
          disabled={!hasSelection || generate.isPending}
          onClick={() => generate.mutate()}
          className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ff8a4c] py-4 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-95 disabled:opacity-50"
        >
          <span aria-hidden>✦</span>
          {generate.isPending ? "Writing your review…" : "Generate my review"}
        </button>
        {!hasSelection && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Pick at least one option above to continue.
          </p>
        )}

        {/* Disclaimer */}
        <div className="mt-5 flex gap-3 rounded-2xl bg-card p-4 text-xs text-muted-foreground ring-1 ring-border">
          <span aria-hidden className="mt-0.5">🛡️</span>
          <p>
            Please keep it honest. These drafts are based only on the options you pick — review
            and edit them so they reflect your real experience. We don't store your selections.
          </p>
        </div>

        {/* Generated options */}
        {options.length > 0 && (
          <div className="mt-8 space-y-3">
            <h2 className="font-display text-lg font-semibold tracking-tight">
              Pick the one that sounds like you
            </h2>
            {options.map((option) => (
              <article
                key={option.id}
                className="review-card rounded-3xl bg-card p-5 ring-1 ring-border"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-background px-2.5 py-1 text-[11px] font-semibold text-primary ring-1 ring-border">
                    {option.length}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{option.hint}</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed">{option.text}</p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => copy(option)}
                    className="flex-1 rounded-xl bg-background py-3 text-sm font-semibold ring-1 ring-border"
                  >
                    {copiedId === option.id ? "Copied" : "Copy"}
                  </button>
                  {reviewUrl && (
                    <a
                      href={reviewUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => copy(option)}
                      className="flex-1 rounded-xl bg-primary py-3 text-center text-sm font-semibold text-primary-foreground"
                    >
                      Post on Google
                    </a>
                  )}
                </div>
              </article>
            ))}
            <p className="text-xs text-muted-foreground">
              Nothing is posted for you — paste the review into Google and submit it yourself.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-10 border-t border-border pt-6 text-center">
          <p className="font-display text-sm font-semibold tracking-tight">
            {business.name}
            {business.location ? ` · ${business.location}` : ""}
          </p>
          <button
            type="button"
            onClick={shareThisPage}
            className="mt-3 rounded-full bg-card px-3 py-1.5 text-[11px] font-semibold text-primary ring-1 ring-border"
          >
            Share this page
          </button>
          <p className="mt-4 text-[11px] text-muted-foreground/70">
            <Link to="/" className="hover:underline">
              Powered by Arnav Technosys
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}