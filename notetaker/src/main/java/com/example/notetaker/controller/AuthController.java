package com.example.notetaker.controller;

import com.example.notetaker.model.User;
import com.example.notetaker.repository.UserRepository;
import com.example.notetaker.security.JwtUtil;
import com.example.notetaker.service.EmailService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil, EmailService emailService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.emailService = emailService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User userRequest) {
        if (userRepository.findByEmail(userRequest.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email already registered"));
        }

        String otp = String.format("%06d", new Random().nextInt(999999));
        User user = new User(userRequest.getUsername(), userRequest.getEmail(), passwordEncoder.encode(userRequest.getPassword()));
        user.setOtpCode(otp);
        user.setOtpExpiry(LocalDateTime.now().plusMinutes(10));
        user.setVerified(false);

        userRepository.save(user);
        emailService.sendOtpEmail(user.getEmail(), otp);

        return ResponseEntity.ok(Map.of("message", "OTP sent to email", "email", user.getEmail()));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String otp = request.get("otp");

        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("message", "User not found"));

        User user = userOpt.get();
        if (user.getOtpExpiry() == null || user.getOtpExpiry().isBefore(LocalDateTime.now())) {
            return ResponseEntity.badRequest().body(Map.of("message", "OTP has expired. Please request a new one."));
        }

        if (!user.getOtpCode().equals(otp)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid OTP code"));
        }

        user.setVerified(true);
        user.setOtpCode(null);
        user.setOtpExpiry(null);
        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getUsername());
        return ResponseEntity.ok(Map.of("message", "Account verified successfully", "token", token, "userId", user.getId()));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        Optional<User> userOpt = userRepository.findByEmail(email);

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            String resetToken = UUID.randomUUID().toString();
            user.setResetToken(resetToken);
            user.setResetTokenExpiry(LocalDateTime.now().plusMinutes(15));
            userRepository.save(user);

            emailService.sendResetPasswordEmail(user.getEmail(), resetToken);
        }

        return ResponseEntity.ok(Map.of("message", "If an account exists for this email, a reset link has been sent."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        String token = request.get("token");
        String newPassword = request.get("newPassword");

        Optional<User> userOpt = userRepository.findByResetToken(token);
        if (userOpt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("message", "Invalid reset token"));

        User user = userOpt.get();
        if (user.getResetTokenExpiry().isBefore(LocalDateTime.now())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Reset token has expired"));
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Password reset successfully. You can now log in."));
    }
}