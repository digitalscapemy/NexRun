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

interface RegistrationConfirmedEmailProps {
  participantName: string;
  eventTitle: string;
  eventDate: string;
  eventVenue: string;
  registeredParticipants: Array<{
    name: string;
    category: string;
    registrationCode: string;
  }>;
  totalPaidSen: number;
  repcDate?: string;
  repcLocation?: string;
  ticketsUrl: string;
}

export const RegistrationConfirmedEmail = ({
  participantName = "Runner",
  eventTitle = "KL Marathon 2026",
  eventDate = "15 March 2026",
  eventVenue = "Dataran Merdeka, Kuala Lumpur",
  registeredParticipants = [
    { name: "John Doe", category: "10KM", registrationCode: "ABC123" },
  ],
  totalPaidSen = 5000,
  repcDate,
  repcLocation,
  ticketsUrl = "https://nexrun.my/dashboard/registrations",
}: RegistrationConfirmedEmailProps) => {
  const totalPaid = (totalPaidSen / 100).toFixed(2);

  return (
    <Html>
      <Head />
      <Preview>Your registration for {eventTitle} is confirmed</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Registration Confirmed</Heading>
          <Text style={text}>Hi {participantName},</Text>
          <Text style={text}>
            Your registration for <strong>{eventTitle}</strong> is confirmed. See you at the starting line!
          </Text>

          <Section style={infoBox}>
            <Text style={infoLabel}>Event Details</Text>
            <Text style={infoText}>
              <strong>{eventTitle}</strong>
            </Text>
            <Text style={infoText}>📅 {eventDate}</Text>
            <Text style={infoText}>📍 {eventVenue}</Text>
          </Section>

          <Section style={participantsBox}>
            <Text style={infoLabel}>Registered Participants</Text>
            {registeredParticipants.map((p, idx) => (
              <div key={idx} style={participantRow}>
                <Text style={participantNameStyle}>{p.name}</Text>
                <Text style={participantCategory}>{p.category}</Text>
                <Text style={participantCode}>Code: {p.registrationCode}</Text>
              </div>
            ))}
          </Section>

          <Section style={amountBox}>
            <Text style={amountLabel}>Total Paid</Text>
            <Text style={amountValue}>RM {totalPaid}</Text>
          </Section>

          {repcDate && repcLocation && (
            <Section style={repcBox}>
              <Text style={repcLabel}>Race Pack Collection</Text>
              <Text style={infoText}>📦 {repcDate}</Text>
              <Text style={infoText}>📍 {repcLocation}</Text>
            </Section>
          )}

          <Section style={buttonContainer}>
            <Button style={button} href={ticketsUrl}>
              View My Tickets
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

export default RegistrationConfirmedEmail;

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
  backgroundColor: "#FEF3C7",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
};

const infoLabel = {
  color: "#92400E",
  fontSize: "12px",
  fontWeight: "700",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 8px",
};

const infoText = {
  color: "#78350F",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "4px 0",
};

const participantsBox = {
  backgroundColor: "#F3F4F6",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
};

const participantRow = {
  borderBottom: "1px solid #E5E7EB",
  paddingBottom: "12px",
  marginBottom: "12px",
};

const participantNameStyle = {
  color: "#1F2937",
  fontSize: "16px",
  fontWeight: "600",
  margin: "0 0 4px",
};

const participantCategory = {
  color: "#6B7280",
  fontSize: "14px",
  margin: "0 0 4px",
};

const participantCode = {
  color: "#9CA3AF",
  fontSize: "12px",
  fontFamily: "monospace",
  margin: "0",
};

const amountBox = {
  backgroundColor: "#ECFDF5",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
  textAlign: "center" as const,
};

const amountLabel = {
  color: "#065F46",
  fontSize: "12px",
  fontWeight: "700",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 8px",
};

const amountValue = {
  color: "#047857",
  fontSize: "32px",
  fontWeight: "700",
  margin: "0",
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
