package com.example.notetaker.controller;

import com.example.notetaker.model.Task;
import com.example.notetaker.model.User;
import com.example.notetaker.repository.TaskRepository;
import com.example.notetaker.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tasks")
@CrossOrigin(origins = "http://localhost:5173")
public class TaskController {

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Task>> getTasksByUser(@PathVariable Long userId) {
        List<Task> tasks = taskRepository.findByUserIdOrderByIdDesc(userId);
        return ResponseEntity.ok(tasks);
    }

    @PostMapping("/user/{userId}")
    public ResponseEntity<Task> createTask(@PathVariable Long userId, @RequestBody Task taskRequest) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        taskRequest.setUser(user);

        if (taskRequest.getPriority() == null) taskRequest.setPriority("medium");
        if (taskRequest.getWorkspace() == null) taskRequest.setWorkspace("Personal");

        Task savedTask = taskRepository.save(taskRequest);
        return ResponseEntity.ok(savedTask);
    }

    @PutMapping("/{taskId}/toggle")
    public ResponseEntity<Task> toggleTaskStatus(@PathVariable Long taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found with id: " + taskId));

        task.setCompleted(!task.isCompleted());
        Task updatedTask = taskRepository.save(task);
        return ResponseEntity.ok(updatedTask);
    }

    @DeleteMapping("/{taskId}")
    public ResponseEntity<Void> deleteTask(@PathVariable Long taskId) {
        taskRepository.deleteById(taskId);
        return ResponseEntity.noContent().build();
    }
}