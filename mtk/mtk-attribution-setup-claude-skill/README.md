# MTK Attribution Setup — Claude Skill

A Claude Skill that walks through installing MTK Attribution on a client site:
pointing at the right platform install guide, confirming the field map, and
adding the hidden form fields with exactly the right names.

## What's inside

`mtk-attribution-setup-claude-skill.md` — the skill itself. It carries:

- **Where the real docs live** — the docs hub, all twelve platform install
  guides with their slugs and setup method, the reference pages, and
  troubleshooting. The skill is told to open the live guide before giving
  setup instructions, since platform steps change.
- **The naming rules** — the visible Label is human-readable and never
  prefixed with "MTK" (`First Channel`, not `MTK First Channel`), while the
  HTML `name` attribute must be exactly `mtk_first_channel` because the tag
  matches on it. Click ID and Meta cookie labels stay lowercase (`gclid`,
  `fbc`) — they're wire identifiers, not prose.
- **A fetch step instead of a field list** — the skill carries no copy of the
  fields. It fetches
  `https://www.boggsmtk.com/products/attribution/docs/fields.md`, raw Markdown
  rendered straight from the live field map, before naming anything. If the
  fetch fails it asks for the dashboard's **Export CSV** rather than guessing,
  and it treats a client's own field map as outranking the standard one.
- **Add all of them by default** — the whole standard set unless the user says
  otherwise, because a field that was never on the form has no history to
  answer with later and cannot be backfilled.
- **Reusing fields that are already there** — when a site already runs
  Attributer or already has hidden `utm_*` inputs, work out what each existing
  field corresponds to, then **rename it to MTK naming** rather than freezing
  the old name in place. Carries the Attributer field/token → MTK mapping, the
  loose-UTM mapping, how to apply a rename per platform (including the
  Default-Value platforms where the name isn't yours to set), the CRM
  re-pointing that a rename implies, and the value-shape changes that survive
  it (channel wording, landing page as a path). The Attributer drilldowns are
  treated as a starting guess to confirm with the user, not a mapping — what
  lands in them depends on which UTMs that client actually sends.
- **A final ordering pass** — First, then Last, then IDs, then Insights, on the
  form and in the field map, so a lead record reads as one first-touch story
  then one last-touch story instead of alternating dimension by dimension.
- **Verification steps** and the most common failure (a name mismatch
  producing a silently empty field).

`mtk_attribution_summary` (the all-fields roll-up) and `mtk_journey_json` (the
machine-readable journey) are listed in the fetched reference under "Not in the
standard set" — real fields, just not ones a form gets by default.

## Installing it in Claude

Claude expects a skill's entry file to be named `SKILL.md` inside a folder
named for the skill. To install:

```
mtk-attribution-setup/
└── SKILL.md      ← mtk-attribution-setup-claude-skill.md, renamed
```

The YAML frontmatter at the top of the file (`name`, `description`) is what
Claude reads to decide when to trigger the skill — keep it intact.

## Keeping it current

This skill is meant to be handed to customers, who run it in their own Claude.
A wrong detail produces an empty field on a client's form with no error
anywhere, in an account nobody here is watching — so field names are fetched,
not written down. **Do not paste the field list back into the skill.** The
moment a field is added or renamed, every installed copy would start handing
out names that no longer match.

Adding, renaming, or repointing a field needs no change here at all: the
reference is rendered from `DEFAULT_FIELD_MAP` and `FIELD_TITLES` in
`src/lib/mtk.ts` (`whboggs/boggsmtk`) on every deploy. Same for a new engine
data source (`whboggs/mtk-attribution`, `src/engine.js`).

What still needs updating by hand:

- a docs page added, removed, or moved — the URLs and platform slugs are
  hardcoded in the skill, `/products/attribution/docs/fields.md` included
- a platform changing its install method
- Attributer renaming a field or changing a token, which breaks the remapping
  table (https://help.attributer.io)

The skill file repeats this in its own "Keeping this skill current" section,
so whoever opens it sees the obligation too.
