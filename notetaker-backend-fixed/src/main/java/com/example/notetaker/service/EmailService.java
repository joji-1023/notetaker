package com.example.notetaker.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
public class EmailService {

    @Value("${sendgrid.api.key}")
    private String sendGridApiKey;

    @Value("${sendgrid.from.email}")
    private String fromEmail;

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
        if (sendGridApiKey == null || sendGridApiKey.isBlank()) {
            throw new RuntimeException(
                "SENDGRID_API_KEY is not set on the server. Add it in Render → Environment and redeploy.");
        }
        if (fromEmail == null || fromEmail.isBlank()) {
            throw new RuntimeException(
                "SENDGRID_FROM_EMAIL is not set on the server. Add it in Render → Environment and redeploy.");
        }

        String url = "https://api.sendgrid.com/v3/mail/send";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(sendGridApiKey);

        // SendGrid v3 Mail Send API request body
        Map<String, Object> body = Map.of(
                "personalizations", List.of(
                        Map.of("to", List.of(Map.of("email", toEmail)))
                ),
                "from", Map.of("email", fromEmail, "name", "NoteTaker"),
                "subject", subject,
                "content", List.of(
                        Map.of("type", "text/html", "value", html)
                )
        );

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        try {
            // SendGrid returns 202 Accepted with an empty body on success
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
            System.out.println("Email sent successfully via SendGrid. Status: " + response.getStatusCode());
        } catch (Exception e) {
            System.err.println("Failed to send email via SendGrid API: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to send email: " + e.getMessage());
        }
    }
}
