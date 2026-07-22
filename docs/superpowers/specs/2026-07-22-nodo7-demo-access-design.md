# NODO7 Demo Access Design

**Date:** 2026-07-22  
**Status:** Functionally approved; awaiting review of this written specification  
**Project:** `NODO7_IPTV_PANEL`

## Goal

Turn the copied IPTV panel into a focused NODO7 product with only two useful surfaces:

1. A public portal where an invited person redeems a one-use access code and generates one demo.
2. An authenticated administrative console where the operator creates, copies, monitors, and revokes those codes and reviews demo results.

The product must not expose or depend on the copied customer-management, sales, renewals, credits, templates, or general line-management interfaces.

## Branding

- Public and administrative interfaces use the NODO7 name.
- The supplied logo is sourced from `C:\Users\HP\Pictures\MEmu Photo\logonodo7.png` and will be copied into the project's public brand assets during implementation.
- The interface should derive its main visual direction from the logo's green, lime, black, and white palette while maintaining accessible contrast.
- Existing ClickTV and OptiMind public-facing branding must be removed from the NODO7 surfaces.

## Roles and Access

### Visitor

A visitor has no account and provides no phone number. Access is authorized only by a high-entropy one-use code created by the administrator.

### Administrator

The administrator signs in through the protected administrative authentication flow. Only an authenticated administrator can create, list, copy, revoke, or inspect access codes and demo attempts.

## Visitor Flow

### 1. Pending code

- The administrator creates a random, human-readable code such as `N7-7K9M-X4QP-2D8R-W6TC-A5HZ`.
- A newly created code remains pending without a countdown or automatic expiration.
- It remains valid until it is activated or manually revoked.
- The stored database value is a secure hash, not the plaintext code.

### 2. Activation

- The visitor enters the code on the NODO7 public portal.
- The server validates and activates it in a single atomic operation so two requests cannot redeem it simultaneously.
- Activation immediately starts a server-controlled 10-minute session.
- The original code can never start a second session.
- The browser receives a secure, HTTP-only session cookie. Reloading the page on the same browser resumes the active session with the original server deadline.

### 3. Demo selection

During the active session, the visitor sees:

- A required name field.
- A choice between `1 hora FULL` and `4 horas`.
- A visible countdown showing the remaining session time.
- A single `Generar mi demo` action.

The countdown is informational in the browser; the server is the authority and rejects generation after the deadline even if the local clock or page JavaScript is manipulated.

### 4. Generation

- The visitor submits a valid name and one package selection.
- The server generates at most one provider demo for that access session.
- On success, the page displays username, password, package, and provider expiration time with copy controls.
- The result remains visible while the session is active, including after a reload from the same browser.
- A successful generation marks the code as used and prevents another provider request. The browser session becomes result-only and continues displaying the credentials until its original deadline.

### 5. End of access

- Successful generation ends the right to generate but does not reset or shorten the original timer. The result-only session ends when the original 10-minute deadline is reached.
- If the deadline is reached without a successful demo, the code becomes expired permanently.
- An expired, used, or revoked code is never reactivated. The administrator must issue a new code when another attempt is justified.

## Administrative Console

The console is an operational tool rather than a decorative metrics dashboard. It provides:

- Generate a new access code and copy its plaintext value once for delivery.
- List and filter codes by `pending`, `active`, `used`, `expired`, or `revoked`.
- See creation, activation, deadline, generation, and completion timestamps.
- See the submitted name, selected package, demo username, provider expiration, request IP, and final result when available.
- Revoke a pending or active code immediately.
- Inspect failed activation and provider attempts without exposing sensitive provider credentials.
- Create a replacement code as a new record; never reset or reuse an old code.

The console does not include customers, paid lines, sales, renewals, credits, templates, or other unrelated copied modules.

## Data Model

### `demo_access_codes`

Stores the invitation lifecycle:

- Internal identifier.
- Unique code hash and non-secret display suffix.
- Status: `pending`, `active`, `used`, `expired`, or `revoked`.
- Creation and revocation metadata.
- Activation timestamp and server-calculated deadline.
- Secure session identifier hash.
- Activation IP and bounded audit metadata.
- Successful demo request reference when one exists.

Plaintext codes are returned only at creation time and are not recoverable from the database afterward.

### `demo_requests`

Stores the generation result:

- Access-code reference.
- Visitor name.
- Selected package.
- Provider request idempotency key.
- Status and sanitized error information.
- Generated username, provider expiration, and required response metadata.
- Creation and completion timestamps.

Passwords are treated as sensitive data and must not appear in application logs. They are encrypted at rest, available only to the active visitor session and an authenticated administrator, and automatically cleared when the provider-reported demo expiration is reached.

## Server Components

The implementation separates responsibilities into focused units:

- **Code service:** creates secure codes, hashes them, performs atomic activation, revocation, and lifecycle transitions.
- **Session service:** issues and validates the 10-minute secure browser session using server time.
- **Demo service:** validates the name and package, enforces one generation, and calls the IPTV provider through an adapter.
- **Provider adapter:** isolates the future client API and credentials from UI and access-code logic.
- **Admin service:** exposes authenticated code-management and audit operations.

The client's future API credentials are supplied through environment secrets and are never committed to the repository or sent to the browser.

## Security Rules

- Codes use cryptographically secure randomness with at least 96 bits of entropy, rendered in grouped characters for readability.
- Only code hashes are stored.
- Activation is atomic and single-use under concurrent requests.
- Session cookies are opaque, HTTP-only, `Secure` in production, and `SameSite=Strict`.
- Server time controls the 10-minute deadline.
- Activation allows at most 10 failed attempts per IP in a rolling 10-minute window. Generation allows at most three submissions per active session, including validation or explicit provider failures.
- Invalid, used, expired, and revoked codes return the same generic public error.
- Administrative routes require authentication and authorization.
- Provider secrets and raw provider errors are never exposed publicly.
- Audit events retain only the required IP, timestamps, status, and sanitized errors for 90 days, after which the IP and error details are removed.

## Error and Retry Behavior

- Invalid activation returns `Código inválido o no disponible` without revealing the code state.
- An already active code resumes only through its original secure browser session; entering it again does not create another session.
- Validation errors for name or package do not consume the single generation attempt while time remains.
- Explicit provider failures may be retried within the same active session.
- Provider calls use an idempotency key so a timeout or repeated browser request cannot create multiple demos.
- An ambiguous provider outcome is recorded for administrator review and cannot silently issue a second demo.
- When the 10-minute deadline expires, the server rejects all further generation attempts and transitions the code to expired.

## Testing Strategy

Automated tests must cover:

- Secure code creation and hash-only storage.
- Atomic activation under simultaneous requests.
- No countdown before activation and an exact server-side 10-minute window afterward.
- Session resume after reload on the original browser.
- Rejection from a second browser or repeated code entry.
- Required name and valid package selection.
- Exactly one successful demo per code.
- Timeout, revocation, rate limiting, and generic public errors.
- Provider idempotency and explicit versus ambiguous failure handling.
- Authentication on every administrative operation.
- Correct code status transitions and audit timestamps.
- Responsive rendering, keyboard access, visible focus, timer announcements, and usable contrast with the NODO7 brand.

## Out of Scope

- WhatsApp or SMS verification.
- End-user accounts or passwords.
- Customer, reseller, sales, renewal, credit, template, or paid-line management.
- Reusing or resetting consumed codes.
- Final provider integration before the client supplies its API contract and secrets.
- Restrictions supplied after this baseline design; those will be evaluated as explicit amendments without weakening the one-use and server-timer guarantees.

## Success Criteria

- A pending code has no timer before its first valid redemption.
- First redemption starts one server-controlled 10-minute session.
- The visitor supplies a name and selects either the 1-hour FULL or 4-hour demo.
- No code can produce more than one successful provider demo.
- Reloading the original browser does not reset or extend the timer.
- Expired, used, and revoked codes cannot be reused.
- The administrator can perform every necessary code operation from the focused NODO7 console.
- No unrelated copied business modules are exposed in the finished product.
