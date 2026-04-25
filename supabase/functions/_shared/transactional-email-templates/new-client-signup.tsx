import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface NewClientSignupProps {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  nationality?: string
  nif?: string
  dateOfBirth?: string
  services?: string[]
  signedUpAt?: string
}

const NewClientSignupEmail = ({
  firstName, lastName, email, phone, nationality, nif, dateOfBirth, services, signedUpAt,
}: NewClientSignupProps) => {
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'New client'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>New client signed up: {fullName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>New client signed up</Heading>
          <Text style={intro}>
            A new client has just completed onboarding on the Setlix portal.
          </Text>
          <Hr style={hr} />
          <Section>
            <Row label="Name" value={fullName} />
            {email && <Row label="Email" value={email} />}
            {phone && <Row label="Phone" value={phone} />}
            {nationality && <Row label="Nationality" value={nationality} />}
            {nif && <Row label="NIF" value={nif} />}
            {dateOfBirth && <Row label="Date of birth" value={dateOfBirth} />}
            {signedUpAt && <Row label="Signed up at" value={signedUpAt} />}
          </Section>
          {services && services.length > 0 && (
            <>
              <Hr style={hr} />
              <Text style={label}>Services selected during onboarding</Text>
              <Section>
                {services.map((s, i) => (
                  <Text key={i} style={listItem}>• {s}</Text>
                ))}
              </Section>
            </>
          )}
        </Container>
      </Body>
    </Html>
  )
}

const Row = ({ label: l, value }: { label: string; value: string }) => (
  <Text style={rowText}>
    <span style={rowLabel}>{l}: </span>
    <span style={rowValue}>{value}</span>
  </Text>
)

export const template = {
  component: NewClientSignupEmail,
  subject: (data: Record<string, any>) => {
    const name = [data?.firstName, data?.lastName].filter(Boolean).join(' ')
    return `New client signed up${name ? `: ${name}` : ''}`
  },
  to: 'info@setlix.pt',
  displayName: 'New client signup notification (internal)',
  previewData: {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    phone: '+351 912 345 678',
    nationality: 'Portuguese',
    nif: '123456789',
    dateOfBirth: '1990-05-12',
    services: ['Digital Nomad Visa', 'NIF Application'],
    signedUpAt: '2026-04-25 14:32 UTC',
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
const label = { fontSize: '13px', color: '#737373', margin: '0 0 6px', fontWeight: 'bold' }
const listItem = { fontSize: '14px', color: '#404040', lineHeight: '1.6', margin: '0 0 4px' }
