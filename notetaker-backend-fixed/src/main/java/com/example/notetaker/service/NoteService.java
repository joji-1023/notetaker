package com.example.notetaker.service;

import com.example.notetaker.model.Note;
import com.example.notetaker.model.User;
import com.example.notetaker.repository.NoteRepository;
import com.example.notetaker.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class NoteService {

    @Autowired
    private NoteRepository noteRepository;

    @Autowired
    private UserRepository userRepository;

    public Note createNote(Long userId, Note note) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        note.setUser(user);
        return noteRepository.save(note);
    }

    public List<Note> getNotesByUserId(Long userId) {
        return noteRepository.findByUserId(userId);
    }

    public Note updateNote(Long noteId, Long userId, Note noteDetails) {
        Note note = noteRepository.findByIdAndUserId(noteId, userId)
                .orElseThrow(() -> new RuntimeException("Note not found or unauthorized"));

        note.setTitle(noteDetails.getTitle());
        note.setContent(noteDetails.getContent());
        note.setFontFamily(noteDetails.getFontFamily());
        note.setFontSize(noteDetails.getFontSize());
        note.setIsPinned(noteDetails.getIsPinned());
        if (noteDetails.getColor() != null) note.setColor(noteDetails.getColor());

        return noteRepository.save(note);
    }

    public void deleteNote(Long noteId, Long userId) {
        Note note = noteRepository.findByIdAndUserId(noteId, userId)
                .orElseThrow(() -> new RuntimeException("Note not found or unauthorized"));
        noteRepository.delete(note);
    }
}