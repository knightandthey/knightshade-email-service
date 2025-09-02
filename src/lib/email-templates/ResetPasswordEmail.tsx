import {
  Html,
  Head,
  Preview,
  Tailwind,
  Body,
  Container,
  Text,
  Heading,
  Section,
  Button,
} from "@react-email/components";

type ResetPasswordEmailProps = {
  recipientName: string;
  resetUrl: string;
};

export function ResetPasswordEmail({ recipientName, resetUrl }: ResetPasswordEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Password reset requested</Preview>
      <Tailwind>
        <Body className="bg-white text-black">
          <Container className="p-8">
            <Section className="mb-6">
              <Heading as="h1" className="text-2xl font-bold">
                Reset your password
              </Heading>
              <Text>Hi {recipientName},</Text>
              <Text>
                We received a request to reset your password. Click the button below to
                proceed.
              </Text>
            </Section>
            <Section>
              <Button
                className="bg-black text-white px-4 py-2 rounded"
                href={resetUrl}
              >
                Reset password
              </Button>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export type ResetPasswordEmailVariables = {
  recipientName: string;
  resetUrl: string;
};


