package com.example.notetaker.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "tasks")
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    private boolean completed;

    private String priority;

    private String workspace;

    private LocalDate dueDate;

    // Not serialized: the client never needs the owning user embedded here,
    // and because this is a lazy Hibernate relation, letting Jackson touch it
    // without this annotation serializes the raw proxy's internal fields
    // (hibernateLazyInitializer/handler) instead of real data -- producing
    // broken JSON ("Could not load tasks: Expected ':' ... path $[0].user").
    // Note.java avoided this with @JsonIgnoreProperties on the class; this
    // does the same job more directly by never touching the proxy at all.
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    public Task() {}

    public Task(String title, boolean completed, String priority, String workspace, LocalDate dueDate, User user) {
        this.title = title;
        this.completed = completed;
        this.priority = priority;
        this.workspace = workspace;
        this.dueDate = dueDate;
        this.user = user;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public boolean isCompleted() { return completed; }
    public void setCompleted(boolean completed) { this.completed = completed; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public String getWorkspace() { return workspace; }
    public void setWorkspace(String workspace) { this.workspace = workspace; }

    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
}