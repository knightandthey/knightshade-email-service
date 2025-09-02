import { render } from "@react-email/render";
import { WelcomeEmail, type WelcomeEmailVariables } from "./WelcomeEmail";
import { ResetPasswordEmail, type ResetPasswordEmailVariables } from "./ResetPasswordEmail";

export type TemplateDescriptor = {
  id: string;
  name: string;
  description?: string;
  variables: Record<string, string>;
  render: (variables: Record<string, unknown>) => string;
};

function renderWelcome(vars: Record<string, unknown>): string {
  const v = vars as unknown as WelcomeEmailVariables;
  return render(<WelcomeEmail {...v} />);
}

function renderReset(vars: Record<string, unknown>): string {
  const v = vars as unknown as ResetPasswordEmailVariables;
  return render(<ResetPasswordEmail {...v} />);
}

export const templates: TemplateDescriptor[] = [
  {
    id: "welcome",
    name: "Welcome Email",
    description: "Friendly welcome message for new users",
    variables: {
      recipientName: "John Doe",
      productName: "Knightshade",
    },
    render: renderWelcome,
  },
  {
    id: "reset-password",
    name: "Reset Password",
    description: "Password reset with CTA button",
    variables: {
      recipientName: "John Doe",
      resetUrl: "https://example.com/reset?token=...",
    },
    render: renderReset,
  },
];

export function getTemplateById(id: string): TemplateDescriptor | undefined {
  return templates.find((t) => t.id === id);
}


