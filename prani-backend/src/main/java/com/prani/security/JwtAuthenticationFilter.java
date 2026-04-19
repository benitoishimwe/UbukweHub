package com.prani.security;

import com.prani.entity.User;
import com.prani.entity.UserSession;
import com.prani.repository.UserRepository;
import com.prani.repository.UserSessionRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final UserSessionRepository userSessionRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String token = extractToken(request);

        if (StringUtils.hasText(token)) {
            // Try JWT first (covers email/password and TOTP logins)
            boolean authenticated = tryJwtAuth(token);

            // Fallback: session token cookie (covers Google OAuth)
            if (!authenticated) {
                trySessionAuth(token);
            }
        }

        filterChain.doFilter(request, response);
    }

    private boolean tryJwtAuth(String token) {
        try {
            Claims claims = jwtService.validateAndExtract(token);
            String userId = jwtService.extractUserId(claims);
            String role = jwtService.extractRole(claims);
            String email = jwtService.extractEmail(claims);

            PraniAuthPrincipal principal = new PraniAuthPrincipal(userId, email, role);
            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                principal, null, List.of(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()))
            );
            SecurityContextHolder.getContext().setAuthentication(auth);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            log.debug("JWT validation failed, trying session token: {}", e.getMessage());
            return false;
        }
    }

    private boolean trySessionAuth(String token) {
        try {
            Optional<UserSession> sessionOpt = userSessionRepository.findBySessionToken(token);
            if (sessionOpt.isEmpty()) return false;

            UserSession session = sessionOpt.get();
            if (session.getExpiresAt().isBefore(OffsetDateTime.now())) {
                log.debug("Session token expired");
                return false;
            }

            Optional<User> userOpt = userRepository.findById(session.getUserId());
            if (userOpt.isEmpty()) return false;

            User user = userOpt.get();
            if (!user.getIsActive()) return false;

            PraniAuthPrincipal principal = new PraniAuthPrincipal(
                user.getUserId(), user.getEmail(), user.getRole()
            );
            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                principal, null,
                List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().toUpperCase()))
            );
            SecurityContextHolder.getContext().setAuthentication(auth);
            return true;
        } catch (Exception e) {
            log.debug("Session token auth failed: {}", e.getMessage());
            return false;
        }
    }

    private String extractToken(HttpServletRequest request) {
        // Check Authorization: Bearer header first
        String authHeader = request.getHeader("Authorization");
        if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }

        // Check session_token cookie (Google OAuth)
        if (request.getCookies() != null) {
            return Arrays.stream(request.getCookies())
                .filter(c -> "session_token".equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
        }

        return null;
    }
}
