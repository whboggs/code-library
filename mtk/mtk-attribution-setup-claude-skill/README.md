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
- **All 41 fields** — Label, HTML name, `[mtk:…]` token, and data source, in
  three groups: query sources, cookies & click IDs, and insights. Canonical
  names only; the legacy `mtk_ft_*` / `mtk_lt_*` spellings are called out as
  off-limits for new work.
- **Verification steps** and the most common failure (a name mismatch
  producing a silently empty field).

Excluded from the field list on purpose: `mtk_attribution_summary` (the
all-fields roll-up) and `mtk_journey_json` (the machine-readable journey).
Both still exist and can be added by hand when a client needs them.

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

**This skill duplicates information that lives elsewhere, and it goes stale
silently** — a wrong field name here produces an empty field on a client's
form with no error anywhere. Update it in the same change as:

- a field name, label, or data source change, or a field added or removed —
  source of truth is `DEFAULT_FIELD_MAP` and `FIELD_TITLES` in
  `src/lib/mtk.ts` (`whboggs/boggsmtk`); the dashboard's **Export CSV** on the
  field-map screen dumps the live list
- a docs page added, removed, or moved — the URLs and platform slugs are
  hardcoded in the skill
- a platform changing its install method
- the engine gaining or renaming a data source (`whboggs/mtk-attribution`,
  `src/engine.js`)

The skill file repeats this list in its own "Keeping this skill current"
section, so whoever opens it sees the obligation too.
