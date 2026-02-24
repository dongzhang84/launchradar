import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

export interface DigestEmailProps {
  opportunities: Array<{
    id: string
    title: string
    subreddit: string | null
    platform: 'reddit' | 'hackernews'
    url: string
    intentLevel: 'high' | 'medium' | 'low'
    reasoning: string
    postedAt: Date
    commentCount: number
    firstReplyText: string
  }>
  stats: {
    opportunitiesFound: number
    repliesMade: number
    conversions: number
  }
  baseUrl: string
}

const intentDisplay: Record<string, { emoji: string; label: string }> = {
  high:   { emoji: '🔥🔥🔥', label: 'HIGH INTENT' },
  medium: { emoji: '🔥🔥',   label: 'MEDIUM INTENT' },
  low:    { emoji: '🔥',     label: 'LOW INTENT' },
}

function hoursAgo(date: Date): number {
  return Math.round((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60))
}

export default function DigestEmail({ opportunities, stats, baseUrl }: DigestEmailProps) {
  const previewText =
    opportunities.length > 0
      ? `${opportunities.length} new opportunities found — top: ${opportunities[0].title}`
      : 'Your daily LaunchRadar digest'

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>

          {/* Header */}
          <Section style={styles.header}>
            <Heading style={styles.logo}>LaunchRadar</Heading>
            <Text style={styles.headerSubtitle}>Your daily opportunity digest</Text>
          </Section>

          <Hr style={styles.headerDivider} />

          {/* Opportunities */}
          {opportunities.length === 0 ? (
            <Section style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No new opportunities found today. Check back tomorrow.
              </Text>
            </Section>
          ) : (
            opportunities.map((opp, index) => {
              const intent = intentDisplay[opp.intentLevel]
              const source = opp.platform === 'reddit'
                ? `r/${opp.subreddit}`
                : 'Hacker News'
              const repliedUrl = `${baseUrl}/api/track/replied?id=${opp.id}`
              const truncatedReply = opp.firstReplyText.length > 200
                ? opp.firstReplyText.slice(0, 200) + '…'
                : opp.firstReplyText

              return (
                <Section key={opp.id} style={styles.opportunitySection}>
                  {/* Intent badge */}
                  <Text style={styles.intentLine}>
                    {intent.emoji} {intent.label}
                  </Text>

                  {/* Title */}
                  <Link href={opp.url} style={styles.titleLink}>
                    {opp.title}
                  </Link>

                  {/* Source line */}
                  <Text style={styles.sourceLine}>
                    {source}&nbsp;&nbsp;·&nbsp;&nbsp;{hoursAgo(opp.postedAt)}h ago&nbsp;&nbsp;·&nbsp;&nbsp;{opp.commentCount} comments
                  </Text>

                  {/* Reasoning */}
                  <Text style={styles.reasoning}>
                    <span style={styles.reasoningLabel}>Why relevant: </span>
                    {opp.reasoning}
                  </Text>

                  {/* Suggested reply preview */}
                  {truncatedReply && (
                    <Section style={styles.replyBox}>
                      <Text style={styles.replyText}>{truncatedReply}</Text>
                    </Section>
                  )}

                  {/* Action links */}
                  <Text style={styles.actions}>
                    <Link href={opp.url} style={styles.actionLinkPrimary}>
                      View Thread →
                    </Link>
                    &nbsp;&nbsp;&nbsp;&nbsp;
                    <Link href={repliedUrl} style={styles.actionLinkSecondary}>
                      Mark as Replied ✓
                    </Link>
                  </Text>

                  {index < opportunities.length - 1 && <Hr style={styles.divider} />}
                </Section>
              )
            })
          )}

          <Hr style={styles.footerDivider} />

          {/* Footer */}
          <Section style={styles.footer}>
            <Text style={styles.statsLine}>
              {stats.opportunitiesFound} found&nbsp;&nbsp;·&nbsp;&nbsp;
              {stats.repliesMade} replied&nbsp;&nbsp;·&nbsp;&nbsp;
              {stats.conversions} conversions
            </Text>
            <Text style={styles.footerLinks}>
              <Link href={`${baseUrl}/settings`} style={styles.footerLink}>
                Manage email preferences
              </Link>
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  body: {
    backgroundColor: '#f9fafb',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    margin: '0',
    padding: '0',
  },
  container: {
    backgroundColor: '#ffffff',
    margin: '32px auto',
    maxWidth: '600px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    padding: '0',
    overflow: 'hidden' as const,
  },
  header: {
    padding: '28px 32px 20px',
  },
  logo: {
    color: '#111827',
    fontSize: '22px',
    fontWeight: '700',
    margin: '0 0 4px',
    letterSpacing: '-0.5px',
  },
  headerSubtitle: {
    color: '#6b7280',
    fontSize: '13px',
    margin: '0',
  },
  headerDivider: {
    borderColor: '#e5e7eb',
    margin: '0',
  },
  emptyState: {
    padding: '40px 32px',
    textAlign: 'center' as const,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: '14px',
    margin: '0',
  },
  opportunitySection: {
    padding: '24px 32px',
  },
  intentLine: {
    color: '#374151',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.08em',
    margin: '0 0 8px',
    textTransform: 'uppercase' as const,
  },
  titleLink: {
    color: '#111827',
    fontSize: '16px',
    fontWeight: '600',
    lineHeight: '1.4',
    textDecoration: 'none',
    display: 'block',
    marginBottom: '6px',
  },
  sourceLine: {
    color: '#9ca3af',
    fontSize: '12px',
    margin: '0 0 10px',
  },
  reasoning: {
    color: '#6b7280',
    fontSize: '13px',
    fontStyle: 'italic',
    margin: '0 0 14px',
    lineHeight: '1.5',
  },
  reasoningLabel: {
    fontStyle: 'normal',
    fontWeight: '600',
    color: '#374151',
  },
  replyBox: {
    backgroundColor: '#f3f4f6',
    borderRadius: '6px',
    padding: '12px 16px',
    marginBottom: '14px',
  },
  replyText: {
    color: '#374151',
    fontSize: '13px',
    lineHeight: '1.6',
    margin: '0',
  },
  actions: {
    margin: '0',
    fontSize: '13px',
  },
  actionLinkPrimary: {
    color: '#111827',
    fontWeight: '600',
    textDecoration: 'none',
  },
  actionLinkSecondary: {
    color: '#6b7280',
    textDecoration: 'none',
  },
  divider: {
    borderColor: '#f3f4f6',
    margin: '24px 0 0',
  },
  footerDivider: {
    borderColor: '#e5e7eb',
    margin: '0',
  },
  footer: {
    padding: '20px 32px',
    textAlign: 'center' as const,
  },
  statsLine: {
    color: '#9ca3af',
    fontSize: '12px',
    margin: '0 0 8px',
  },
  footerLinks: {
    margin: '0',
    fontSize: '12px',
  },
  footerLink: {
    color: '#6b7280',
    textDecoration: 'underline',
  },
} as const
