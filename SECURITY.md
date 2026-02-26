# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| latest | Yes |
| < latest | No |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it via [GitHub Security Advisories](https://github.com/azeitler/s3pull/security/advisories/new).

**Please do not open a public issue for security vulnerabilities.**

### What to expect

- Acknowledgment within 48 hours
- Assessment and fix timeline within 7 days
- Security advisory published with the fix

## Security Notes

- S3 credentials are held in memory only during execution. They are never logged, cached to disk, or transmitted outside the configured S3 endpoint.
- The local cache (`~/.cache/s3pull/`) stores downloaded file content and ETag metadata. It does not contain credentials.
- The config file (`~/.config/s3pull/config.json`) may contain credentials. Protect it with appropriate file permissions (`chmod 600`).
