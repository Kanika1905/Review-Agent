import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { AiError, callAiJson } from "./ai.server";
import { getPublishedBusinessInternal } from "./reviews.server";

const GenerateInput = z.object({
  slug: z.string().min(1),
  selections: z.array(z.object({ question: z.string(), keywords: z.array(z.string()) })),
  ownWords: z.string().max(2000).optional().default(""),
});

export type ReviewOption = {
  id: string;
  length: "Small" | "Medium" | "Detailed";
  hint: string;
  text: string;
};

export const generateReviews = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => GenerateInput.parse(input))
  .handler(async ({ data }) => {
    const business = await getPublishedBusinessInternal(data.slug);
    if (!business) throw new Error("This review page is not available.");

    const picked = data.selections
      .filter((s) => s.keywords.length > 0)
      .map((s) => `- ${s.question}: ${s.keywords.join(", ")}`)
      .join("\n");

    if (!picked && !data.ownWords.trim()) {
      throw new Error("Pick at least one keyword or write a few words first.");
    }

    let result: { small: string[]; medium: string[]; detailed: string[] };
    try {
      result = await callAiJson<{ small: string[]; medium: string[]; detailed: string[] }>({
        system: [
          "You write authentic first-person Google reviews for a customer.",
          "Use ONLY the verified business information, the customer's selected keywords and their own words.",
          "Never invent staff names, prices, services, events, results, dates or any claim that was not provided.",
          "Sound natural and human. No hashtags, no emoji, no markdown, no quotation marks around the review.",
          "Return strict JSON: {\"small\":[string,string],\"medium\":[string,string],\"detailed\":[string,string]}",
          "small = 1-2 sentences, medium = 2-4 sentences, detailed = 4-6 sentences. Each pair must be clearly different.",
        ].join(" "),
        user: [
          `Business name: ${business.name}`,
          business.category ? `Type of business: ${business.category}` : "",
          business.location ? `Location: ${business.location}` : "",
          business.services?.length ? `Services: ${business.services.join(", ")}` : "",
          "",
          picked ? `Customer selected:\n${picked}` : "Customer selected: (nothing)",
          "",
          data.ownWords.trim()
            ? `Customer's own words: ${data.ownWords.trim()}`
            : "Customer's own words: (none)",
        ]
          .filter(Boolean)
          .join("\n"),
      });
    } catch (error) {
      if (error instanceof AiError) throw new Error(error.message);
      throw error;
    }

    const build = (
      list: string[] | undefined,
      length: ReviewOption["length"],
      hint: string,
    ): ReviewOption[] =>
      (list ?? [])
        .filter((t) => typeof t === "string" && t.trim())
        .slice(0, 2)
        .map((text, i) => ({ id: `${length}-${i}`, length, hint, text: text.trim() }));

    const options = [
      ...build(result.small, "Small", "1–2 sentences"),
      ...build(result.medium, "Medium", "2–4 sentences"),
      ...build(result.detailed, "Detailed", "4–6 sentences"),
    ];

    if (options.length === 0) throw new Error("No reviews came back. Please try again.");
    return { options, reviewUrl: business.review_url };
  });
