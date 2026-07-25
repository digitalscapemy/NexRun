import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface SettlementCompletedEmailProps {
  organizationName: string;
  eventTitle: string;
  netPayoutSen: number;
  referenceNumber: string;
  settlementDate: string;
  settlementsUrl: string;
}

export const SettlementCompletedEmail = ({
  organizationName = "RunMY",
  eventTitle = "KL Marathon 2026",
  netPayoutSen = 6020000,
  referenceNumber = "STL-20260315-ABC123",
  settlementDate = "15 March 2026",
  settlementsUrl = "https://nexrun.my/dashboard/settlements",
}: SettlementCompletedEmailProps) => {
  const netPayout = (netPayoutSen / 100).toFixed(2);

  return (
    <Html>
      <Head />
      <Preview>Your settlement has been processed — {eventTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Settlement Completed</Heading>
          <Text style={text}>Hi {organizationName},</Text>
          <Text style={text}>
            Your settlement for <strong>{eventTitle}</strong> has been processed successfully.
          </Text>

          <Section style={amountBox}>
            <Text style={amountLabel}>Net Payout</Text>
            <Text style={amountValue}>RM {netPayout}</Text>
            <Text style={amountNote}>After platform commission</Text>
          </Section>

          <Section style={detailsBox}>
            <Text style={detailLabel}>Settlement Details</Text>
            <Text style={detailRow}>
              <strong>Reference Number:</strong> {referenceNumber}
            </Text>
            <Text style={detailRow}>
              <strong>Event:</strong> {eventTitle}
            </Text>
            <Text style={detailRow}>
              <strong>Processed Date:</strong> {settlementDate}
            </Text>
          </Section>

          <Section style={noteBox}>
            <Text style={noteText}>
              Note: Since NexRun is currently in beta with simulated payments, no actual bank transfer
              will occur. This is a preview of how settlement notifications will work when real payments
              are enabled.
            </Text>
          </Section>

          <Section style={buttonContainer}>
            <Button style={button} href={settlementsUrl}>
              View Settlement Details
            </Button>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>
            NexRun &middot; Malaysia&apos;s Running Event Platform
            <br />
            <Link href="https://nexrun.my/privacy" style={link}>
              Privacy Policy
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default SettlementCompletedEmail;

const main = {
  backgroundColor: "#f6f6f6",
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  maxWidth: "600px",
  borderRadius: "8px",
};

const h1 = {
  color: "#F97316",
  fontSize: "28px",
  fontWeight: "700",
  margin: "0 0 20px",
  textAlign: "center" as const,
};

const text = {
  color: "#374151",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "16px 0",
};

const amountBox = {
  backgroundColor: "#ECFDF5",
  borderRadius: "8px",
  padding: "32px 24px",
  margin: "24px 0",
  textAlign: "center" as const,
  borderLeft: "4px solid #10B981",
};

const amountLabel = {
  color: "#065F46",
  fontSize: "12px",
  fontWeight: "700",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 12px",
};

const amountValue = {
  color: "#047857",
  fontSize: "40px",
  fontWeight: "700",
  margin: "0",
};

const amountNote = {
  color: "#059669",
  fontSize: "13px",
  margin: "8px 0 0",
};

const detailsBox = {
  backgroundColor: "#F3F4F6",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
};

const detailLabel = {
  color: "#374151",
  fontSize: "12px",
  fontWeight: "700",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 12px",
};

const detailRow = {
  color: "#4B5563",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "8px 0",
};

const noteBox = {
  backgroundColor: "#FEF3C7",
  borderRadius: "8px",
  padding: "16px",
  margin: "24px 0",
};

const noteText = {
  color: "#78350F",
  fontSize: "13px",
  lineHeight: "18px",
  margin: "0",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#F97316",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "700",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "14px 28px",
};

const hr = {
  borderColor: "#E5E7EB",
  margin: "32px 0",
};

const footer = {
  color: "#9CA3AF",
  fontSize: "12px",
  lineHeight: "18px",
  textAlign: "center" as const,
};

const link = {
  color: "#F97316",
  textDecoration: "underline",
};
