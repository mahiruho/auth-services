const admin = require("../config/firebase");
const logger = require("../config/logger");
const { sendEmail } = require("./emailService");
exports.sendEmailVerification = async (email) => {
    try {
        const userRecord = await admin.auth().getUserByEmail(email);
        if (!userRecord) {
        return { error: "User not found" };
        }
        const actionCodeSettings = {
          url: `https://mahiruho.com/email-verified`,
          // url: `${process.env.FRONTEND_URL}/email-verified`,
          handleCodeInApp: true,
          linkDomain: "mahiruho.com",
        };
        const verificationLink = await admin.auth().generateEmailVerificationLink(
        email,
        actionCodeSettings
        );
        const emailSent = await sendEmail(
        "gaurav.singh@mahiruho.com, gauravsingh.8026@gmail.com",
        // email,
        "Verify Your Email - ThinkMirAI",
        `<p>Hello ${userRecord.displayName},</p>
        <p>Thank you for registering! Please verify your email by clicking the link below:</p>
        <a href="${verificationLink}">${verificationLink}</a>
        <p>If you didn’t request this, please ignore this email.</p>`
        );
        if (!emailSent) {
        return {success: false,
          message: "Email verification failed. Please try again.",
        };
        }
        return {success: true, message: "Verification email sent successfully" };
    } catch (error) {
        logger.error(`Error sending verification email: ${error.message}`);
        return {success: false, message: "Internal Server Error" };
    }

  
};