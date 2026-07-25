package com.stylebook.service;

import com.stylebook.dto.PostDTO;
import com.stylebook.entity.*;
import com.stylebook.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PostService {

    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final ShopRepository shopRepository;
    private final LikeRepository likeRepository;
    private final CommentRepository commentRepository;

    @Transactional
    public PostDTO.PostResponse createPost(UUID ownerId, PostDTO.CreatePostRequest request) {
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Shop shop = shopRepository.findByOwnerAndIsActiveTrue(owner)
                .orElseThrow(() -> new RuntimeException("Shop not found"));

        long postCount = postRepository.countByShop(shop);
        if (shop.getPlan() == Shop.SubscriptionPlan.FREE && postCount >= 5) {
            throw new RuntimeException("Free plan allows maximum 5 posts. Upgrade to Pro for unlimited posts.");
        }

        Post post = Post.builder()
                .shop(shop)
                .imageUrl(request.getImageUrl())
                .caption(request.getCaption())
                .likeCount(0)
                .build();

        postRepository.save(post);
        post = postRepository.findById(post.getId()).orElse(post);
        return PostDTO.PostResponse.from(post);
    }

    public List<PostDTO.PostResponse> getFeed(UUID currentUserId) {
        List<Post> posts = postRepository.findAllOrderByCreatedAtDesc();
        return posts.stream()
                .map(post -> mapToResponse(post, currentUserId))
                .collect(Collectors.toList());
    }

    public List<PostDTO.PostResponse> getShopPosts(UUID shopId, UUID currentUserId) {
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new RuntimeException("Shop not found"));
        return postRepository.findByShopOrderByCreatedAtDesc(shop)
                .stream()
                .map(post -> mapToResponse(post, currentUserId))
                .collect(Collectors.toList());
    }

    public List<PostDTO.PostResponse> getTrendingPosts(UUID currentUserId) {
        return postRepository.findTrendingPosts()
                .stream()
                .map(post -> mapToResponse(post, currentUserId))
                .collect(Collectors.toList());
    }

    @Transactional
    public PostDTO.PostResponse toggleLike(UUID userId, UUID postId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));

        if (likeRepository.existsByPostAndUser(post, user)) {
            likeRepository.deleteByPostAndUser(post, user);
            post.setLikeCount(Math.max(0, post.getLikeCount() - 1));
        } else {
            Like like = Like.builder()
                    .post(post)
                    .user(user)
                    .build();
            likeRepository.save(like);
            post.setLikeCount(post.getLikeCount() + 1);
        }

        postRepository.save(post);
        return mapToResponse(post, userId);
    }

    @Transactional
    public PostDTO.CommentResponse addComment(UUID userId, UUID postId,
                                               PostDTO.CommentRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));

        Comment comment = Comment.builder()
                .post(post)
                .user(user)
                .content(request.getContent())
                .build();

        commentRepository.save(comment);
        return PostDTO.CommentResponse.from(comment);
    }

    public List<PostDTO.CommentResponse> getComments(UUID postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));
        return commentRepository.findByPostOrderByCreatedAtAsc(post)
                .stream()
                .map(PostDTO.CommentResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deletePost(UUID ownerId, UUID postId) {
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));

        if (!post.getShop().getOwner().getId().equals(ownerId)) {
            throw new RuntimeException("Unauthorized");
        }

        postRepository.delete(post);
    }

    private PostDTO.PostResponse mapToResponse(Post post, UUID currentUserId) {
        PostDTO.PostResponse response = PostDTO.PostResponse.from(post);

        if (currentUserId != null) {
            User currentUser = userRepository.findById(currentUserId).orElse(null);
            if (currentUser != null) {
                response.setLikedByMe(likeRepository.existsByPostAndUser(post, currentUser));
            }
        }

        List<PostDTO.CommentResponse> recentComments = commentRepository
                .findByPostOrderByCreatedAtAsc(post)
                .stream()
                .limit(2)
                .map(PostDTO.CommentResponse::from)
                .collect(Collectors.toList());
        response.setRecentComments(recentComments);

        return response;
    }
}