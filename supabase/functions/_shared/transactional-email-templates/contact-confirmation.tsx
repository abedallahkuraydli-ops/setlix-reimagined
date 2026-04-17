import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Setlix'

interface ContactConfirmationProps {
  name?: string
  message?: string
}

const ContactConfirmationEmail = ({ name, message }: ContactConfirmationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Thanks for contacting {SITE_NAME} — we'll be in touch shortly.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {name ? `Thank you, ${name}!` : 'Thank you for reaching out!'}
        </Heading>
        <Text style={text}>
          We've received your message and a member of the {SITE_NAME} team will get back to you within 24 hours.
        </Text>
        {message && (
          <>
            <Hr style={hr} />
            <Text style={label}>Your message:</Text>
            <Text style={quote}>{message}</Text>
          </>
        )}
        <Hr style={hr} />
        <Text style={footer}>Best regards,<br />The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContactConfirmationEmail,
  subject: `Thanks for contacting ${SITE_NAME}`,
  displayName: 'Contact form confirmation',
  previewData: { name: 'Jane', message: 'I am interested in the Digital Nomad visa.' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0a0a0a', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#404040', lineHeight: '1.6', margin: '0 0 16px' }
const label = { fontSize: '13px', color: '#737373', margin: '0 0 6px', fontWeight: 'bold' }
const quote = { fontSize: '14px', color: '#404040', lineHeight: '1.6', margin: '0 0 16px', padding: '12px 16px', backgroundColor: '#f5f5f5', borderRadius: '6px' }
const hr = { borderColor: '#e5e5e5', margin: '20px 0' }
const footer = { fontSize: '13px', color: '#737373', margin: '20px 0 0' }
