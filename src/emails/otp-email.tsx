import * as React from 'react';
import { Html, Head, Preview, Body, Container, Heading, Text, Section, Hr } from '@react-email/components';

interface OtpEmailProps {
  otp: string;
}

export const OtpEmail: React.FC<Readonly<OtpEmailProps>> = ({ otp }) => (
  <Html>
    <Head />
    <Preview>Your NoteSwift Admin OTP Code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>Your One-Time Password</Heading>
        <Section>
          <Text style={paragraph}>Hi there,</Text>
          <Text style={paragraph}>
            Your one-time password to log in to the NoteSwift Admin dashboard is:
          </Text>
          <Text style={otpText}>{otp}</Text>
          <Text style={paragraph}>
            This code will expire in 10 minutes. If you did not request this code, you can safely ignore this email.
          </Text>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>Codelits Studio Pvt. Ltd.®</Text>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  border: '1px solid #f0f0f0',
  borderRadius: '4px',
};

const heading = {
  color: '#000',
  fontSize: '24px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  margin: '30px 0',
};

const paragraph = {
  color: '#444',
  fontSize: '15px',
  lineHeight: '24px',
  textAlign: 'left' as const,
  padding: '0 40px',
};

const otpText = {
  fontSize: '32px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  letterSpacing: '4px',
  margin: '20px 0',
  color: '#000',
};

const hr = {
  borderColor: '#f0f0f0',
  margin: '20px 0',
};

const footer = {
  color: '#999',
  fontSize: '12px',
  textAlign: 'center' as const,
};
