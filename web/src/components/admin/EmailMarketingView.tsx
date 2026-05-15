import { EmailMarketingPanel } from '../EmailMarketingPanel'

interface EmailMarketingViewProps {
  adminEmail: string
}

export function EmailMarketingView({ adminEmail }: EmailMarketingViewProps) {
  return <EmailMarketingPanel adminEmail={adminEmail} />
}
