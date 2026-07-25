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

interface EventPublishedEmailProps {
  organizationName: string;
  eventTitle: string;
  publishedDate: string;
  eventUrl: string;
  manageUrl: string;
}

export const EventPublishedEmail = ({
  organizationName = "RunMY",
  eventTitle = "KL Marathon 2026",
  publishedDate = "20 January 2026",
  eventUrl = "https://nexrun.my/events/kl-marathon-2026",
  manageUrl = "https://nexrun.my/dashboard/events",
}: EventPublishedEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Your event {eventTitle} is now live</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Event Published</Heading>
          <Text style={text}>Hi {organizationName},</Text>
          <Text style={text}>
            Great news! Your event <strong>{eventTitle}</strong> is now live on NexRun. Participants can
            start registering immediately.
          </Text>

          <Section style={infoBox}>
            <Text style={infoLabel}>Event Details</Text>
            <Text style={infoText}>
              <strong>{eventTitle}</strong>
            </Text>
            <Text style={infoText}>📅 Published on {publishedDate}</Text>
          </Section>

          <Section style={buttonContainer}>
            <Button style={button} href={eventUrl}>
              View Event
            </Button>
          </Section>

          <Section style={linkContainer}>
            <Link href={manageUrl} style={link}>
              Manage Event →
            </Link>
          </Section>

          <Text style={text}>
            Your event is now visible to all runners in Malaysia. Share the event link with your community
            to drive registrations.
          </Text>

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

export default EventPublishedEmail;

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

const infoBox = {
  backgroundColor: "#ECFDF5",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
};

const infoLabel = {
  color: "#065F46",
  fontSize: "12px",
  fontWeight: "700",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 8px",
};

const infoText = {
  color: "#047857",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "4px 0",
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

const linkContainer = {
  textAlign: "center" as const,
  margin: "16px 0",
};

const link = {
  color: "#F97316",
  textDecoration: "underline",
  fontSize: "14px",
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
