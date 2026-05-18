import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Setlix'

interface UnreadMessageReminderProps {
  name?: string
  subject?: string
  preview?: string
  portalUrl?: string
  unreadCount?: number
}

const UnreadMessageReminderEmail = ({
  name,
  subject,
  preview,
  portalUrl,
  unreadCount,
}: UnreadMessageReminderProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You have an unread message from {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {name ? `Hi ${name}, you have an unread message` : 'You have an unread message'}
        </Heading>
        <Text style={text}>
          {unreadCount && unreadCount > 1
            ? `You have ${unreadCount} unread messages from the ${SITE_NAME} team in your client portal that haven't been opened in the last 2 days.`
            : `The ${SITE_NAME} team sent you a message in your client portal more than 2 days ago, and it's still unread.`}
        </Text>

        {(subject || preview) && (
          <Section style={card}>
            {subject && (
              <>
                <Text style={label}>Subject</Text>
                <Text style={value}>{subject}</Text>
              </>
            )}
            {preview && (
              <>
                <Text style={label}>Message preview</Text>
                <Text style={value}>{preview}</Text>
              </>
            )}
          </Section>
        )}

        <Section style={{ textAlign: 'center', margin: '24px 0' }}>
          <Button href={portalUrl || 'https://www.setlix.pt/portal/messages'} style={button}>
            Open your messages
          </Button>
        </Section>

        <Hr style={hr} />
        <Text style={footer}>
          Sign in to your client portal to reply.
          <br /><br />
          Best regards,<br />The {SITE_NAME} Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: UnreadMessageReminderEmail,
  subject: (data: Record<string, any>) =>
    data?.subject
      ? `Unread message: ${data.subject}`
      : `You have an unread message from ${SITE_NAME}`,
  displayName: 'Unread message reminder',
  previewData: {
    name: 'Jane',
    subject: 'Your Golden Visa application',
    preview: 'Hi Jane, we wanted to follow up regarding the documents…',
    portalUrl: 'https://www.setlix.pt/portal/messages',
    unreadCount: 1,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0a0a0a', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#404040', lineHeight: '1.6', margin: '0 0 16px' }
const card = { backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px 20px', margin: '20px 0' }
const label = { fontSize: '12px', color: '#737373', margin: '8px 0 2px', fontWeight: 'bold', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
const value = { fontSize: '15px', color: '#0a0a0a', margin: '0 0 8px', lineHeight: '1.5' }
const button = { backgroundColor: '#0a0a0a', color: '#ffffff', padding: '12px 24px', borderRadius: '6px', textDecoration: 'none', fontSize: '15px', fontWeight: 'bold', display: 'inline-block' }
const hr = { borderColor: '#e5e5e5', margin: '24px 0' }
const footer = { fontSize: '13px', color: '#737373', margin: '20px 0 0', lineHeight: '1.6' }
