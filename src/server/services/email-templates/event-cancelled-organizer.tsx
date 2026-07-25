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

interface EventCancelledOrganizerEmailProps {
  organizationName: string;
  eventTitle: string;
  cancellationReason?: string;
  participantCount: number;
  manageUrl: string;
}

export const EventCancelledOrganizerEmail = ({
  organizationName = "RunMY",
  eventTitle = "KL Marathon 2026",
  cancellationReason,
  participantCount = 0,
  manageUrl = "https://nexrun.my/dashboard/events",
}: EventCancelledOrganizerEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>{eventTitle} has been cancelled</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Event Cancelled</Heading>
          <Text style={text}>Hi {organizationName},</Text>
          <Text style={text}>
            Your event <strong>{eventTitle}</strong> has been cancelled.
          </Text>

          {cancellationReason && (
            <Section style={reasonBox}>
              <Text style={reasonLabel}>Cancellation Reason</Text>
              <Text style={reasonText}>{cancellationReason}</Text>
            </Section>
          )}

          {participantCount > 0 && (
            <Section style={infoBox}>
              <Text style={infoLabel}>Participant Notification</Text>
              <Text style={infoText}>
                All {participantCount} registered participant{participantCount === 1 ? "" : "s"} have been
                notified about the cancellation via email and in-app notification.
              </Text>
            </Section>
          )}

          <Section style={buttonContainer}>
            <Button style={button} href={manageUrl}>
              Manage Events
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

export default EventCancelledOrganizerEmail;

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

const infoBox = {
  backgroundColor: "#F3F4F6",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
};

const infoLabel = {
  color: "#374151",
  fontSize: "12px",
  fontWeight: "700",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 8px",
};

const infoText = {
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
