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

interface RaceDayReminderEmailProps {
  participantName: string;
  eventTitle: string;
  eventDate: string;
  startTime: string;
  venue: string;
  venueAddress: string;
  repcDate?: string;
  repcLocation?: string;
  registrationCode: string;
  eTicketUrl: string;
}

export const RaceDayReminderEmail = ({
  participantName = "Runner",
  eventTitle = "KL Marathon 2026",
  eventDate = "15 March 2026",
  startTime = "06:00 AM",
  venue = "Dataran Merdeka",
  venueAddress = "Jalan Raja, Kuala Lumpur, 50050, Malaysia",
  repcDate,
  repcLocation,
  registrationCode = "ABC123",
  eTicketUrl = "https://nexrun.my/verify/registration/ABC123",
}: RaceDayReminderEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Race day tomorrow — {eventTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Race Day Tomorrow!</Heading>
          <Text style={text}>Hi {participantName},</Text>
          <Text style={text}>
            This is your reminder that <strong>{eventTitle}</strong> is happening tomorrow. We&apos;re excited
            to see you at the starting line!
          </Text>

          <Section style={eventBox}>
            <Text style={eventLabel}>Event Details</Text>
            <Text style={eventTitleStyle}>{eventTitle}</Text>
            <Text style={eventDetail}>📅 {eventDate}</Text>
            <Text style={eventDetail}>⏰ Flag-off at {startTime}</Text>
            <Text style={eventDetail}>📍 {venue}</Text>
            <Text style={eventAddress}>{venueAddress}</Text>
          </Section>

          {repcDate && repcLocation && (
            <Section style={repcBox}>
              <Text style={repcLabel}>Race Pack Collection</Text>
              <Text style={repcText}>📦 {repcDate}</Text>
              <Text style={repcText}>📍 {repcLocation}</Text>
              <Text style={repcNote}>
                Remember to collect your race pack before event day if you haven&apos;t already.
              </Text>
            </Section>
          )}

          <Section style={codeBox}>
            <Text style={codeLabel}>Your Registration Code</Text>
            <Text style={codeValue}>{registrationCode}</Text>
            <Text style={codeNote}>Show this at check-in</Text>
          </Section>

          <Section style={buttonContainer}>
            <Button style={button} href={eTicketUrl}>
              View My E-Ticket
            </Button>
          </Section>

          <Text style={text}>
            <strong>Tips for race day:</strong>
            <br />
            • Arrive early to allow time for parking and check-in
            <br />
            • Bring your IC for verification
            <br />
            • Stay hydrated and have a good rest tonight
            <br />• Check the weather forecast and dress accordingly
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

export default RaceDayReminderEmail;

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

const eventBox = {
  backgroundColor: "#FEF3C7",
  borderRadius: "8px",
  padding: "24px",
  margin: "24px 0",
  borderLeft: "4px solid #F59E0B",
};

const eventLabel = {
  color: "#92400E",
  fontSize: "12px",
  fontWeight: "700",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 12px",
};

const eventTitleStyle = {
  color: "#78350F",
  fontSize: "18px",
  fontWeight: "700",
  margin: "0 0 12px",
};

const eventDetail = {
  color: "#78350F",
  fontSize: "15px",
  lineHeight: "22px",
  margin: "6px 0",
};

const eventAddress = {
  color: "#92400E",
  fontSize: "13px",
  lineHeight: "18px",
  margin: "8px 0 0",
  fontStyle: "italic" as const,
};

const repcBox = {
  backgroundColor: "#EDE9FE",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
};

const repcLabel = {
  color: "#5B21B6",
  fontSize: "12px",
  fontWeight: "700",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 8px",
};

const repcText = {
  color: "#6B21A8",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "4px 0",
};

const repcNote = {
  color: "#7C3AED",
  fontSize: "13px",
  lineHeight: "18px",
  margin: "12px 0 0",
  fontStyle: "italic" as const,
};

const codeBox = {
  backgroundColor: "#F3F4F6",
  borderRadius: "8px",
  padding: "24px",
  margin: "24px 0",
  textAlign: "center" as const,
};

const codeLabel = {
  color: "#374151",
  fontSize: "12px",
  fontWeight: "700",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 12px",
};

const codeValue = {
  color: "#1F2937",
  fontSize: "32px",
  fontWeight: "700",
  fontFamily: "monospace",
  margin: "0",
  letterSpacing: "2px",
};

const codeNote = {
  color: "#6B7280",
  fontSize: "12px",
  margin: "8px 0 0",
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
