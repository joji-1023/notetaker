package com.example.notetaker.service;

import com.example.notetaker.model.User;
import com.example.notetaker.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Random;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, EmailService emailService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }

    public String registerUser(User userRequest) {
        Optional<User> existingUser = userRepository.findByEmail(userRequest.getEmail());

        if (existingUser.isPresent()) {
            User user = existingUser.get();

            // Block registration if account is already verified
            if (user.isVerified()) {
                throw new RuntimeException("Email already registered");
            }

            // Unverified user attempting registration again: update details & resend OTP
            user.setUsername(userRequest.getUsername());
            user.setPassword(passwordEncoder.encode(userRequest.getPassword()));

            String newOtp = generateOtp();
            user.setOtpCode(newOtp);
            user.setOtpExpiry(LocalDateTime.now().plusMinutes(10));

            userRepository.save(user);

            emailService.sendOtpEmail(user.getEmail(), newOtp);
            return "OTP resent to your email.";
        }

        // Fresh account registration
        User newUser = new User();
        newUser.setUsername(userRequest.getUsername());
        newUser.setEmail(userRequest.getEmail());
        newUser.setPassword(passwordEncoder.encode(userRequest.getPassword()));
        newUser.setVerified(false);

        String otp = generateOtp();
        newUser.setOtpCode(otp);
        newUser.setOtpExpiry(LocalDateTime.now().plusMinutes(10));

        userRepository.save(newUser);

        emailService.sendOtpEmail(newUser.getEmail(), otp);
        return "Registration successful. Please verify OTP.";
    }

    private String generateOtp() {
        Random random = new Random();
        int otp = 100000 + random.nextInt(900000);
        return String.valueOf(otp);
    }
}