package com.example.notetaker.service;

import jakarta.mail.messaging.MimeMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendOtpEmail(String toEmail, String otpCode) {
        String body = "<div style='font-family: Arial, sans-serif; padding: 20px; background-color: #0f172a; color: #ffffff; border-radius: 10px;'>" +
                "<h2 style='color: #6366f1;'>Verify Your NoteTaker Account</h2>" +
                "<p>Use the following 6-digit verification code to complete your signup:</p>" +
                "<h1 style='background-color: #1e293b; letter-spacing: 5px; color: #38bdf8; text-align: center; padding: 10px; border-radius: 8px;'>" + otpCode + "</h1>" +
                "<p>This code expires in 10 minutes.</p>" +
                "</div>";
        sendHtmlEmail(toEmail, "NoteTaker OTP Verification Code", body);
    }

    public void sendResetPasswordEmail(String toEmail, String resetToken) {
        String resetLink = "https://notetaker-khaki.vercel.app/reset-password?token=" + resetToken;
        String body = "<div style='font-family: Arial, sans-serif; padding: 20px; background-color: #0f172a; color: #ffffff; border-radius: 10px;'>" +
                "<h2 style='color: #6366f1;'>Reset Your NoteTaker Password</h2>" +
                "<p>Click the button below to reset your password:</p>" +
                "<div style='text-align: center; margin: 25px 0;'>" +
                "<a href='" + resetLink + "' style='padding: 12px 24px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;'>Reset Password</a>" +
                "</div>" +
                "<p>If you did not request a password reset, you can safely ignore this email.</p>" +
                "</div>";
        sendHtmlEmail(toEmail, "NoteTaker Password Reset Request", body);
    }

    private void sendHtmlEmail(String toEmail, String subject, String body) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(body, true);
            mailSender.send(message);
        } catch (Exception e) {
            throw new RuntimeException("Email delivery failed: " + e.getMessage());
        }
    }
}