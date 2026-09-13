package com.example.notetaker.controller;

import com.example.notetaker.model.Note;
import com.example.notetaker.service.NoteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notes")
@CrossOrigin(origins = "*")
public class NoteController {

    @Autowired
    private NoteService noteService;

    @PostMapping("/user/{userId}")
    public ResponseEntity<Note> createNote(@PathVariable Long userId, @RequestBody Note note) {
        return ResponseEntity.ok(noteService.createNote(userId, note));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Note>> getUserNotes(@PathVariable Long userId) {
        return ResponseEntity.ok(noteService.getNotesByUserId(userId));
    }

    @PutMapping("/{noteId}/user/{userId}")
    public ResponseEntity<Note> updateNote(@PathVariable Long noteId, @PathVariable Long userId, @RequestBody Note note) {
        return ResponseEntity.ok(noteService.updateNote(noteId, userId, note));
    }

    @DeleteMapping("/{noteId}/user/{userId}")
    public ResponseEntity<String> deleteNote(@PathVariable Long noteId, @PathVariable Long userId) {
        noteService.deleteNote(noteId, userId);
        return ResponseEntity.ok("Note deleted successfully");
    }
}