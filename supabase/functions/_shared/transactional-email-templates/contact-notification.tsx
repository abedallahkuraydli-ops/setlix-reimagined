import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface ContactNotificationProps {
  name?: string
  email?: string
  phone?: string
  country?: string
  category?: string
  subject?: string
  message?: string
}

const ContactNotificationEmail = ({
  name, email, phone, country, category, subject, message,
}: ContactNotificationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New contact form submission from {name || 'website visitor'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New contact form submission</Heading>
        <Text style={intro}>You received a new inquiry from the Setlix website.</Text>
        <Hr style={hr} />
        <Section>
          {name && <Row label="Name" value={name} />}
          {email && <Row label="Email" value={email} />}
          {phone && <Row label="Phone" value={phone} />}
          {country && <Row label="Country" value={country} />}
          {category && <Row label="Category" value={category} />}
          {subject && <Row label="Subject" value={subject} />}
        </Section>
        {message && (
          <>
            <Hr style={hr} />
            <Text style={label}>Message</Text>
            <Text style={messageStyle}>{message}</Text>
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

export const template = {
  component: ContactNotificationEmail,
  subject: (data: Record<string, any>) =>
    `New contact form submission${data?.name ? ` from ${data.name}` : ''}`,
  to: 'info@setlix.pt',
  displayName: 'Contact form notification (internal)',
  previewData: {
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '+1 555 1234',
    country: 'United States',
    category: 'Digital Nomad',
    subject: 'Visa inquiry',
    message: 'I would like to learn more about the Digital Nomad visa.',
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
const messageStyle = { fontSize: '14px', color: '#404040', lineHeight: '1.6', margin: '0', padding: '12px 16px', backgroundColor: '#f5f5f5', borderRadius: '6px', whiteSpace: 'pre-wrap' as const }
