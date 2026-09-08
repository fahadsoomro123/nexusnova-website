# Daily Manual Verification Checklist

- Open the HumanProof prototype in a modern browser.
- Confirm the protected action text is visible before approval.
- Confirm the approval button is disabled until explicit consent is checked.
- Approve once and verify a new timestamp and receipt ID are generated.
- Confirm the SHA-256 digest is present.
- Download the JSON receipt and confirm its action/resource values match the screen.
- Reload the page and confirm a new approval creates a different nonce/receipt ID.
- Confirm no page claims liveness, identity, or biometric verification before those controls exist.
- Confirm the HumanProof visual does not create its own vertical scroll area.
- Record any mismatch before production use.
