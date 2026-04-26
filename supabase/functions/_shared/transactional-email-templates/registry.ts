/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as contactConfirmation } from './contact-confirmation.tsx'
import { template as contactNotification } from './contact-notification.tsx'
import { template as appointmentConfirmation } from './appointment-confirmation.tsx'
import { template as newClientSignup } from './new-client-signup.tsx'
import { template as serviceRequestNotification } from './service-request-notification.tsx'
import { template as clientAccountUpdate } from './client-account-update.tsx'
import { template as accountLocked } from './account-locked.tsx'
import { template as dataErasureRequest } from './data-erasure-request.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'contact-confirmation': contactConfirmation,
  'contact-notification': contactNotification,
  'appointment-confirmation': appointmentConfirmation,
  'new-client-signup': newClientSignup,
  'service-request-notification': serviceRequestNotification,
  'client-account-update': clientAccountUpdate,
  'account-locked': accountLocked,
  'data-erasure-request': dataErasureRequest,
}
