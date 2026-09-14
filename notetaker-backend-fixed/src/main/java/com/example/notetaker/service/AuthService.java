package com.example.notetaker.service;

import com.example.notetaker.model.User;
import com.example.notetaker.repository.UserRepository;
import com.example.notetaker.security.JwtUtil;
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
    private final JwtUtil jwtUtil;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       EmailService emailService,
                       JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.jwtUtil = jwtUtil;
    }

    public String registerUser(User userRequest) {
        Optional<User> existingUser = userRepository.findByEmail(userRequest.getEmail());

        if (existingUser.isPresent()) {
            User user = existingUser.get();

            if (user.isVerified()) {
                throw new RuntimeException("Email already registered");
            }

            user.setUsername(userRequest.getUsername());
            user.setPassword(passwordEncoder.encode(userRequest.getPassword()));

            String newOtp = generateOtp();
            user.setOtpCode(newOtp);
            user.setOtpExpiry(LocalDateTime.now().plusMinutes(10));

            userRepository.save(user);

            emailService.sendOtpEmail(user.getEmail(), newOtp);
            return "OTP resent to your email.";
        }

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

    public java.util.Map<String, Object> loginUser(String email, String password) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("Invalid email or password");
        }

        if (!user.isVerified()) {
            throw new RuntimeException("Please verify your email before logging in");
        }

        String token = jwtUtil.generateToken(user.getEmail());

        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("token", token);
        result.put("userId", user.getId());
        return result;
    }

    public java.util.Map<String, Object> verifyOtpAndGenerateToken(String email, String otp) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Debug prints to inspect whitespace or mismatches in Render logs
        System.out.println("--- OTP VERIFICATION DEBUG ---");
        System.out.println("Stored OTP in DB: [" + user.getOtpCode() + "]");
        System.out.println("Entered OTP from UI: [" + (otp != null ? otp.trim() : "null") + "]");
        System.out.println("Expiry Time: " + user.getOtpExpiry() + " | Current Time: " + LocalDateTime.now());

        String cleanedEnteredOtp = otp != null ? otp.trim() : "";
        String storedOtp = user.getOtpCode() != null ? user.getOtpCode().trim() : "";

        if (storedOtp.isEmpty() || !storedOtp.equals(cleanedEnteredOtp)) {
            throw new RuntimeException("Invalid OTP");
        }

        if (user.getOtpExpiry() == null || user.getOtpExpiry().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("OTP has expired");
        }

        user.setVerified(true);
        user.setOtpCode(null);
        user.setOtpExpiry(null);
        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getEmail());

        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("token", token);
        result.put("userId", user.getId());
        return result;
    }

    private String generateOtp() {
        Random random = new Random();
        int otp = 100000 + random.nextInt(900000);
        return String.valueOf(otp);
    }
}