import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface ServiceRequestNotificationProps {
  clientName?: string
  clientEmail?: string
  serviceName?: string
  serviceCategory?: string
  requestedAt?: string
}

const ServiceRequestNotificationEmail = ({
  clientName, clientEmail, serviceName, serviceCategory, requestedAt,
}: ServiceRequestNotificationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New service request: {serviceName || 'service'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New service request</Heading>
        <Text style={intro}>
          A client has just submitted a new service request on the Setlix portal.
        </Text>
        <Hr style={hr} />
        <Section>
          {clientName && <Row label="Client" value={clientName} />}
          {clientEmail && <Row label="Email" value={clientEmail} />}
          {serviceName && <Row label="Service" value={serviceName} />}
          {serviceCategory && <Row label="Category" value={serviceCategory} />}
          {requestedAt && <Row label="Requested at" value={requestedAt} />}
        </Section>
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
  component: ServiceRequestNotificationEmail,
  subject: (data: Record<string, any>) =>
    `New service request${data?.serviceName ? `: ${data.serviceName}` : ''}`,
  displayName: 'Service request notification (internal)',
  previewData: {
    clientName: 'Jane Doe',
    clientEmail: 'jane@example.com',
    serviceName: 'Digital Nomad Visa',
    serviceCategory: 'Visa',
    requestedAt: '2026-04-25 14:32 UTC',
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
