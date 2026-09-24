# Review Genie (56)

Build a complete AI-powered web application called Review Agent.

The goal is to take a business website URL, analyze the business, create a customized review questionnaire, and let customers generate an authentic Google review in under 60 seconds.

PAGE 1 — ADMIN LOGIN

Create a simple secure Admin Login page.

Fields:

Email

Password

Login

Only authenticated admins can access the business setup.

PAGE 2 — WEBSITE ANALYZER / BUSINESS SETUP

After login, show:

Enter Business Website URL

[ Website URL ]

[ Analyze Website ]

The AI agent should analyze the public website and extract:

Business name

Business logo

Business category/type

Business location

Services/products relevant to the business

Based on the business type and website content, automatically generate 3–4 business-specific review questions, each with 4–8 selectable keyword options.

Questions and keywords must adapt to the business.

Examples:

Salon → haircut, hair color, staff, ambience, result

Restaurant → food, taste, service, ambience, portions

Hotel → room, cleanliness, staff, amenities, hospitality

Hospital → treatment, staff, care, cleanliness, service

Also add one mandatory question:

Overall Experience

with a large optional text box:

“Want to tell us anything in your own words?”

The customer can type their own experience if they want.

Google Review Setup

Use the extracted business name + location to determine the correct Google Place ID when possible.

Store:

Google Place ID

Google Review URL

The Google review URL should use:

https://search.google.com/local/writereview?placeid=PLACE_ID

If the Place ID cannot be automatically determined, allow the admin to manually enter it.

Show the extracted information to the admin and allow editing/correction.

Then:

[ Confirm & Publish ]

Only after the admin confirms the business details should the customer review page become available.

PAGE 3 — CUSTOMER REVIEW WEB APP

Show:

Business Logo

Business Name

Short instruction:

Share your experience in under 60 seconds.

Display the generated business-specific questions.

For each question, show selectable keyword chips.

Allow multiple keyword selections.

Also show:

Overall Experience

A large optional text area where the customer can write anything in their own words.

Then:

[ Generate Review ]

AI REVIEW GENERATION

When Generate Review is clicked:

Send:

Business information

Selected keywords

Customer's optional written experience

to a secure backend/Supabase Edge Function.

The Edge Function calls the Claude API.

Never expose the Claude API key in the frontend.

Claude generates 3 review types, with 2 options each:

Small

2 options, approximately 1–2 sentences.

Medium

2 options, approximately 2–4 sentences.

Detailed

2 options, approximately 4–6 sentences.

Total: 6 review options.

Reviews must sound natural and authentic.

Only use information provided by the customer's selections, their written experience, and verified business information.

Never invent experiences, staff names, prices, services, events, results, or other claims.

REVIEW CARDS

Each review option must have:

[ Copy ] [ Post on Google ]

Copy

Copy that exact review text to the clipboard.

Post on Google

Copy that exact review to the clipboard.

Open the business's Google Review URL using its Place ID.

Tell the customer:

“Review copied. Paste it into Google and submit your review.”

Do not attempt to automatically type or submit the review inside Google's website.

Every individual review button must copy and post its own exact review.

TECHNICAL REQUIREMENTS

Use:

Modern responsive mobile-first UI

Secure admin authentication

Supabase database

Supabase Edge Functions

Claude API

Secure environment variables

Dynamic business configurations

The system must support many different businesses using the same application.

Architecture:

Website URL
→ AI Website Analysis
→ Business Name + Logo + Category + Location
→ Google Place ID / Review URL
→ Business-specific Questions + Keywords
→ Admin Confirmation
→ Published Review Page
→ Customer selects keywords + optional written experience
→ Generate Review
→ Claude API
→ Small / Medium / Detailed × 2
→ Copy / Post on Google

Keep the UI simple, fast and optimized for completing a review in under 60 seconds.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://charm-reviews-ai.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/82feaa87-5be8-4d6d-9a53-2baed63b082b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
