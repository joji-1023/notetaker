package com.example.notetaker.repository;

import com.example.notetaker.model.Note;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NoteRepository extends JpaRepository<Note, Long> {
    // Critical Data Isolation Query: Fetches notes belonging ONLY to a specific user ID
    List<Note> findByUserId(Long userId);

    // Authorization Check Query: Ensures a user can only query/update their own note by ID
    Optional<Note> findByIdAndUserId(Long id, Long userId);
}