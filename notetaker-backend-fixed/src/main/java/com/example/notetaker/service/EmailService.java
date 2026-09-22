package com.example.notetaker.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendOtpEmail(String toEmail, String otp) {
        send(toEmail, "Your OTP Code",
                "<p>Your OTP code is: <strong>" + otp + "</strong></p><p>This code expires in 10 minutes.</p>");
    }

    public void sendPasswordResetEmail(String toEmail, String code) {
        send(toEmail, "Reset Your Password",
                "<p>Your password reset code is: <strong>" + code + "</strong></p>" +
                "<p>This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>");
    }

    private void send(String toEmail, String subject, String html) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(html, true); // true = HTML content

            mailSender.send(message);
            System.out.println("Email sent successfully via Gmail SMTP to: " + toEmail);
        } catch (Exception e) {
            System.err.println("Failed to send email via Gmail SMTP: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to send email: " + e.getMessage());
        }
    }
}
