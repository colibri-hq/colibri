---
title: Authentication
description: Understanding Passkey authentication in Colibri
date: 2024-01-01
order: 6
tags: [authentication, passkeys, security, webauthn]
relevance: 85
---

# Authentication

Colibri uses passwordless authentication through Passkeys (WebAuthn) for a secure and convenient login experience.

## What are Passkeys?

Passkeys are a modern authentication method that replaces passwords with cryptographic key pairs. They are:

- **More secure**: Immune to phishing, credential stuffing, and password reuse attacks
- **More convenient**: Use biometrics (Face ID, Touch ID, Windows Hello) or device PIN
- **Privacy-preserving**: No secrets are sent over the network
- **Cross-device**: Can sync across your devices via iCloud Keychain or password managers

## Creating an Account

### First-Time Registration

1. Navigate to your Colibri instance
2. Click **Create Account**
3. Enter your email address
4. Click **Continue**
5. Your device will prompt you to create a Passkey:
   - **iOS/macOS**: Face ID or Touch ID
   - **Android**: Fingerprint or device PIN
   - **Windows**: Windows Hello (face, fingerprint, or PIN)
6. Complete the biometric/PIN verification
7. Your account is created and you're logged in

### What Happens Behind the Scenes

1. Your device generates a unique cryptographic key pair
2. The public key is stored in Colibri's database
3. The private key never leaves your device
4. Future logins use the private key to sign challenges

## Signing In

### Standard Login

1. Navigate to your Colibri instance
2. Enter your email address
3. Click **Continue**
4. Your device prompts for authentication
5. Complete the biometric/PIN verification
6. You're logged in

### First Login on a New Device

If you're using a device without a registered Passkey:

1. Enter your email address
2. Click **Use a different device**
3. Scan the QR code with a device that has your Passkey
4. Authenticate on the other device
5. You're logged in on the new device

## Managing Passkeys

### Viewing Your Passkeys

1. Click your avatar in the sidebar
2. Select **Profile**
3. Scroll to the **Passkeys** section

You'll see a list of all registered Passkeys with:

- Device name (e.g., "Chrome on MacBook Pro")
- Registration date
- Last used date

### Adding a New Passkey

To register a Passkey on a new device:

1. Navigate to **Profile > Passkeys**
2. Click **Add Passkey**
3. Enter a name for the device
4. Complete the authentication prompt
5. The new Passkey is registered

### Removing a Passkey

To revoke access from a lost or old device:

1. Navigate to **Profile > Passkeys**
2. Find the Passkey you want to remove
3. Click **Remove**
4. Confirm the deletion

> **Warning**: Make sure you have at least one other Passkey registered before removing one, or you may lose access to your account.

## Passkey Storage Options

Passkeys can be stored in several ways:

### Platform Authenticators

Built into your device:

- **iCloud Keychain** (iOS/macOS): Syncs across your Apple devices
- **Google Password Manager** (Android/Chrome): Syncs across Google devices
- **Windows Hello**: Stored locally on Windows devices

### Password Managers

Third-party password managers that support Passkeys:

- **1Password**
- **Bitwarden**
- **Dashlane**

### Security Keys

Hardware security keys:

- **YubiKey 5 Series**
- **Titan Security Key**
- **Any FIDO2-compatible key**

## Security Best Practices

### Recommended Setup

1. **Register multiple Passkeys**: Have at least 2 Passkeys registered
2. **Use different device types**: Register on both your phone and computer
3. **Consider a security key**: Hardware keys are immune to malware

### Recovery Options

If you lose access to all your Passkeys:

1. **Admin recovery**: Contact your instance administrator
2. **Email verification**: Some instances support email-based recovery (if enabled)

> **Note**: Colibri prioritizes security, so recovery options may be limited. Always maintain multiple Passkeys.

## Browser Support

Passkeys work in modern browsers:

| Browser | Version | Notes                                   |
| ------- | ------- | --------------------------------------- |
| Chrome  | 90+     | Full support                            |
| Edge    | 90+     | Full support                            |
| Safari  | 15+     | Full support, best with iCloud Keychain |
| Firefox | 90+     | Full support                            |

## Troubleshooting

### "This device doesn't support Passkeys"

**Solutions**:

- Update your browser to the latest version
- Update your operating system
- Use a supported browser (Chrome, Safari, Edge, Firefox)
- Use a FIDO2 security key as a fallback

### "Passkey authentication failed"

**Common causes**:

- Wrong biometric/PIN entered
- Passkey was deleted from your device
- Browser privacy settings blocking WebAuthn

**Solutions**:

- Try again with correct biometric/PIN
- Click "Use a different device" and use another Passkey
- Check browser privacy settings

### "No Passkeys found for this account"

This means no Passkeys are registered for your email address.

**Solutions**:

- Verify you're using the correct email address
- If this is a new account, complete registration first
- Contact your instance administrator for help

### Can't remove my last Passkey

Colibri prevents you from removing your last Passkey to avoid account lockout.

**Solution**:

- Add a second Passkey first
- Then remove the one you don't want

## Technical Details

### WebAuthn Standard

Colibri implements the W3C WebAuthn standard for authentication:

- **Attestation**: Device verification during registration
- **Assertion**: Challenge-response during login
- **CTAP2**: Communication with authenticators

### Privacy

- Passkeys are unique per site (cross-site tracking is impossible)
- No biometric data is sent to the server
- Only public keys are stored in the database

### Security

- **HTTPS required**: WebAuthn only works on secure connections
- **Origin binding**: Passkeys are tied to your instance's domain
- **Replay protection**: Challenges are single-use and time-limited
