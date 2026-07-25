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

interface EventCancelledParticipantEmailProps {
  participantName: string;
  eventTitle: string;
  cancellationReason?: string;
  exploreUrl: string;
}

export const EventCancelledParticipantEmail = ({
  participantName = "Runner",
  eventTitle = "KL Marathon 2026",
  cancellationReason,
  exploreUrl = "https://nexrun.my/events",
}: EventCancelledParticipantEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Important: {eventTitle} has been cancelled</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Event Cancelled</Heading>
          <Text style={text}>Hi {participantName},</Text>
          <Text style={text}>
            We regret to inform you that <strong>{eventTitle}</strong> has been cancelled.
          </Text>

          {cancellationReason && (
            <Section style={reasonBox}>
              <Text style={reasonLabel}>Reason</Text>
              <Text style={reasonText}>{cancellationReason}</Text>
            </Section>
          )}

          <Section style={noteBox}>
            <Text style={noteText}>
              Since NexRun is currently in beta with simulated payments, no refund processing is required.
              We apologize for any inconvenience this may have caused.
            </Text>
          </Section>

          <Text style={text}>
            We understand this is disappointing. Check out other exciting running events happening in
            Malaysia.
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={exploreUrl}>
              Explore Other Events
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

export default EventCancelledParticipantEmail;

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
  color: "#DC2626",
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

const reasonBox = {
  backgroundColor: "#FEF2F2",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
  borderLeft: "4px solid #DC2626",
};

const reasonLabel = {
  color: "#991B1B",
  fontSize: "12px",
  fontWeight: "700",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 8px",
};

const reasonText = {
  color: "#7F1D1D",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "0",
};

const noteBox = {
  backgroundColor: "#F3F4F6",
  borderRadius: "8px",
  padding: "16px",
  margin: "24px 0",
};

const noteText = {
  color: "#4B5563",
  fontSize: "14px",
  lineHeight: "20px",
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
