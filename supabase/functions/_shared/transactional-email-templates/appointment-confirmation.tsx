import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Setlix'

interface AppointmentConfirmationProps {
  name?: string
  slotStartFormatted?: string
  slotEndFormatted?: string
  timezone?: string
  meetLink?: string
  adminName?: string
  notes?: string
}

const AppointmentConfirmationEmail = ({
  name,
  slotStartFormatted,
  slotEndFormatted,
  timezone,
  meetLink,
  adminName,
  notes,
}: AppointmentConfirmationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {SITE_NAME} appointment is confirmed</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {name ? `Hi ${name}, your appointment is confirmed` : 'Your appointment is confirmed'}
        </Heading>
        <Text style={text}>
          Thank you for booking with {SITE_NAME}. Here are your appointment details:
        </Text>

        <Section style={card}>
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
          {adminName && (
            <>
              <Text style={label}>With</Text>
              <Text style={value}>{adminName}</Text>
            </>
          )}
          {notes && (
            <>
              <Text style={label}>Notes</Text>
              <Text style={value}>{notes}</Text>
            </>
          )}
        </Section>

        {meetLink ? (
          <>
            <Text style={text}>
              Join the meeting using the Google Meet link below at the scheduled time:
            </Text>
            <Section style={{ textAlign: 'center', margin: '24px 0' }}>
              <Button href={meetLink} style={button}>Join Google Meet</Button>
            </Section>
            <Text style={smallText}>
              Or copy this link: <Link href={meetLink} style={link}>{meetLink}</Link>
            </Text>
          </>
        ) : (
          <Text style={text}>
            We'll share the meeting link with you shortly before your appointment.
          </Text>
        )}

        <Hr style={hr} />
        <Text style={footer}>
          Need to reschedule or cancel? Sign in to your client portal to manage your appointment.
          <br /><br />
          Best regards,<br />The {SITE_NAME} Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AppointmentConfirmationEmail,
  subject: `Your ${SITE_NAME} appointment is confirmed`,
  displayName: 'Appointment confirmation',
  previewData: {
    name: 'Jane',
    slotStartFormatted: 'Monday, 5 May 2026, 10:00',
    slotEndFormatted: '10:30',
    timezone: 'Europe/Lisbon',
    meetLink: 'https://meet.google.com/abc-defg-hij',
    adminName: 'Setlix Team',
    notes: 'Initial consultation about Golden Visa.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0a0a0a', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#404040', lineHeight: '1.6', margin: '0 0 16px' }
const smallText = { fontSize: '13px', color: '#737373', lineHeight: '1.5', margin: '0 0 16px', wordBreak: 'break-all' as const }
const card = { backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px 20px', margin: '20px 0' }
const label = { fontSize: '12px', color: '#737373', margin: '8px 0 2px', fontWeight: 'bold', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
const value = { fontSize: '15px', color: '#0a0a0a', margin: '0 0 8px', lineHeight: '1.5' }
const button = { backgroundColor: '#0a0a0a', color: '#ffffff', padding: '12px 24px', borderRadius: '6px', textDecoration: 'none', fontSize: '15px', fontWeight: 'bold', display: 'inline-block' }
const link = { color: '#0a0a0a', textDecoration: 'underline' }
const hr = { borderColor: '#e5e5e5', margin: '24px 0' }
const footer = { fontSize: '13px', color: '#737373', margin: '20px 0 0', lineHeight: '1.6' }
