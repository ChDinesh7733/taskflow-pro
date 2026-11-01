package com.taskflow.controller;

import com.taskflow.dto.category.CategoryResponse;
import com.taskflow.dto.category.CreateCategoryRequest;
import com.taskflow.entity.Category;
import com.taskflow.entity.User;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.repository.CategoryRepository;
import com.taskflow.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
@Tag(name = "Categories", description = "Task categories owned by the logged-in user")
@SecurityRequirement(name = "bearerAuth")
public class CategoryController {

    private final CategoryRepository categoryRepository;
    private final UserRepository     userRepository;

    @GetMapping
    @Operation(summary = "List all categories for the logged-in user")
    public List<CategoryResponse> list(@AuthenticationPrincipal UserDetails principal) {
        User user = resolveUser(principal);
        return categoryRepository.findByOwnerId(user.getId())
            .stream()
            .map(c -> new CategoryResponse(c.getId(), c.getName(), c.getColor(), c.getShareToken(), c.getIsPublic() != null ? c.getIsPublic() : false))
            .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a new category for the logged-in user")
    public CategoryResponse create(
            @Valid @RequestBody CreateCategoryRequest req,
            @AuthenticationPrincipal UserDetails principal) {
        User user = resolveUser(principal);
        Category category = Category.builder()
                .name(req.name().trim())
                .color(req.color() != null && !req.color().isBlank() ? req.color() : "#6366f1")
                .owner(user)
                .build();
        Category saved = categoryRepository.save(category);
        return new CategoryResponse(saved.getId(), saved.getName(), saved.getColor(), saved.getShareToken(), saved.getIsPublic() != null ? saved.getIsPublic() : false);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete category by ID")
    public void delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails principal) {
        User user = resolveUser(principal);
        Category cat = categoryRepository.findById(id)
                .filter(c -> c.getOwner().getId().equals(user.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Category", id));
        categoryRepository.delete(cat);
    }

    private User resolveUser(UserDetails principal) {
        return userRepository.findByEmail(principal.getUsername())
            .orElseThrow(() -> new ResourceNotFoundException("User", principal.getUsername()));
    }
}
