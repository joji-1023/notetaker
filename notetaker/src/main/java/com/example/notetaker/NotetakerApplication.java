package com.example.notetaker;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class NotetakerApplication {
	public static void main(String[] args) {
		SpringApplication.run(NotetakerApplication.class, args);
	}
}