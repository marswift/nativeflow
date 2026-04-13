import { createHash } from 'node:crypto'

/**
 * Cryptographically hashes an IP address with a per-deployment salt.
 *
 * Produces a deterministic, non-reversible hex digest suitable for
 * abuse-pattern correlation without storing raw PII.
 *
 * Set IP_HASH_SALT in .env.local to a unique random value per environment.
 */
const SALT = process.env.IP_HASH_SALT ?? 'static-salt-change-me'

export function hashIp(ip: string): string {
  return createHash('sha256').update(SALT).update(ip.trim()).digest('hex')
}
