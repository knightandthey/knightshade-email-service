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
} from "@react-email/components";

type WelcomeEmailProps = {
  recipientName: string;
  productName: string;
};

export function WelcomeEmail({ recipientName, productName }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to {productName}</Preview>
      <Tailwind>
        <Body className="bg-white text-black">
          <Container className="p-8">
            <Section className="mb-6">
              <Heading as="h1" className="text-2xl font-bold">
                Welcome, {recipientName}!
              </Heading>
            </Section>
            <Section>
              <Text className="text-base leading-7">
                We’re thrilled to have you on board with {productName}. This is a sample
                welcome email built with React Email and Tailwind.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export type WelcomeEmailVariables = {
  recipientName: string;
  productName: string;
};


