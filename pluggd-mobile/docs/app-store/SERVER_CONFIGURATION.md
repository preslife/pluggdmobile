# App Store Server Configuration

The IAP functions use Apple’s official `@apple/app-store-server-library` verifier. They fail closed: an entitlement is never granted if signed-data verification, bundle matching, App Apple ID matching, product allowlisting, transaction matching or app-account-token matching fails.

Store these as Supabase function secrets:

```text
APPLE_BUNDLE_ID=com.pluggd.mobile
APPLE_APP_ID=<numeric App Store Connect ID>
APPLE_IAP_ENVIRONMENT=Both
APPLE_ROOT_CA_G2_BASE64=<base64 DER or PEM certificate bytes>
APPLE_ROOT_CA_G3_BASE64=<base64 DER or PEM certificate bytes>
ACCOUNT_DELETION_AUDIT_SALT=<strong random production secret>
```

Download current Apple Root CA certificates only from Apple PKI. Keep certificate rotation in the release calendar. Production and sandbox signed data are each verified with the environment-specific verifier; accepting `Both` supports TestFlight without weakening signature or app identity checks.
