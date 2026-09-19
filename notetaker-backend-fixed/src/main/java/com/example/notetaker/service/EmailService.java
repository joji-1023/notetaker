package com.example.notetaker.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
public class EmailService {

    @Value("${resend.api.key}")
    private String resendApiKey;

    private final RestTemplate restTemplate = new RestTemplate();

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
        String url = "https://api.resend.com/emails";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(resendApiKey);

        Map<String, Object> body = Map.of(
                "from", "onboarding@resend.dev",
                "to", toEmail,
                "subject", subject,
                "html", html
        );

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
            System.out.println("Email sent successfully via Resend: " + response.getBody());
        } catch (Exception e) {
            System.err.println("Failed to send email via Resend API: " + e.getMessage());
            throw new RuntimeException("Failed to send email: " + e.getMessage());
        }
    }
}