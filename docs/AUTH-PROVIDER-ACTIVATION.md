# NexusNova Official Auth Provider Activation

Status: repository wiring is ready for Google, X/Twitter, Facebook and Apple on the website. Provider items remain **pending** until the corresponding external provider is configured and a real production sign-in + existing-account link are verified end-to-end.

## Fixed Firebase web identity

- Firebase project ID: `nexusnova-6ade2`
- Firebase auth domain used by the website: `nexusnova-6ade2.firebaseapp.com`
- Firebase OAuth handler / provider callback URL:
  `https://nexusnova-6ade2.firebaseapp.com/__/auth/handler`
- Production website domain that must be authorized in Firebase Authentication:
  `nexusnovatools.com`
- If `www.nexusnovatools.com` is ever used as an auth entry point, authorize it separately before using it.

Never commit provider API secrets, app secrets, Apple private keys, access tokens, or OAuth client secrets to this repository. Provider secrets belong only in the provider/Firebase console fields designed for them.

## Google

1. Firebase Console → Authentication → Sign-in method → Google.
2. Enable Google and save the provider configuration.
3. Confirm `nexusnovatools.com` is listed under Firebase Authentication authorized domains.
4. Production verification must cover:
   - new user: `Continue with Google` creates/opens the real Firebase account;
   - existing email/password user: dashboard `Connect Google` links Google to the same Firebase UID;
   - a Google credential already owned by another NexusNova UID is rejected rather than silently moved;
   - cancel/error states never display `CONNECTED`.

The website implementation uses Firebase `GoogleAuthProvider`, `signInWithPopup`, and `linkWithPopup`.

## X / Twitter

Firebase still identifies this provider as `twitter.com` and uses `TwitterAuthProvider`.

1. Create/configure the official developer application for the NexusNova X account.
2. Set this exact Authorization callback URL in the X/Twitter developer application:
   `https://nexusnova-6ade2.firebaseapp.com/__/auth/handler`
3. Firebase Console → Authentication → Sign-in method → Twitter.
4. Enable the provider and enter the API key + API secret in Firebase Console only.
5. Do not put the API secret in website JavaScript, GitHub files, Actions logs, or chat.
6. Production verification must cover fresh sign-in, existing-account linking, duplicate-credential rejection, cancellation and provider-disabled/error behavior.

## Facebook / Meta

1. Use the official Meta developer app for NexusNova and obtain its Facebook App ID + App Secret.
2. In the Meta app's Facebook Login settings, add this exact Valid OAuth Redirect URI:
   `https://nexusnova-6ade2.firebaseapp.com/__/auth/handler`
3. Firebase Console → Authentication → Sign-in method → Facebook.
4. Enable Facebook and enter the App ID + App Secret in Firebase Console only.
5. Ensure the Meta app's public website/privacy details are accurate before moving it to any required live/production mode.
6. Production verification must cover fresh sign-in, existing-account linking, duplicate-credential rejection and truthful error/cancel states.

The website requests only the `email` scope in the current Firebase Facebook flow.

## Apple

1. In Apple Developer, configure Sign in with Apple for the appropriate identifier(s).
2. Create the website Service ID and associate the NexusNova website as required by Apple.
3. Register this Return URL exactly:
   `https://nexusnova-6ade2.firebaseapp.com/__/auth/handler`
4. Create the Sign in with Apple private key and note the Apple Team ID + Key ID.
5. Firebase Console → Authentication → Sign-in method → Apple.
6. Enable Apple and enter the Service ID, Team ID, Key ID and private key in Firebase Console only.
7. Because NexusNova uses Firebase email verification/account email features, configure Apple's private email relay for Firebase-generated mail if anonymized Apple relay addresses will be used. The default Firebase sender domain is based on `nexusnova-6ade2.firebaseapp.com` unless a verified custom email domain replaces it.
8. Production verification must cover fresh sign-in, existing-account linking, private-relay email behavior where applicable, duplicate-credential rejection and truthful cancel/error states.

The website provider is `apple.com` and requests `email` + `name`.

## Instagram

Do **not** invent an `InstagramAuthProvider` or treat an Instagram profile link/click as authentication. Firebase Authentication does not expose a native Instagram provider in the current website implementation.

Instagram account verification/linking remains pending until NexusNova uses an officially supported Meta/Instagram authentication/API mechanism appropriate to the required account type and permissions.

## Required production verification before checking a provider as complete

For each provider that is enabled:

- Sign out first and test a genuine new-provider sign-in on `https://nexusnovatools.com/`.
- Verify the resulting Firebase user/provider data is real.
- Test `Connect <Provider>` from an existing NexusNova account and confirm the Firebase UID does not change.
- Attempt to attach the same external credential to a second NexusNova account and confirm it is rejected.
- Cancel the provider popup and confirm no connected state is written.
- Temporarily/non-destructively verify the disabled/misconfigured error path where practical; the UI must never fake success.
- Confirm no provider button directly increments NVX, balance, referral rewards or mission rewards.
- Confirm a valid pending referral is attached only through the authenticated Worker flow for a genuinely new account.

Only after the real production checks above should the corresponding item in `WEB-MASTER-CHECKLIST.md` be marked complete.

## Final Android app parity phase

The Android app will be updated only in the explicitly deferred final app phase. It must use the same Firebase project/account identity and official provider-supported Android/native flows where available. Google Android auth also requires the app's correct signing SHA fingerprint(s) to be registered with Firebase. Facebook/X/Apple/Instagram must follow each provider's supported Android/native flow and must preserve the same one-external-identity-to-one-NexusNova-account rule.
