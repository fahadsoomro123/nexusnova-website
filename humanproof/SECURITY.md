# HumanProof Security Baseline

This prototype is designed to avoid paid verification dependencies while the core Verified Action model is validated.

## Current guarantees
- Exact action payload binding before approval.
- Cryptographic SHA-256 digest generation in supported browsers.
- One-time nonce per receipt.
- Timestamped receipt format.
- No biometric identity claim.
- No liveness claim.

## Planned zero-cost hardening
- WebAuthn/passkey challenge support.
- Replay protection and nonce expiry.
- Origin and RP-ID validation.
- Signed server receipts once a zero-cost backend endpoint is available.
- Rate limiting and audit logging.
- CSP and security headers.

## Important limitation
This repository is not represented as independently security-audited. Production deployment of high-risk verification should receive external security review before it is marketed as a security control.
