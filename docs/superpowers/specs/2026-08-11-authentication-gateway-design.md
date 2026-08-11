# Auctor Authentication Gateway Design

Date: 2026-08-11
Status: Architecture approved; awaiting written-spec review

## Goal

Make the first Auctor experience obvious and welcoming for any user. Visiting the canonical product domain must show a short branded loading state, resolve the existing session, and then either enter the authenticated product or present a focused sign-in card. Product navigation and operational telemetry must never appear before authentication.

## Canonical routing

- `https://auctor.space/` is the canonical public entry point.
- `https://www.auctor.space/` redirects permanently to the canonical apex domain.
- `https://api.auctor.space/` remains the production application and API origin until the deployment topology is separated. The public domain proxies application requests to it without exposing `/backend` to users.
- `/` owns session resolution; it no longer redirects directly to `/audit`.
- An authenticated visit to `/` redirects to `/agent`.
- An unauthenticated visit to `/agent`, `/chat`, or `/audit` redirects to `/?next=<safe-local-path>`.
- After successful authentication, the app uses the validated `next` path when present and otherwise routes to `/agent`.
- Only relative allowlisted product paths may be used as `next` values. External URLs and protocol-relative paths are rejected.

## Experience

### Session-loading state

The initial screen is full-viewport graphite with the Auctor mark centered. The mark enters with a restrained reserve-to-ascent animation and the wordmark fades in beneath it. Motion lasts only long enough to avoid a blank flash while `/api/auth/session` resolves. Reduced-motion users receive a static mark.

The loading state contains no sidebar, navigation, telemetry, forms, or capability claims.

### Authentication gateway

When no valid session exists, the graphite background transitions to an ivory authentication card. The card contains:

1. Auctor mark and wordmark.
2. Heading: `Your onchain agent starts here.`
3. One-sentence explanation focused on continuity and user control.
4. Primary action: `Continue with wallet`.
5. Divider labelled `or`.
6. Email address field and `Email me a sign-in link` action.
7. Short safety text explaining that wallet sign-in requests a message signature, creates no transaction, and costs no gas.

The card is centered and intentionally compact on desktop. On mobile it fills the available width with comfortable edge spacing. No product rail is rendered behind or beside it.

### Wallet sign-in

The primary action performs this sequence:

1. Discover the injected EIP-1193 provider.
2. Request accounts with `eth_requestAccounts`.
3. Read `eth_chainId`.
4. Request a server-generated SIWE challenge.
5. Ask the wallet to sign the exact challenge using `personal_sign`.
6. Submit the message, signature, wallet address, and chain ID for verification.
7. Resolve the new application session and navigate to the intended authenticated route.

The button exposes one clear state at a time: connect, approve connection, sign message, verifying, or retry. Rejections are not treated as system failures.

### Email sign-in

The email form normalizes and validates the address through the existing server boundary. On acceptance, the card changes to a confirmation state that tells the user to check their inbox and that the link expires in 15 minutes. The email verification endpoint establishes the session and redirects through the same safe post-authentication routing path.

## Authenticated shell

The command rail, Audit, Chat, Memory, and system telemetry render only after the server has resolved a valid `auctor_session`. The shell is not merely hidden with CSS; unauthenticated routes must not render it. `/agent` becomes the first authenticated onboarding workspace. Existing users with configured agents may proceed directly to their workspace state.

## Component boundaries

- `PublicGateway`: owns session resolution and selects loading, login, or redirect behavior.
- `BrandLoader`: presentation-only branded loading state with reduced-motion support.
- `LoginCard`: composes wallet and email options and owns accessible status messaging.
- `WalletSignIn`: coordinates UI state around the existing EIP-1193 client.
- `EmailSignIn`: coordinates the email-link request and confirmation state.
- `AuthenticatedShell`: contains the current command rail and product content.
- `safeNextPath`: validates post-authentication destinations independently of React and routing.

These units must communicate through explicit props or small client functions. Authentication transport, route validation, and presentation state remain independently testable.

## Error handling

- Authentication clients must not call `response.json()` blindly. They inspect the response content type/body and convert empty, HTML, malformed JSON, and structured API failures into stable user-facing errors.
- Raw errors such as `Unexpected end of JSON input`, stack traces, KeeperHub internals, and database details never reach the interface.
- Missing wallet: explain that a compatible wallet is required and keep email available.
- User rejects connection or signature: state that sign-in was cancelled and allow immediate retry.
- Challenge unavailable: show a temporary-service message without requesting a signature.
- Verification rejected: show that the signature could not be verified and issue a fresh challenge on retry.
- Email delivery unavailable: preserve the entered address and offer wallet sign-in.
- Session check unavailable: present login safely rather than rendering authenticated navigation.

## Accessibility and motion

- The login card is keyboard navigable with visible focus states.
- Status changes use an `aria-live` region without moving focus unexpectedly.
- Buttons remain descriptive while busy and expose `aria-busy`.
- The icon animation respects `prefers-reduced-motion`.
- Contrast meets WCAG AA for body text, controls, errors, and focus indicators.

## Testing

- Unit tests for safe `next` validation and authentication response parsing.
- Unit tests for successful wallet signing, missing providers, user rejection, empty responses, malformed JSON, structured failures, and invalid provider output.
- Route tests for authenticated and unauthenticated `/` behavior and protected-path redirects.
- Component or browser tests proving the public gateway never renders the command rail before authentication.
- Browser tests for wallet success with an injected mock EIP-1193 provider, wallet cancellation, email acceptance, session restoration, and mobile layout.
- Production verification on `auctor.space` for apex/www redirects, session cookies, post-login navigation, and absence of raw parser errors.

## Deployment considerations

DNS and ingress must make `auctor.space` the canonical browser origin while preserving `api.auctor.space` for API/deployment health. `AUCTOR_PUBLIC_URL`, metadata, email verification links, cookie behavior, and proxy rules must agree on the canonical browser origin. The SIWE message must retain the exact domain and URI required by KeeperHub verification unless KeeperHub explicitly supports the Auctor domain; the client must never rewrite the signed message. The public origin must be accepted by the authentication boundary. The release health check remains on the API origin, and a post-deploy smoke check is added for the public `/` and protected-route behavior.

## Out of scope

- Social login providers.
- WalletConnect QR/mobile deep-link support.
- Account linking between an independently created email account and wallet account.
- Redesigning the authenticated Audit, Chat, Memory, or agent-control workspaces.
