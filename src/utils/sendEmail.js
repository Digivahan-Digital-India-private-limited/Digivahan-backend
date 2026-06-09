require("isomorphic-fetch");
const { Client } = require("@microsoft/microsoft-graph-client");
const { ClientSecretCredential } = require("@azure/identity");

// Initialize Microsoft Graph client
let client;
try {
  const credential = new ClientSecretCredential(
    process.env.TENANT_ID,
    process.env.MS_GRAPH_CLIENT_ID,
    process.env.MS_GRAPH_CLIENT_SECRET
  );

  client = Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => {
        const token = await credential.getToken("https://graph.microsoft.com/.default");
        return token.token;
      },
    },
  });
} catch (error) {
  console.error("Error initializing Microsoft Graph Client:", error);
}

/**
 * Sends an email using Microsoft Graph API
 * @param {Object} mailOptions 
 * @param {string} mailOptions.to
 * @param {string} mailOptions.subject
 * @param {string} mailOptions.html
 * @param {Array} [mailOptions.attachments] - Array of { filename, content (buffer) }
 */
const sendGraphEmail = async (mailOptions) => {
  if (!client) {
    throw new Error("Microsoft Graph client is not initialized.");
  }

  const message = {
    subject: mailOptions.subject,
    body: {
      contentType: "HTML",
      content: mailOptions.html,
    },
    toRecipients: [
      {
        emailAddress: {
          address: mailOptions.to,
        },
      },
    ],
  };

  if (mailOptions.attachments && mailOptions.attachments.length > 0) {
    message.attachments = mailOptions.attachments.map(att => ({
      "@odata.type": "#microsoft.graph.fileAttachment",
      name: att.filename,
      contentBytes: att.content.toString("base64"),
    }));
  }

  const mailbox = process.env.MAILBOX || "noreply@digivahan.in";
  
  console.log(`[Email Service] Sending email via Graph API using mailbox: ${mailbox} to: ${mailOptions.to}`);
  
  await client.api(`/users/${mailbox}/sendMail`).post({
    message: message,
    saveToSentItems: "true"
  });

  return { messageId: "graph-api-sent" };
};

const getMailOptions = (templateType, email, otp) => {
  switch (templateType) {
    case "signup":
      return {
        from: `"Hasan" <${process.env.FROM_EMAIL}>`,
        to: email,
        subject: "Registration - Verify Your Account",
        html: `
              <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 30px auto; padding: 30px; border-radius: 12px; background: linear-gradient(145deg, #ffffff, #f0f0f0); box-shadow: 0 4px 12px rgba(0,0,0,0.1); border: 1px solid #e0e0e0;">
                <div style="text-align: center; margin-bottom: 20px;">
                  <h2 style="color: #4CAF50; margin-bottom: 5px;">🔐 Verify Your Account</h2>
                  <p style="color: #666; font-size: 15px;">Secure your account with this verification code</p>
                </div>
  
                <p style="font-size: 16px; color: #333;">Hi <strong>${email}</strong>,</p>
                <p style="font-size: 15px; color: #555; line-height: 1.6;">
                  Thanks for joining us! Use the code below to verify your account and get started:
                </p>
  
                <div style="text-align: center; margin: 30px 0;">
                  <div style="display: inline-block; background: #4CAF50; color: white; font-size: 26px; letter-spacing: 8px; padding: 15px 30px; border-radius: 10px; font-weight: bold; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                    ${otp}
                  </div>
                </div>
  
                <p style="font-size: 14px; color: #888;">This code will expire in 10 minutes.</p>
                <p style="font-size: 14px; color: #888;">If you didn’t request this code, you can safely ignore this email.</p>
  
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;" />
  
                <div style="text-align: center; font-size: 12px; color: #aaa;">
                  &copy; ${new Date().getFullYear()} DigiVahan. All rights reserved.
                </div>
              </div>
          `,
      };
    case "login":
      return {
        from: `"Hasan" <${process.env.FROM_EMAIL}>`,
        to: email,
        subject: "Signin - Verify Your Account",
        html: `
              <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 30px auto; padding: 30px; border-radius: 12px; background: linear-gradient(145deg, #ffffff, #f0f0f0); box-shadow: 0 4px 12px rgba(0,0,0,0.1); border: 1px solid #e0e0e0;">
                <div style="text-align: center; margin-bottom: 20px;">
                  <h2 style="color: #4CAF50; margin-bottom: 5px;">🔐 Verify Your Account</h2>
                  <p style="color: #666; font-size: 15px;">Secure your account with this verification code</p>
                </div>
  
                <p style="font-size: 16px; color: #333;">Hi <strong>${email}</strong>,</p>
                <p style="font-size: 15px; color: #555; line-height: 1.6;">
                  Use the code below to verify your account and get started:
                </p>
  
                <div style="text-align: center; margin: 30px 0;">
                  <div style="display: inline-block; background: #4CAF50; color: white; font-size: 26px; letter-spacing: 8px; padding: 15px 30px; border-radius: 10px; font-weight: bold; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                    ${otp}
                  </div>
                </div>
  
                <p style="font-size: 14px; color: #888;">This code will expire in 10 minutes.</p>
                <p style="font-size: 14px; color: #888;">If you didn’t request this code, you can safely ignore this email.</p>
  
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;" />
  
                <div style="text-align: center; font-size: 12px; color: #aaa;">
                  &copy; ${new Date().getFullYear()} DigiVahan. All rights reserved.
                </div>
              </div>
          `,
      };
    case "reset":
      return {
        from: `"Hasan" <${process.env.FROM_EMAIL}>`,
        to: email,
        subject: "Reset Your Password",
        html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 30px auto; padding: 30px; border-radius: 12px; background: linear-gradient(145deg, #ffffff, #f0f0f0); box-shadow: 0 4px 12px rgba(0,0,0,0.1); border: 1px solid #e0e0e0;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h2 style="color: #4CAF50; margin-bottom: 5px;">🔐 Reset Your Password</h2>
                  <p style="color: #666; font-size: 15px;">Secure your account with this verification code</p>
                </div>
  
                <p style="font-size: 16px; color: #333;">Hi <strong>${email}</strong>,</p>
                <p style="font-size: 15px; color: #555; line-height: 1.6;">
                  Use the code below to reset your password:
                </p>
  
                <div style="text-align: center; margin: 30px 0;">
                  <div style="display: inline-block; background: #4CAF50; color: white; font-size: 26px; letter-spacing: 8px; padding: 15px 30px; border-radius: 10px; font-weight: bold; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                    ${otp}
                  </div>
                </div>
  
                <p style="font-size: 14px; color: #888;">This code will expire in 10 minutes.</p>
                <p style="font-size: 14px; color: #888;">If you didn’t request this code, you can safely ignore this email.</p>
  
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;" />
  
                <div style="text-align: center; font-size: 12px; color: #aaa;">
                  &copy; ${new Date().getFullYear()} DigiVahan. All rights reserved.
                </div>
              </div>
        `,
      };
    case "verify":
      return {
        from: `"Hasan" <${process.env.FROM_EMAIL}>`,
        to: email,
        subject: "Verify Your Contact Information",
        html: `
              <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 30px auto; padding: 30px; border-radius: 12px; background: linear-gradient(145deg, #ffffff, #f0f0f0); box-shadow: 0 4px 12px rgba(0,0,0,0.1); border: 1px solid #e0e0e0;">
                <div style="text-align: center; margin-bottom: 20px;">
                  <h2 style="color: #2196F3; margin-bottom: 5px;">📧 Verify Your Contact</h2>
                  <p style="color: #666; font-size: 15px;">Complete your account verification</p>
                </div>
  
                <p style="font-size: 16px; color: #333;">Hi <strong>${email}</strong>,</p>
                <p style="font-size: 15px; color: #555; line-height: 1.6;">
                  Please use the verification code below to verify your contact information:
                </p>
  
                <div style="text-align: center; margin: 30px 0;">
                  <div style="display: inline-block; background: #2196F3; color: white; font-size: 26px; letter-spacing: 8px; padding: 15px 30px; border-radius: 10px; font-weight: bold; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                    ${otp}
                  </div>
                </div>
  
                <p style="font-size: 14px; color: #888;">This code will expire in 10 minutes.</p>
                <p style="font-size: 14px; color: #888;">If you didn't request this verification, you can safely ignore this email.</p>
  
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;" />
  
                <div style="text-align: center; font-size: 12px; color: #aaa;">
                  &copy; ${new Date().getFullYear()} DigiVahan. All rights reserved.
                </div>
              </div>
        `,
      };
    case "primary":
      return {
        from: `"Hasan" <${process.env.FROM_EMAIL}>`,
        to: email,
        subject: "Set Primary Contact - Verify Your OTP",
        html: `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 30px auto; padding: 30px; border-radius: 12px; background: linear-gradient(145deg, #ffffff, #f3f3f3); box-shadow: 0 4px 12px rgba(0,0,0,0.12); border: 1px solid #e9e9e9;">

      <div style="text-align: center; margin-bottom: 18px;">
        <h2 style="color: #007bff; margin-bottom: 4px;">📌 Verify Your Primary Contact</h2>
        <p style="color: #666; font-size: 15px;">Complete verification to set your primary contact</p>
      </div>

      <p style="font-size: 16px; color: #333;">Hi <strong>${email}</strong>,</p>
      <p style="font-size: 15px; color: #555; line-height: 1.6;">
        We received a request to set this email as your <strong>primary contact</strong>.  
        Please use the OTP below to verify and confirm this update:
      </p>

      <div style="text-align: center; margin: 28px 0;">
        <div style="display: inline-block; background: #007bff; color: white; font-size: 26px; letter-spacing: 8px; padding: 16px 34px; border-radius: 10px; font-weight: bold; box-shadow: 0 4px 10px rgba(0,0,0,0.15);">
          ${otp}
        </div>
      </div>

      <p style="font-size: 14px; color: #888;">This OTP is valid for the next <strong>10 minutes</strong>.</p>
      <p style="font-size: 14px; color: #888;">
        If you didn’t request to update your primary contact, please ignore this email.
      </p>

      <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;" />

      <div style="text-align: center; font-size: 12px; color: #aaa;">
        &copy; ${new Date().getFullYear()} DigiVahan. All rights reserved.
      </div>

    </div>
  `,
      };
    case "account_blocked":
      const blockData = typeof otp === "object" ? otp : { reason: otp, name: "User", phone: "N/A" };
      return {
        from: `"DigiVahan" <${process.env.FROM_EMAIL}>`,
        to: email,
        subject: "Account Blocked - Important Notice",
        html: `
              <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 30px auto; padding: 30px; border-radius: 12px; background: linear-gradient(145deg, #ffffff, #f0f0f0); box-shadow: 0 4px 12px rgba(0,0,0,0.1); border: 1px solid #e0e0e0;">
                <div style="text-align: center; margin-bottom: 20px;">
                  <h2 style="color: #F44336; margin-bottom: 5px;">🚫 Account Blocked</h2>
                  <p style="color: #666; font-size: 15px;">Important notice regarding your account</p>
                </div>
  
                <p style="font-size: 16px; color: #333;">Hi <strong>${blockData.name}</strong>,</p>
                <p style="font-size: 15px; color: #555; line-height: 1.6; margin: 5px 0;">
                  <strong>Mobile Number:</strong> ${blockData.phone}
                </p>
                <p style="font-size: 15px; color: #555; line-height: 1.6; margin: 5px 0;">
                  <strong>Email:</strong> ${email}
                </p>
                <p style="font-size: 15px; color: #555; line-height: 1.6; margin-top: 20px;">
                  Your account has been blocked by the admin.
                </p>
                <p style="font-size: 15px; color: #555; line-height: 1.6;">
                  <strong>Reason:</strong> ${blockData.reason || "Violation of terms"}
                </p>
  
                <p style="font-size: 14px; color: #888; margin-top: 30px;">If you believe this was a mistake, please contact support.</p>
  
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;" />
  
                <div style="text-align: center; font-size: 12px; color: #aaa;">
                  &copy; ${new Date().getFullYear()} DigiVahan. All rights reserved.
                </div>
              </div>
          `,
      };
    default:
      throw new Error("Invalid email type");
  }
};

module.exports = {
  sendGraphEmail,
  getMailOptions,
};
