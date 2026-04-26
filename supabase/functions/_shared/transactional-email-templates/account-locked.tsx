import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface AccountLockedProps {
  email?: string
  failedAttempts?: number
  ipAddress?: string
  userAgent?: string
  lockedAt?: string
  adminUnlockUrl?: string
}

const AccountLockedEmail = ({
  email, failedAttempts, ipAddress, userAgent, lockedAt, adminUnlockUrl,
}: AccountLockedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Account locked: {email}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Client account locked</Heading>
        <Text style={intro}>
          A client account has been temporarily locked after {failedAttempts ?? 'multiple'} failed
          login attempts. The client cannot sign in until a superadmin unlocks the account from
          the admin portal.
        </Text>
        <Hr style={hr} />
        <Section>
          <Row label="Email" value={email || '—'} />
          {failedAttempts != null && <Row label="Failed attempts" value={String(failedAttempts)} />}
          {lockedAt && <Row label="Locked at" value={lockedAt} />}
          {ipAddress && <Row label="IP address" value={ipAddress} />}
          {userAgent && <Row label="User agent" value={userAgent} />}
        </Section>
        <Hr style={hr} />
        <Text style={rowText}>
          <strong>Next steps:</strong>
        </Text>
        <Text style={rowText}>
          1. Confirm the activity is legitimate (contact the client if needed).<br />
          2. Open the admin portal → Clients → manage lockouts.<br />
          3. Unlock the account. The client will be required to reset their password before signing in again.
        </Text>
        {adminUnlockUrl && (
          <Text style={rowText}>
            Direct link: <a href={adminUnlockUrl}>{adminUnlockUrl}</a>
          </Text>
        )}
      </Container>
    </Body>
  </Html>
)

const Row = ({ label: l, value }: { label: string; value: string }) => (
  <Text style={rowText}>
    <span style={rowLabel}>{l}: </span>
    <span style={rowValue}>{value}</span>
  </Text>
)

export const template = {
  component: AccountLockedEmail,
  subject: (data: Record<string, any>) =>
    `Account locked${data?.email ? `: ${data.email}` : ''} (failed login attempts)`,
  to: 'info@setlix.pt',
  displayName: 'Account locked notification (internal)',
  previewData: {
    email: 'jane@example.com',
    failedAttempts: 4,
    ipAddress: '203.0.113.42',
    userAgent: 'Mozilla/5.0',
    lockedAt: '2026-04-26 14:32 UTC',
    adminUnlockUrl: 'https://setlix.pt/admin/clients',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '20px', fontWeight: 'bold', color: '#0a0a0a', margin: '0 0 8px' }
const intro = { fontSize: '14px', color: '#737373', margin: '0 0 16px' }
const hr = { borderColor: '#e5e5e5', margin: '16px 0' }
const rowText = { fontSize: '14px', color: '#404040', lineHeight: '1.6', margin: '0 0 6px' }
const rowLabel = { fontWeight: 'bold', color: '#0a0a0a' }
const rowValue = { color: '#404040' }
