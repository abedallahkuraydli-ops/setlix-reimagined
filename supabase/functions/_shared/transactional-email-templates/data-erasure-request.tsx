import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface DataErasureProps {
  clientName?: string
  clientEmail?: string
  clientUserId?: string
  reason?: string
  requestedAt?: string
  adminLink?: string
}

const DataErasureEmail = ({
  clientName, clientEmail, clientUserId, reason, requestedAt, adminLink,
}: DataErasureProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Data erasure request: ${clientEmail || clientName || ''}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>GDPR Data Erasure Request</Heading>
        <Text style={intro}>
          A client has requested erasure of their personal data under GDPR Article 17
          (the "right to be forgotten"). Portuguese Law no. 58/2019 also applies.
        </Text>
        <Hr style={hr} />
        <Section>
          <Row label="Client" value={clientName || '—'} />
          {clientEmail && <Row label="Email" value={clientEmail} />}
          {clientUserId && <Row label="User ID" value={clientUserId} />}
          {requestedAt && <Row label="Requested at" value={requestedAt} />}
          {reason && <Row label="Reason given" value={reason} />}
        </Section>

        <Hr style={hr} />
        <Heading as="h2" style={h2}>Compliance checklist — next steps</Heading>
        <Text style={rowText}>To process this request and remain compliant:</Text>
        <Section>
          <Step n={1} text="Verify the requester's identity (match the logged-in account to the request and confirm via email/phone)." />
          <Step n={2} text="Acknowledge the request to the client within 72 hours, in writing." />
          <Step n={3} text="Identify data that MUST be retained for legal/fiscal obligations (invoices, contracts, fiscal records — 10 years under Portuguese tax law). These cannot be erased; document the legal basis." />
          <Step n={4} text="Erase or anonymise all other personal data: profile fields, uploaded documents (client_upload), messages, appointments, surveys, audit logs older than legal minimums, marketing/consent records." />
          <Step n={5} text="Cancel any active services and notify partners/processors that hold copies (Stripe, Moloni, Google Calendar, etc.)." />
          <Step n={6} text="Delete the auth user account once retained data is anonymised (no longer linked to the natural person)." />
          <Step n={7} text="Send the client a final confirmation listing what was erased and what was retained (with legal basis). Close the request in the admin portal." />
          <Step n={8} text="Complete within 30 days of the request (GDPR Art. 12.3). Extendable by 2 months for complex cases — must inform the client." />
        </Section>
        {adminLink && (
          <>
            <Hr style={hr} />
            <Text style={rowText}>
              Open in admin portal: <a href={adminLink}>{adminLink}</a>
            </Text>
          </>
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

const Step = ({ n, text }: { n: number; text: string }) => (
  <Text style={rowText}>
    <span style={rowLabel}>{n}. </span>
    <span style={rowValue}>{text}</span>
  </Text>
)

export const template = {
  component: DataErasureEmail,
  subject: (data: Record<string, any>) =>
    `GDPR Data Erasure Request${data?.clientEmail ? `: ${data.clientEmail}` : ''}`,
  to: 'info@setlix.pt',
  displayName: 'GDPR data erasure request (internal)',
  previewData: {
    clientName: 'Jane Doe',
    clientEmail: 'jane@example.com',
    clientUserId: '11111111-2222-3333-4444-555555555555',
    reason: 'No longer using the service.',
    requestedAt: '2026-04-26 14:32 UTC',
    adminLink: 'https://setlix.pt/admin/clients',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '600px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0a0a0a', margin: '0 0 8px' }
const h2 = { fontSize: '16px', fontWeight: 'bold', color: '#0a0a0a', margin: '0 0 8px' }
const intro = { fontSize: '14px', color: '#737373', margin: '0 0 16px' }
const hr = { borderColor: '#e5e5e5', margin: '16px 0' }
const rowText = { fontSize: '14px', color: '#404040', lineHeight: '1.6', margin: '0 0 6px' }
const rowLabel = { fontWeight: 'bold', color: '#0a0a0a' }
const rowValue = { color: '#404040' }
