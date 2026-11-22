# DeltaDevs — 3-minute Kill Switch demo

1. Open RuntimeOS Console → Kill Switch. Show the existing agent governance console and three demo identities.
2. Click **Run Kill Switch demo**.
3. Research Agent makes a legitimate supplier update; Inventory Agent updates stock. Both are evaluated by the existing RuntimeOS policy/risk evaluator and journalled.
4. Finance Agent commits a simulated harmful bank-account substitution in the synthetic sandbox. The post-execution monitor attributes it and raises a critical incident.
5. RuntimeOS quarantines only Finance Agent. Research and Inventory remain active.
6. Recovery compares the current bank-account field with the recorded after-state, restores only that field, increments the resource version and marks the change recovered.
7. Show the preservation check: supplier name remains Northstar Components; bank account is restored to MASKED-0000; inventory quantity stays at 37; healthy agents remain active.
8. Explain that normal external `/api/killswitch/actions` requests containing sensitive fields are blocked before execution. The demo's post-execution attack exists only to prove compensating recovery.

Do not describe synthetic demo values as production benchmarks. Do not claim arbitrary external side effects can always be undone.
