import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section, Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface ClientAccountUpdateProps {
  clientName?: string
  changeTitle?: string
  changeBody?: string
  changeType?: string
  portalUrl?: string
}

const PORTAL_URL = 'https://setlix.pt/portal/dashboard'

const ClientAccountUpdateEmail = ({
  clientName, changeTitle, changeBody, portalUrl,
}: ClientAccountUpdateProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{changeTitle || 'An update on your Setlix account'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {clientName ? `Hi ${clientName},` : 'Hi,'}
        </Heading>
        <Text style={intro}>
          There has been an update on your Setlix account.
        </Text>
        <Hr style={hr} />
        <Section style={card}>
          <Text style={cardTitle}>{changeTitle || 'Account update'}</Text>
          {changeBody && <Text style={cardBody}>{changeBody}</Text>}
        </Section>
        <Section style={{ textAlign: 'center', margin: '24px 0' }}>
          <Button href={portalUrl || PORTAL_URL} style={button}>
            Open your portal
          </Button>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          You are receiving this because there was activity on your Setlix client account.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ClientAccountUpdateEmail,
  subject: (data: Record<string, any>) =>
    data?.changeTitle ? `Setlix: ${data.changeTitle}` : 'Setlix: account update',
  displayName: 'Client account update',
  previewData: {
    clientName: 'Jane',
    changeTitle: 'A new payment has been recorded',
    changeBody: 'We received €250.00 on 25/04/2026. Your remaining balance is €750.00.',
    changeType: 'payment_recorded',
    portalUrl: PORTAL_URL,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '20px', fontWeight: 'bold', color: '#0a0a0a', margin: '0 0 8px' }
const intro = { fontSize: '14px', color: '#525252', margin: '0 0 16px' }
const hr = { borderColor: '#e5e5e5', margin: '16px 0' }
const card = { backgroundColor: '#f5f5f5', borderRadius: '8px', padding: '16px', margin: '12px 0' }
const cardTitle = { fontSize: '15px', fontWeight: 'bold', color: '#0a0a0a', margin: '0 0 6px' }
const cardBody = { fontSize: '14px', color: '#404040', lineHeight: '1.6', margin: '0' }
const button = { backgroundColor: '#0a0a0a', color: '#ffffff', padding: '10px 20px', borderRadius: '6px', fontSize: '14px', textDecoration: 'none', fontWeight: 'bold' }
const footer = { fontSize: '12px', color: '#737373', margin: '8px 0 0' }
