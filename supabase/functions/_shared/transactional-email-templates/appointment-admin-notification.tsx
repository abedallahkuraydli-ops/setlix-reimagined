import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Setlix'

interface AppointmentAdminNotificationProps {
  adminFirstName?: string
  clientName?: string
  clientEmail?: string
  slotStartFormatted?: string
  slotEndFormatted?: string
  timezone?: string
  notes?: string
}

const AppointmentAdminNotificationEmail = ({
  adminFirstName,
  clientName,
  clientEmail,
  slotStartFormatted,
  slotEndFormatted,
  timezone,
  notes,
}: AppointmentAdminNotificationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New meeting requested by {clientName || 'a client'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {adminFirstName ? `Hi ${adminFirstName}, a new meeting has been requested` : 'A new meeting has been requested'}
        </Heading>
        <Text style={text}>
          {clientName || 'A client'} just booked a meeting with you through the {SITE_NAME} client portal.
          Please make sure to send them a meeting link soon.
        </Text>

        <Section style={card}>
          <Text style={label}>Client</Text>
          <Text style={value}>
            {clientName || '—'}
            {clientEmail ? ` (${clientEmail})` : ''}
          </Text>

          {slotStartFormatted && (
            <>
              <Text style={label}>When</Text>
              <Text style={value}>
                {slotStartFormatted}
                {slotEndFormatted ? ` — ${slotEndFormatted}` : ''}
                {timezone ? ` (${timezone})` : ''}
              </Text>
            </>
          )}

          {notes && (
            <>
              <Text style={label}>Client notes</Text>
              <Text style={value}>{notes}</Text>
            </>
          )}
        </Section>

        <Text style={text}>
          Reminder: the client was told that {SITE_NAME} will share the meeting link closer to the
          meeting date. Please send it through the portal or by email before the appointment.
        </Text>

        <Hr style={hr} />
        <Text style={footer}>
          {SITE_NAME} internal notification.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AppointmentAdminNotificationEmail,
  subject: (data: Record<string, any>) =>
    `New meeting requested${data?.clientName ? ` by ${data.clientName}` : ''}`,
  displayName: 'Appointment — admin notification',
  previewData: {
    adminFirstName: 'Alex',
    clientName: 'Jane Doe',
    clientEmail: 'jane@example.com',
    slotStartFormatted: 'Monday, 5 May 2026, 10:00',
    slotEndFormatted: '10:30',
    timezone: 'Europe/Lisbon',
    notes: 'Initial consultation about Golden Visa.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0a0a0a', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#404040', lineHeight: '1.6', margin: '0 0 16px' }
const card = { backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px 20px', margin: '20px 0' }
const label = { fontSize: '12px', color: '#737373', margin: '8px 0 2px', fontWeight: 'bold', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
const value = { fontSize: '15px', color: '#0a0a0a', margin: '0 0 8px', lineHeight: '1.5' }
const hr = { borderColor: '#e5e5e5', margin: '24px 0' }
const footer = { fontSize: '13px', color: '#737373', margin: '20px 0 0', lineHeight: '1.6' }
