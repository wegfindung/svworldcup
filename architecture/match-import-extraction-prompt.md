# Match Import — Screenshot Extraction Prompt Template

The match data import engine never receives images. An admin extracts a match's stats from
screenshots using a general-purpose AI assistant (Claude, ChatGPT, Codex, etc.) on their own
machine, then pastes the resulting JSON into the import panel.

This is the **standard prompt** every team member should use, so extraction output is
consistent regardless of which assistant they use. Paste the prompt together with the match
screenshot(s) into the assistant, then copy the JSON it returns into the import panel for the
fixture.

The JSON shape and rules below are the contract the platform validates against — see
`SOP_match_data_import.md` ("JSON Contract") and `import-engine.md`. If the assistant returns
anything outside this shape, the upload is rejected with a clear error.

## The prompt

```text
You are extracting football match statistics from one or more screenshots of a single match.
Return ONLY a JSON object — no prose, no markdown fences — in exactly this shape:

{
  "match": {
    "homeTeam": "<home team name as shown>",
    "awayTeam": "<away team name as shown>",
    "homeGoals": <integer, final score for the home team>,
    "awayGoals": <integer, final score for the away team>,
    "sourceUrl": "<the URL of the match page the screenshot is from>"
  },
  "players": [
    {
      "name": "<player name exactly as shown on screen>",
      "team": "<must be exactly the homeTeam or awayTeam value above>",
      "lineupStatus": "starter" | "substitute",
      "minutes": <integer minutes played, 0-130>,
      "goals": <integer goals scored, 0-20>,
      "assists": <integer assists, 0-20>,
      "rating": <the match rating shown, a number 0-10, decimals allowed>
    }
  ]
}

Rules:
- Transcribe only what is visible in the screenshots. Do not infer, calculate, or add fields.
- Include only players who appeared: every starter, plus every substitute who was actually
  brought on. Do NOT include unused substitutes or squad members who did not play.
- "lineupStatus" is "starter" for players in the starting XI and "substitute" for players who
  came on from the bench.
- Every player's "team" must be one of the two team names in the "match" object.
- Do not list the same player twice.
- Use the player name exactly as the screenshot spells it, including accents — the platform
  resolves names to its own player records.
- "rating" is the displayed match rating (e.g. the SofaScore rating). If a player has no
  rating shown, use 0.
- One JSON object describes one complete match. If the stats span several screenshots, merge
  them into a single object.
- Leave "sourceUrl" as the match page URL; if you do not have it, use an empty string and the
  admin will fill it in before uploading.

Output the JSON object and nothing else.
```

## Notes for the admin

- Fill in `sourceUrl` with the actual match page URL before uploading if the assistant left it
  blank — the import panel needs a valid URL, and the second confirming admin uses it to check
  the numbers against the source.
- The platform owns everything the JSON does not carry: it resolves names to player records,
  derives clean-sheet eligibility from the score during review, and never accepts application
  IDs or computed point totals in the JSON.
- If the import panel rejects the JSON, the error message names the problem. The usual causes
  are a player on a team not in the match, the same player listed twice, a missing or
  malformed `sourceUrl`, or the JSON describing a different fixture than the one selected.
