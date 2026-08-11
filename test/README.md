# Test Suite

End-to-end tests for the AI Orchestration Engine. Uses Node's built-in `node:test`
runner — no extra dependencies. Every test talks to a live server over HTTP and exercises
the real providers, tools, modes, history, and session systems.

## Run

```bash
npm test                 # boot server, run suite, tear down
npm test -- --email      # also run the real-SMTP email tests
```

The orchestrator (`run.js`) starts `node app.js`, waits for it to be ready, runs
`node --test test/`, then kills the server. If a server is already reachable at
`TEST_BASE` (default `http://localhost:3000`), it reuses it instead of booting one.

### Flags / env

| Var / flag | Purpose |
|---|---|
| `TEST_SEND_EMAIL=1` or `--email` | Enable tests that send real email via SMTP (off by default — side-effecting). Recipient parsed from `EMAIL_FROM`. |
| `TEST_BASE=http://host:port` | Target an already-running server instead of booting one. |
| `TEST_USER_PREFIX` | Prefix for the `qa_*` test users created on first run (default `qa`). |
| `TEST_PASS` | Password for test users (default `Qa!Pass1_Test`). |

Server boot log is written to `test/.server.log`.

## Files

| File | Covers (priority areas in **bold**) |
|---|---|
| `01-auth.test.js` | signup/login, `/auth/admin`, protect-gate redirect, change-password, avatar upload/remove |
| `02-services.test.js` | **services**: Groq (skipped — quota), ArvanCloud (GPT/Gemini/Thinking), `askGemini` hybrid dispatch, `/initial-prompt`, `/ask`, `/ask-arvan` tool-calling, `/ask-groq` (skipped — quota), `/api/` simpleApi (skipped — premium), thinking mode, Gemini vision (skipped — premium), `/ask-smart` (skipped — premium) |
| `03-tools.test.js` | **tools**: weather, forecast, air quality, time, web search (sources), web crawler, business-info doc, sendEmail |
| `04-modes.test.js` | **iframe mode**: restricted (tools stripped / web search gated), BMS (`searchBmsDatabase`), ETEQ (web search + non-persistence) |
| `05-history-sessions.test.js` | **history** + **sessions**: `session_id` cookie, in-memory continuity, list/details, restore (new id), clear, delete, email-history |
| `helpers.js` | HTTP `Client` with cookie jar, `authedClient`, mode referers, `poll`, fixtures |
| `run.js` | boot/run/teardown orchestrator |
| `data/sample.png` | 1×1 PNG fixture for vision/avatar tests |

## Notes

- Tests hit live external services (Gemini, ArvanCloud, Groq, OpenWeather, DDG web search,
  the BMS API, SMTP). Failures may reflect upstream outages or quota, not just regressions —
  check `test/.server.log` and the console evidence lines.
- A 3s `afterEach` pause (`helpers.js` `pace`) spaces tests out so the suite doesn't pressure
  the LLM provider's rate limit. Tests run serialized (`--test-concurrency=1`).
- Groq/Llama tests are `test.skip` to protect the daily quota — the route/UI stay fully
  functional; exercise `/ask-groq` manually. Vision, `/ask-smart`, and `/api/` simpleApi are
  `test.skip` because they hit the free-tier native Gemini key (429 today) — they un-skip
  once a premium key is configured.
- `POST /api/vector/sync` (RAG rebuild) is not run by default to avoid wiping the vector
  store on every regression run; exercise it manually when changing the RAG path.
- First run creates `qa_*` users in MongoDB (there is no delete-user endpoint); later runs
  just log them in.