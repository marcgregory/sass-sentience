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
| v1.8.0 | 2026-07-16 | `5742a97` | `v1.8.0` | 🟢 Validated / Released | [`VALIDATION_v1.8.0.md`](./VALIDATION_v1.8.0.md) |
| v1.7.0 | 2026-07-16 | `a05533f` | `v1.7.0` | 🟢 Validated / Released | [`VALIDATION_v1.7.0.md`](./VALIDATION_v1.7.0.md) |
| v1.6.0 | 2026-07-16 | `9e69571` | `v1.6.0` | 🟢 Validated / Released | [`VALIDATION_v1.6.0.md`](./VALIDATION_v1.6.0.md) |
| v1.3.0 | 2026-07-05 | `b8f9e39` | `v1.3.0` | ⚪ Pre-process | — |
| v1.2.0 | 2026-07-05 | `b9079ee` | `v1.2.0` | ⚪ Pre-process | — |
| v1.1.1 | 2026-07-05 | `f28b112` | `v1.1.1` | ⚪ Pre-process | — |
| v1.0.0 | 2026-07-05 | `180238c` | `v1.0.0` | ⚪ Pre-process | — |
| v1.0.0-rc.5 | 2026-07-05 | `545c8c1` | `v1.0.0-rc.5` | ⚪ Pre-process | — |
| v1.0.0-rc.4 | 2026-07-05 | `cfc5911` | `v1.0.0-rc.4` | ⚪ Pre-process | — |
| v1.0.0-rc.3 | 2026-07-05 | `5b58770` | `v1.0.0-rc.3` | ⚪ Pre-process | — |

> **Newest first.** Add new releases as they are validated. Keep the table sorted newest-first.

---

## How to Update

When a new release is validated:

1. **Fill the validation document** — complete `VALIDATION_vX.Y.Z.md` with gate results.
2. **Update this index** — add a row for the new release with the final decision at the top of the table.
