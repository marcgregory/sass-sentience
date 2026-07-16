# Release Index

> Navigable history of all Sentience IoT Platform releases.
> Process: `docs/release/RELEASE_PROCESS.md`
> Template: `docs/release/VALIDATION_TEMPLATE.md`

---

## Status Legend

| Icon | Meaning |
|------|---------|
| 🟢 Approved | All gates passed; release approved. |
| 🟠 Approved with Conditions | Non-blocking issues documented with follow-up. |
| 🔴 Blocked | One or more gates failed; release cannot proceed. |
| 🟡 Pending Validation | Validation in progress. |
| ⚪ Pre-process | Release predates formal validation process. |

---

## Release Table

| Version | Release Date | Commit | Tag | Decision | Validation |
|---------|-------------|--------|-----|----------|------------|
| v1.6.0 | 2026-07-16 | `9e69571` | `v1.6.0` | 🟢 Validated / Released | [`VALIDATION_v1.6.0.md`](./VALIDATION_v1.6.0.md) |
| v1.3.0 | 2026-07-05 | `b8f9e39` | `v1.3.0` | ⚪ Pre-process | — |
| v1.2.0 | 2026-07-05 | `b9079ee` | `v1.2.0` | ⚪ Pre-process | — |
| v1.1.1 | 2026-07-05 | `f28b112` | `v1.1.1` | ⚪ Pre-process | — |
| v1.0.0 | 2026-07-05 | `180238c` | `v1.0.0` | ⚪ Pre-process | — |
| v1.0.0-rc.5 | 2026-07-05 | `545c8c1` | `v1.0.0-rc.5` | ⚪ Pre-process | — |
| v1.0.0-rc.4 | 2026-07-05 | `cfc5911` | `v1.0.0-rc.4` | ⚪ Pre-process | — |
| v1.0.0-rc.3 | 2026-07-05 | `5b58770` | `v1.0.0-rc.3` | ⚪ Pre-process | — |

> **Newest first.** Once v1.6.0 is validated, update its row — set the date, tag, and final decision. As more releases are validated, add rows above the most recent entry.

---

## How to Update

When a new release is validated:

1. **Fill the validation document** — complete `VALIDATION_vX.Y.Z.md` with gate results.
2. **Update this index** — add a row for the new release with the final decision.
3. **Update v1.6.0's row** — if v1.6.0 has been validated, replace 🟡 with the actual decision and fill the tag/date.
