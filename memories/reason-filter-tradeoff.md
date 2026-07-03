---
name: reason-filter-mode
description: User prefers AND (match-all) as default for reason filter chips, with an optional OR toggle
metadata:
  type: feedback
---

The status reason filter chips on the simulator/devices view currently use OR logic (match any selected reason). User feedback suggests AND (match all) is more useful when narrowing down issues — e.g., selecting "Low Battery" + "Weak Signal" should show devices that have both problems, not either.

**Recommendation:** Default to AND with a small "Match Any" / "Match All" toggle so users can switch behavior as needed.

**How to apply:** Add a toggle/segmented control near the filter chips. Default to "Match All" (AND). The chip state tracks which reasons are active; the filter function applies either intersection or union based on the toggle state.
